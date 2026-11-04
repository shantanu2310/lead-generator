"""Tests for the Graph8 person/company enrichment service (no network calls)."""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.database.base import Base
from app.models.lead import Contact, Lead
from app.models.pipeline import TimelineEvent
from app.providers.base.contact_provider import (
    CompanyRecord,
    ContactDiscoveryProvider,
    PersonRecord,
)
from app.services.person_enrichment_service import (
    PersonEnrichmentService,
    domain_from_url,
)


class FakeGraph8Provider(ContactDiscoveryProvider):
    def __init__(self, people=None, company=None, email_lookup=None):
        self.people = people or []
        self.company = company
        self.email_lookup = email_lookup
        self.calls = []

    async def search_people_by_company(self, domain=None, company_name=None, limit=25):
        self.calls.append(("people", domain, company_name))
        return list(self.people)

    async def lookup_person_by_email(self, email):
        self.calls.append(("email", email))
        return self.email_lookup

    async def search_company(self, domain=None, name=None):
        self.calls.append(("company", domain, name))
        return self.company

    async def close(self):
        pass


SAMPLE_PEOPLE = [
    PersonRecord(
        first_name="Sam",
        last_name="Stewart",
        full_name="Sam Stewart",
        job_title="Receptionist",
        email="sam@acme.com",
        linkedin_url="https://linkedin.com/in/samstewart",
        confidence=0.9,
    ),
    PersonRecord(
        first_name="Jane",
        last_name="Doe",
        full_name="Jane Doe",
        job_title="Owner",
        email="jane@acme.com",
        linkedin_url="https://linkedin.com/in/janedoe",
        confidence=0.95,
    ),
    PersonRecord(
        first_name="Bob",
        last_name="Ray",
        full_name="Bob Ray",
        job_title="General Manager",
        phone="+1-555-0100",
        linkedin_url="https://linkedin.com/in/bobray",
        confidence=0.8,
    ),
    # Duplicate LinkedIn URL (trailing-slash variant, less data) — must be
    # collapsed into the richer copy before ranking.
    PersonRecord(
        first_name="Jane",
        last_name="Doe",
        full_name="Jane Doe",
        job_title="Owner",
        linkedin_url="https://linkedin.com/in/janedoe/",
        confidence=0.99,
    ),
    # No identifier at all — must be dropped.
    PersonRecord(first_name="Mystery", last_name="Person", full_name="Mystery Person"),
]

SAMPLE_COMPANY = CompanyRecord(
    name="Acme Inc",
    domain="acme.com",
    industry="Plumbing",
    employee_count=42,
    revenue="$1M-$5M",
    country="United States",
    state="Texas",
    city="Austin",
    logo_url="https://logo.clearbit.com/acme.com",
)


def make_lead(**overrides) -> Lead:
    defaults = dict(
        search_id="search-1",
        company_id="company-1",
        business_name="Acme Plumbing",
        normalized_name="acme plumbing",
        website="https://www.acme.com/contact",
        normalized_domain="acme.com",
        email="info@acme.com",
    )
    defaults.update(overrides)
    return Lead(**defaults)


async def _make_db():
    """Create an in-memory DB with all tables. Caller must dispose engine."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return engine, async_sessionmaker(engine, expire_on_commit=False)


async def test_enrichment_flow():
    print("\n=== Test: enrichment creates ranked contacts + fills company ===")
    engine, factory = await _make_db()
    try:
        provider = FakeGraph8Provider(people=SAMPLE_PEOPLE, company=SAMPLE_COMPANY)
        service = PersonEnrichmentService(provider=provider)

        async with factory() as db:
            lead = make_lead(city="Already Austin")  # preset -> must NOT be overwritten
            db.add(lead)
            await db.flush()

            result = await service.enrich_lead(db, lead)

            assert result.matches_found == 3, f"expected 3 unique matches, got {result.matches_found}"
            assert result.contacts_created == 3, f"expected 3 created, got {result.contacts_created}"
            assert result.contacts_skipped == 0, f"expected 0 skipped, got {result.contacts_skipped}"

            # Ranking: decision-makers first (Owner, General Manager), receptionist last.
            names = [c.name for c in result.contacts]
            assert names[0] == "Jane Doe", f"Owner should be first, got {names}"
            assert names[1] == "Bob Ray", f"General Manager should be second, got {names}"
            assert names[2] == "Sam Stewart", f"Receptionist should be last, got {names}"

            # Primary flag on the top contact only.
            primaries = [c for c in result.contacts if c.is_primary]
            assert len(primaries) == 1 and primaries[0].name == "Jane Doe"

            # LinkedIn URLs captured.
            assert all(c.linkedin_url for c in result.contacts)

            # Company fields filled (except preset city).
            assert lead.industry == "Plumbing"
            assert lead.employee_count == 42
            assert lead.revenue == "$1M-$5M"
            assert lead.city == "Already Austin", "preset city must not be overwritten"
            assert "city" not in result.company_fields_filled
            assert set(result.company_fields_filled) == {
                "industry", "employee_count", "revenue", "country", "state", "company_logo_url",
            }

            # Provider was called with the domain first.
            assert provider.calls[0] == ("people", "acme.com", "Acme Plumbing")

            # Timeline event written.
            events = (await db.execute(select(TimelineEvent))).scalars().all()
            assert len(events) == 1 and events[0].event_type == "contact_found"
            assert "graph8" in (events[0].event_metadata or {}).get("source", "")

            await db.commit()

        print(f"  created={result.contacts_created} skipped={result.contacts_skipped} "
              f"company_fields={result.company_fields_filled}")
        print(f"  message: {result.message}")

        # --- Second run: everything already saved -> no duplicates ---
        provider2 = FakeGraph8Provider(people=SAMPLE_PEOPLE, company=SAMPLE_COMPANY)
        service2 = PersonEnrichmentService(provider=provider2)
        async with factory() as db:
            lead = (await db.execute(select(Lead))).scalars().first()
            result2 = await service2.enrich_lead(db, lead)
            assert result2.contacts_created == 0, "second run must not duplicate contacts"
            assert result2.contacts_skipped == 3
            contacts = (await db.execute(select(Contact))).scalars().all()
            assert len(contacts) == 3, f"still exactly 3 contacts, got {len(contacts)}"
            await db.commit()

        print(f"  re-run: created={result2.contacts_created} skipped={result2.contacts_skipped} "
              f"(no duplicates)")
        print("  PASS")
        return True
    finally:
        await engine.dispose()


async def test_email_lookup_fallback():
    print("\n=== Test: email lookup fallback when search finds nothing ===")
    engine, factory = await _make_db()
    try:
        provider = FakeGraph8Provider(
            people=[],  # search returns nothing
            company=None,
            email_lookup=PersonRecord(
                first_name="Jane",
                last_name="Doe",
                full_name="Jane Doe",
                job_title="Owner",
                email="jane@acme.com",
                linkedin_url="https://linkedin.com/in/janedoe",
                confidence=0.9,
            ),
        )
        service = PersonEnrichmentService(provider=provider)

        async with factory() as db:
            lead = make_lead(normalized_domain=None, website=None)  # force email path
            db.add(lead)
            await db.flush()
            result = await service.enrich_lead(db, lead)
            assert result.contacts_created == 1
            assert result.contacts[0].linkedin_url == "https://linkedin.com/in/janedoe"
            assert ("email", "info@acme.com") in provider.calls
            await db.commit()

        print("  PASS")
        return True
    finally:
        await engine.dispose()


async def test_no_key_raises_auth_error():
    print("\n=== Test: missing API key raises ProviderAuthenticationError ===")
    from app.core.exceptions import ProviderAuthenticationError
    from app.providers.graph8.provider import Graph8Provider
    from app.config import settings

    original = settings.graph8_api_key
    settings.graph8_api_key = ""
    provider = Graph8Provider()
    try:
        await provider.search_people_by_company(domain="acme.com")
        raise AssertionError("expected ProviderAuthenticationError")
    except ProviderAuthenticationError:
        pass
    finally:
        settings.graph8_api_key = original
        await provider.close()
    print("  PASS")
    return True


async def test_person_parsing():
    print("\n=== Test: Graph8 response parsing helpers ===")
    from app.providers.graph8.provider import Graph8Provider

    person = Graph8Provider._to_person({
        "first_name": "Jane",
        "last_name": "Doe",
        "work_email": "jane@acme.com",
        "direct_phone": None,
        "mobile_phone": "+1-555-0100",
        "job_title": "CEO",
        "seniority_level": "C-Suite",
        "job_department": "Executive",
        "linkedin_url": "https://linkedin.com/in/janedoe",
        "city": "Austin",
        "confidence_score": 95,  # 0-100 scale -> normalized to 0-1
    })
    assert person.full_name == "Jane Doe"
    assert person.email == "jane@acme.com"
    assert person.phone == "+1-555-0100", "mobile fallback for phone"
    assert abs(person.confidence - 0.95) < 1e-9, f"confidence normalized, got {person.confidence}"
    assert person.seniority == "C-Suite"

    assert domain_from_url("https://www.acme.com/contact") == "acme.com"
    assert domain_from_url("http://acme.com") == "acme.com"
    assert domain_from_url("acme.com") == "acme.com"
    assert domain_from_url(None) is None
    assert domain_from_url("") is None
    print("  PASS")
    return True


def test_http_endpoint():
    """End-to-end HTTP test of POST /leads/{id}/enrich-persons (sync, temp file DB)."""
    print("\n=== Test: HTTP endpoint /leads/{id}/enrich-persons ===")
    import tempfile
    from pathlib import Path

    from fastapi.testclient import TestClient
    from sqlalchemy import create_engine as create_sync_engine
    from sqlalchemy.orm import Session

    from app.core.security import create_access_token, hash_password
    from app.database.base import Base as SyncBase
    from app.dependencies import get_db, get_person_enrichment_service
    from app.main import app
    from app.models.user import User

    tmp_dir = Path(tempfile.mkdtemp(prefix="graph8_test_"))
    db_path = tmp_dir / "test.db"
    sync_url = f"sqlite:///{db_path}"

    # --- Seed with a SYNC engine (no event-loop conflicts with TestClient) ---
    sync_engine = create_sync_engine(sync_url)
    SyncBase.metadata.create_all(sync_engine)
    with Session(sync_engine) as session:
        user = User(
            company_id="co-http-1",
            email="http-test@example.com",
            password_hash=hash_password("x"),
            name="HTTP Tester",
            is_admin=True,
        )
        lead = make_lead(company_id="co-http-1")  # must match the user's company
        session.add_all([user, lead])
        session.commit()
        user_id, lead_id = user.id, lead.id
    sync_engine.dispose()

    # --- Overrides: per-request async engine + fake graph8 provider ---
    async def override_get_db():
        from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

        engine = create_async_engine(
            f"sqlite+aiosqlite:///{db_path}", connect_args={"check_same_thread": False}
        )
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        await engine.dispose()

    provider = FakeGraph8Provider(people=SAMPLE_PEOPLE, company=SAMPLE_COMPANY)
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_person_enrichment_service] = (
        lambda: PersonEnrichmentService(provider=provider)
    )

    token = create_access_token(user_id)
    headers = {"Authorization": f"Bearer {token}"}

    try:
        client = TestClient(app)  # no lifespan -> no background jobs / real DB

        # 1) Happy path: 200 + 3 contacts created.
        r = client.post(f"/api/v1/leads/{lead_id}/enrich-persons", headers=headers)
        assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text}"
        body = r.json()
        assert body["contacts_created"] == 3, body
        assert all(c["linkedin_url"] for c in body["contacts"]), body["contacts"]
        assert body["company_enriched"] is True
        print(f"  POST enrich -> 200, created={body['contacts_created']}, "
              f"company_enriched={body['company_enriched']}")
        print(f"  message: {body['message']}")

        # 2) Lead detail now returns the contacts with LinkedIn URLs.
        r2 = client.get(f"/api/v1/leads/{lead_id}", headers=headers)
        assert r2.status_code == 200, r2.text
        contacts = r2.json()["contacts"]
        assert len(contacts) == 3, f"expected 3 contacts in detail, got {len(contacts)}"
        assert all(c["linkedin_url"] for c in contacts)
        print(f"  GET lead detail -> {len(contacts)} contacts, all with LinkedIn URLs")

        # 3) No auth -> 401.
        r3 = client.post(f"/api/v1/leads/{lead_id}/enrich-persons")
        assert r3.status_code == 401, f"expected 401, got {r3.status_code}"
        print("  no auth -> 401")

        # 4) Real service (no fake provider): depends on whether a key is set.
        app.dependency_overrides.pop(get_person_enrichment_service, None)
        r4 = client.post(f"/api/v1/leads/{lead_id}/enrich-persons", headers=headers)
        from app.config import settings as app_settings

        if app_settings.graph8_api_key:
            # Live key configured -> real Graph8 call must succeed.
            assert r4.status_code == 200, f"expected 200, got {r4.status_code}: {r4.text}"
            body4 = r4.json()
            assert body4["contacts_created"] >= 1, body4
            with_li = sum(1 for c in body4["contacts"] if c["linkedin_url"])
            assert with_li >= 1, f"expected LinkedIn URLs, got {body4['contacts']}"
            print(f"  LIVE Graph8 call -> 200, created={body4['contacts_created']}, "
                  f"with_linkedin={with_li}")
            print(f"  message: {body4['message']}")
        else:
            # No key -> 400 with actionable message.
            assert r4.status_code == 400, f"expected 400, got {r4.status_code}: {r4.text}"
            assert "Graph8 API key" in r4.json()["detail"]
            print(f"  missing API key -> 400: {r4.json()['detail']}")

        print("  PASS")
        return True
    finally:
        app.dependency_overrides.clear()
        try:
            sync_engine = create_sync_engine(sync_url)
            sync_engine.dispose()
        except Exception:
            pass
        import shutil

        shutil.rmtree(tmp_dir, ignore_errors=True)


async def main():
    print("=" * 60)
    print("GRAPH8 ENRICHMENT TESTS")
    print("=" * 60)

    results = {}
    import inspect

    for name, fn in [
        ("enrichment_flow", test_enrichment_flow),
        ("email_fallback", test_email_lookup_fallback),
        ("auth_error", test_no_key_raises_auth_error),
        ("parsing", test_person_parsing),
        ("http_endpoint", test_http_endpoint),
    ]:
        try:
            out = fn()
            if inspect.isawaitable(out):
                out = await out
            results[name] = out
        except Exception as e:
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
