"""Tests for company/person search modes (no network calls)."""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database.base import Base
from app.models.evidence import EvidenceCollection
from app.models.lead import Contact
from app.models.pipeline import TimelineEvent
from app.models.search import Search
from app.pipeline.scoring import LeadScore, LeadSignals
from app.providers.base.business_provider import (
    BusinessDiscoveryProvider,
    CandidateLead,
    SearchPlan,
)
from app.providers.base.contact_provider import PersonRecord

# --------------------------------------------------------------------------
# Fakes
# --------------------------------------------------------------------------

class FakePlacesClient:
    def __init__(self, places: list[dict] | None = None):
        self.places = places or []
        self.queries: list[str] = []

    async def text_search(self, query, latitude=None, longitude=None, max_results=20):
        self.queries.append(query)
        return list(self.places)


class FakeProvider(BusinessDiscoveryProvider):
    def __init__(self, results: list[CandidateLead] | None = None):
        self.results = results or []
        self.calls = 0

    async def search(self, plan, latitude=None, longitude=None):
        self.calls += 1
        return list(self.results)

    async def get_details(self, source_id):
        return None


class FakeLLM:
    def __init__(self, plan):
        self.plan = plan

    async def complete_structured(self, **kwargs):
        return self.plan


COMPANY_ROWS = [
    {
        "name": "Tulip HR Solutions",
        "domain": "tuliphr.nl",
        "website": "tuliphr.nl",
        "phone": "+31 20 123 4567",
        "address": "Keizersgracht 1",
        "city": "Amsterdam",
        "state": "North Holland",
        "country": "Netherlands",
        "linkedin_url": "linkedin.com/company/tuliphr",
        "employee_count": "11-50",
    },
    # Duplicate domain with a different name -> must be dropped.
    {
        "name": "Tulip HR (old)",
        "domain": "tuliphr.nl",
        "country": "Netherlands",
    },
    # No footprint -> business_status must NOT be "active".
    {
        "name": "Shadow Staffing",
        "domain": "shadowstaff.io",
        "country": "Netherlands",
    },
]

CONTACT_ROWS = [
    {
        "first_name": "Cor",
        "last_name": "Van Mer",
        "work_email": "***",
        "direct_phone": None,
        "job_title": "HR Manager",
        "linkedin_url": "linkedin.com/in/cor-van-mer",
        "city": "***",
        "state": "North Holland",
        "country": "Netherlands",
        "company_name": "Sesami NL",
        "company_domain": "gunnebo.com",
        "company_employee_count": "1001-5000",
    },
    {
        "first_name": "Julia",
        "last_name": "Frericks",
        "work_email": "julia@kcp.example",
        "direct_phone": None,
        "job_title": "Human Resources Manager",
        "linkedin_url": "linkedin.com/in/julia-frericks",
        "city": "***",
        "state": "North Holland",
        "country": "Netherlands",
        "company_name": "KCP",
        "company_domain": "kcp.example",
        "company_employee_count": "",
    },
    # Same company as the first row, weaker title (not a decision maker)
    # -> must lose the per-company contest.
    {
        "first_name": "Zoe",
        "last_name": "Assistant",
        "work_email": "***",
        "job_title": "HR Coordinator",
        "linkedin_url": "linkedin.com/in/zoe-assistant",
        "state": "North Holland",
        "country": "Netherlands",
        "company_name": "Sesami NL",
        "company_domain": "gunnebo.com",
        "company_employee_count": "1001-5000",
    },
]


# --------------------------------------------------------------------------
# Tests
# --------------------------------------------------------------------------

def test_mode_schema_default():
    print("\n=== Test: request schema mode default + validation ===")
    from app.api.schemas.requests import LeadSearchRequest

    req = LeadSearchRequest(query="florists in Amsterdam", department_id="dep-1")
    assert req.mode == "company", f"default must be company, got {req.mode}"

    req2 = LeadSearchRequest(
        query="HR managers in Amsterdam", department_id="dep-1", mode="person"
    )
    assert req2.mode == "person"

    try:
        LeadSearchRequest(query="q", department_id="d", mode="banana")
        raise AssertionError("invalid mode must be rejected")
    except Exception as e:
        assert "mode" in str(e).lower()
    print("  PASS")
    return True


async def test_places_canonical_query_and_category():
    print("\n=== Test: canonical query prepend + primaryType category ===")
    from app.providers.google_places.provider import GooglePlacesProvider

    provider = GooglePlacesProvider()
    provider.client = FakePlacesClient(
        places=[
            {
                "id": "p1",
                "displayName": {"text": "HR Help Bureau"},
                "types": ["point_of_interest", "establishment"],
                "primaryType": "hr_consultant",
                "businessStatus": "OPERATIONAL",
                "location": {"latitude": 52.3, "longitude": 4.9},
                "websiteUri": "https://hrhelpbureau.nl",
            }
        ]
    )

    plan = SearchPlan(
        primary_source="google_places",
        search_queries=["flower shop Amsterdam"],
        category="recruitment agency",
        location="Amsterdam",
    )
    candidates = await provider.search(plan)

    assert provider.client.queries[0] == "recruitment agency in Amsterdam", provider.client.queries
    assert "flower shop Amsterdam" in provider.client.queries
    assert len(candidates) == 1
    # primaryType hr_consultant -> mapped, boilerplate types ignored.
    assert candidates[0].category == "recruitment agency", candidates[0].category
    assert candidates[0].source == "google_places"

    # No category/location -> existing queries only, nothing invented.
    plan2 = SearchPlan(primary_source="google_places", search_queries=["plumber X"])
    provider.client = FakePlacesClient()
    await provider.search(plan2)
    assert provider.client.queries == ["plumber X"]
    print("  PASS")
    return True


async def test_graph8_company_provider():
    print("\n=== Test: graph8 company fallback mapping + filter chain ===")
    from app.providers.graph8.discovery import Graph8CompanyProvider

    class ChainClient:
        def __init__(self, payloads):
            self.payloads = list(payloads)
            self.calls = []

        async def post(self, path, payload):
            self.calls.append((path, payload["filters"]))
            return self.payloads.pop(0) if self.payloads else None

    provider = Graph8CompanyProvider()
    provider.client = ChainClient([None, None, COMPANY_ROWS])
    plan = SearchPlan(
        primary_source="google_places",
        category="recruitment agency",
        location="Amsterdam",
        candidate_target=50,
    )
    candidates = await provider.search(plan)

    # Chain: name+city, name+state, name+country (country matched).
    assert len(provider.client.calls) == 3, provider.client.calls
    last_filters = provider.client.calls[-1][1]
    assert last_filters[1]["field"] == "country"
    assert last_filters[1]["value"] == ["Amsterdam"]

    # 2 unique companies (duplicate domain dropped).
    assert len(candidates) == 2, [c.name for c in candidates]
    by_name = {c.name: c for c in candidates}
    assert by_name["Tulip HR Solutions"].business_status == "active"
    assert by_name["Shadow Staffing"].business_status == "unknown"
    assert by_name["Tulip HR Solutions"].category == "recruitment agency"
    assert by_name["Tulip HR Solutions"].source == "graph8_companies"
    assert by_name["Tulip HR Solutions"].website == "tuliphr.nl"

    # No category -> no calls at all.
    provider.client = ChainClient([])
    empty_plan = SearchPlan(primary_source="google_places")
    got = await provider.search(empty_plan)
    assert got == [] and provider.client.calls == []
    print("  PASS")
    return True


async def test_graph8_people_provider():
    print("\n=== Test: graph8 people provider (geo chain, dedupe, contact) ===")
    from app.providers.graph8.discovery import Graph8PeopleProvider

    class ChainClient:
        def __init__(self, payloads):
            self.payloads = list(payloads)
            self.calls = []

        async def post(self, path, payload):
            self.calls.append((path, payload["filters"]))
            return self.payloads.pop(0) if self.payloads else None

    provider = Graph8PeopleProvider()
    provider.client = ChainClient([None, CONTACT_ROWS])  # city -> empty, state -> rows
    plan = SearchPlan(
        primary_source="graph8_people",
        secondary_source="google_places",
        job_title="HR Manager",
        location="Amsterdam",
        candidate_target=50,
    )
    candidates = await provider.search(plan)

    # Chain stopped at the second (state) filter.
    assert len(provider.client.calls) == 2, provider.client.calls
    assert provider.client.calls[0][1][1]["field"] == "city"
    assert provider.client.calls[1][1][1]["field"] == "state"

    # One candidate per company.
    assert len(candidates) == 2, [c.name for c in candidates]
    by_company = {c.name: c for c in candidates}

    sesami = by_company["Sesami NL"]
    # Best-ranked person per company (HR Manager beats HR Coordinator).
    assert sesami.contact is not None
    assert sesami.contact.full_name == "Cor Van Mer"
    # Locked fields must not leak into the Contact row.
    assert sesami.contact.email is None
    assert sesami.contact.city is None
    assert sesami.contact.linkedin_url == "https://linkedin.com/in/cor-van-mer"
    assert sesami.category == "HR Manager"
    assert sesami.business_status == "active"
    assert sesami.source == "graph8_people"
    assert sesami.website == "gunnebo.com"

    kcp = by_company["KCP"]
    assert kcp.contact.full_name == "Julia Frericks"
    assert kcp.contact.email == "julia@kcp.example"
    # LinkedIn profile present on the row -> active.
    assert kcp.business_status == "active"

    # No job title -> zero calls (falls back to secondary source).
    provider.client = ChainClient([])
    got = await provider.search(SearchPlan(primary_source="graph8_people"))
    assert got == [] and provider.client.calls == []
    print("  PASS")
    return True


async def test_discovery_fallback():
    print("\n=== Test: discovery fallback rules ===")
    from app.pipeline.discovery import DiscoveryService

    # 1) Places returns 0 -> graph8_companies fires, then secondary runs.
    primary = FakeProvider([])
    g8 = FakeProvider([CandidateLead(name="G8 Co", source="graph8_companies")])
    secondary = FakeProvider([])
    service = DiscoveryService({
        "google_places": primary,
        "graph8_companies": g8,
        "web_search": secondary,
    })
    plan = SearchPlan(
        primary_source="google_places",
        secondary_source="web_search",
        candidate_target=50,
    )
    result = await service.discover(plan)
    assert g8.calls == 1, "graph8 fallback must fire when Places returns 0"
    assert secondary.calls == 1
    assert [c.name for c in result] == ["G8 Co"]

    # 2) Places returns candidates -> graph8 fallback must NOT fire.
    primary2 = FakeProvider([CandidateLead(name="Place", source="google_places")])
    g8_2 = FakeProvider([])
    service2 = DiscoveryService({
        "google_places": primary2,
        "graph8_companies": g8_2,
        "web_search": FakeProvider([]),
    })
    result2 = await service2.discover(plan)
    assert g8_2.calls == 0, "graph8 fallback must not fire when Places has data"
    assert len(result2) == 1

    # 3) Person mode (primary graph8_people) -> graph8_companies never fires.
    people = FakeProvider([])
    g8_3 = FakeProvider([])
    service3 = DiscoveryService({
        "graph8_people": people,
        "graph8_companies": g8_3,
        "google_places": FakeProvider([]),
    })
    plan3 = SearchPlan(
        primary_source="graph8_people", secondary_source="google_places",
        candidate_target=50,
    )
    await service3.discover(plan3)
    assert people.calls == 1
    assert g8_3.calls == 0, "person mode must not run the company fallback"
    print("  PASS")
    return True


async def test_plan_search_mode_forcing():
    print("\n=== Test: plan_search forces sources by mode ===")
    from app.agents.intent_parser import SearchIntent
    from app.core.constants import EntityType, LocationMode
    from app.services.intent_service import IntentService

    intent = SearchIntent(
        entity_type=EntityType.PERSON,
        category="recruitment agency",
        job_title="HR Manager",
        location="Amsterdam",
        location_mode=LocationMode.EXPLICIT,
    )
    llm_plan = SearchPlan(
        primary_source="web_search",
        secondary_source="google_places",
        search_queries=["junk"],
    )
    service = IntentService(FakeLLM(llm_plan))

    company_plan = await service.plan_search(intent, "company")
    person_plan = await service.plan_search(intent, "person")
    default_plan = await service.plan_search(intent)

    assert company_plan.primary_source == "google_places"
    assert default_plan.primary_source == "google_places"
    assert person_plan.primary_source == "graph8_people"
    assert person_plan.secondary_source == "google_places"

    # Structured intent copied onto the plan for the providers.
    for plan in (company_plan, person_plan):
        assert plan.category == "recruitment agency"
        assert plan.location == "Amsterdam"
        assert plan.job_title == "HR Manager"
    print("  PASS")
    return True


def test_selection_carries_contact():
    print("\n=== Test: selection carries the contact through ===")
    from app.pipeline.selection import SelectionService

    candidate = CandidateLead(
        name="Sesami NL",
        source="graph8_people",
        category="HR Manager",
        business_status="active",
        contact=PersonRecord(
            full_name="Cor Van Mer",
            job_title="HR Manager",
            linkedin_url="linkedin.com/in/cor-van-mer",
        ),
    )
    score = LeadScore(
        total_score=55,
        signals=LeadSignals(category_match=True, business_active=True),
        passes_threshold=True,
    )
    result = SelectionService().select_leads(
        scored_candidates=[(candidate, score, EvidenceCollection(), "HR Manager")],
        query="HR managers in Amsterdam",
        requested_max=5,
    )
    assert len(result.leads) == 1
    lead = result.leads[0]
    assert lead.contact is not None
    assert lead.contact.full_name == "Cor Van Mer"
    assert lead.contact.linkedin_url == "linkedin.com/in/cor-van-mer"

    # Person-mode scoring: identical category -> category_match fires (25 pts).
    from app.pipeline.cross_validation import CrossValidationService
    from app.pipeline.scoring import ScoringService

    cv = CrossValidationService()
    cross = cv.validate(
        evidence=EvidenceCollection(),
        candidate_name="Sesami NL",
        candidate_phone=None,
        candidate_address=None,
        candidate_domain="gunnebo.com",
    )
    person_score = ScoringService().score_candidate(
        candidate_name="Sesami NL",
        candidate_category="HR Manager",
        intent_category="HR Manager",
        business_status="active",
        cross_validation=cross,
        evidence=EvidenceCollection(),
        domain="gunnebo.com",
    )
    assert person_score.signals.category_match is True
    assert person_score.total_score >= 45, person_score.total_score
    print(f"  person-mode score: {person_score.total_score} (>= 45 threshold)")
    print("  PASS")
    return True


async def test_pipeline_contact_creation():
    print("\n=== Test: pipeline manager creates Lead + primary Contact ===")
    from app.pipeline.pipeline_manager import PipelineManager
    from app.pipeline.selection import SelectedLead, SelectionResult

    contact = PersonRecord(
        full_name="Cor Van Mer",
        job_title="HR Manager",
        linkedin_url="linkedin.com/in/cor-van-mer",
        email=None,
    )
    selected = SelectedLead(
        business_name="Sesami NL",
        website="gunnebo.com",
        confidence_score=55,
        relevance_reason="HR Manager",
        verification={"business_active": True},
        contact=contact,
    )
    result = SelectionResult(
        query="HR managers in Amsterdam",
        candidates_checked=3,
        qualified_leads_found=1,
        requested_max_leads=5,
        leads=[selected],
    )

    class FakeOrchestrator:
        def __init__(self):
            self.kwargs = None

        async def run(self, **kwargs):
            self.kwargs = kwargs
            return result

    orchestrator = FakeOrchestrator()
    manager = PipelineManager(orchestrator=orchestrator)

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        factory = async_sessionmaker(engine, expire_on_commit=False)

        async with factory() as db:
            search = Search(
                company_id="co-1",
                query="HR managers in Amsterdam",
                max_leads=5,
                status="running",
            )
            db.add(search)
            await db.flush()

            leads = await manager._finish_search(db, search, mode="person")
            assert orchestrator.kwargs["mode"] == "person", "mode must reach orchestrator"
            assert len(leads) == 1
            await db.commit()

        async with factory() as db:
            contacts = (await db.execute(select(Contact))).scalars().all()
            assert len(contacts) == 1, f"expected 1 contact, got {len(contacts)}"
            c = contacts[0]
            assert c.name == "Cor Van Mer"
            assert c.job_title == "HR Manager"
            assert c.linkedin_url == "linkedin.com/in/cor-van-mer"
            assert c.is_primary is True
            assert c.email is None

            events = (await db.execute(select(TimelineEvent))).scalars().all()
            contact_events = [e for e in events if e.event_type == "contact_found"]
            assert len(contact_events) == 1
            assert (contact_events[0].event_metadata or {}).get("source") == "graph8_people"
    finally:
        await engine.dispose()
    print("  PASS")
    return True


def test_search_response_contact_field():
    print("\n=== Test: search response carries person contact ===")
    from app.api.schemas.responses import ContactResponse, LeadResponse, LeadVerification

    verification = LeadVerification(
        business_active=True,
        website_identity_verified=False,
        email_verified=False,
        phone_cross_verified=False,
        location_match=True,
    )
    lead = LeadResponse(
        business_name="Sesami NL",
        confidence_score=55,
        verification=verification,
        contact=ContactResponse(
            id="c1",
            name="Cor Van Mer",
            job_title="HR Manager",
            linkedin_url="https://linkedin.com/in/cor-van-mer",
            is_primary=True,
        ),
    )
    assert lead.contact is not None
    assert lead.contact.linkedin_url.startswith("https://")

    # Company-mode lead: no contact stays None (nullable field).
    plain = LeadResponse(
        business_name="X", confidence_score=80, verification=verification
    )
    assert plain.contact is None
    print("  PASS")
    return True


async def main():
    print("=" * 60)
    print("SEARCH MODES TESTS")
    print("=" * 60)

    results = {}
    import inspect

    for name, fn in [
        ("mode_schema_default", test_mode_schema_default),
        ("search_response_contact", test_search_response_contact_field),
        ("places_canonical_query", test_places_canonical_query_and_category),
        ("graph8_company_provider", test_graph8_company_provider),
        ("graph8_people_provider", test_graph8_people_provider),
        ("discovery_fallback", test_discovery_fallback),
        ("plan_search_mode_forcing", test_plan_search_mode_forcing),
        ("selection_carries_contact", test_selection_carries_contact),
        ("pipeline_contact_creation", test_pipeline_contact_creation),
    ]:
        try:
            out = fn()
            if inspect.isawaitable(out):
                out = await out
            results[name] = out
        except Exception:
            import traceback
            traceback.print_exc()
            results[name] = False

    print("\n" + "=" * 60)
    for name, passed in results.items():
        print(f"  {name}: {'PASS' if passed else 'FAIL'}")
    all_passed = all(results.values())
    print(f"\nOverall: {'ALL PASSED' if all_passed else 'SOME FAILED'}")
    print("=" * 60)
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
