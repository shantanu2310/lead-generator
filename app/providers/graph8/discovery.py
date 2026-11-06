from app.core.logging import get_logger
from app.providers.base.business_provider import (
    BusinessDiscoveryProvider,
    CandidateLead,
    SearchPlan,
)
from app.providers.graph8.provider import Graph8Client, Graph8Provider

logger = get_logger()


def _clean(value: str | None) -> str | None:
    """graph8 locks fields behind credits and returns the literal '***'."""
    if not value or value.strip() == "***":
        return None
    return value


class Graph8CompanyProvider(BusinessDiscoveryProvider):
    """B2B company index used when Google Places returns 0 candidates."""

    def __init__(self) -> None:
        self.client = Graph8Client()

    async def close(self) -> None:
        await self.client.close()

    @staticmethod
    def _filter_sets(category: str, location: str | None) -> list[list[dict]]:
        # Full phrase first (most precise), then first word for recall
        # ("recruitment agency" -> "recruitment"), each tried against the
        # most specific geo field that plausibly holds the location.
        terms = [category]
        first_word = category.split()[0]
        if len(category.split()) > 1 and first_word != category:
            terms.append(first_word)

        filter_sets: list[list[dict]] = []
        for term in terms:
            name_filter = [
                {"field": "name", "operator": "contains", "value": [term]}
            ]
            if not location:
                filter_sets.append(name_filter)
                continue
            for field in ("city", "state", "country"):
                filter_sets.append(
                    name_filter
                    + [{"field": field, "operator": "contains", "value": [location]}]
                )
        return filter_sets

    async def search(
        self,
        plan: SearchPlan,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> list[CandidateLead]:
        category = (plan.category or "").strip()
        if not category:
            return []

        limit = max(1, min(plan.candidate_target, 50))
        filter_sets = self._filter_sets(category, plan.location)

        rows: list[dict] = []
        attempts = 0
        for filters in filter_sets:
            attempts += 1
            data = await self.client.post(
                "/search/companies",
                {"filters": filters, "page": 1, "limit": limit},
            )
            if data and isinstance(data, list):
                rows = [r for r in data if isinstance(r, dict)]
            if rows:
                break  # most specific geo filter that matched wins

        candidates: list[CandidateLead] = []
        seen: set[str] = set()
        for row in rows:
            name = (row.get("name") or "").strip()
            domain = (row.get("domain") or row.get("website") or "").strip()
            key = domain.lower().removeprefix("www.") or name.lower()
            if not name or not key or key in seen:
                continue
            seen.add(key)

            address = ", ".join(
                p for p in (row.get("address"), row.get("city"), row.get("state")) if p
            ) or None
            # Only claim "active" for indexed, sized companies.
            active = bool(row.get("linkedin_url") or row.get("employee_count"))

            candidates.append(
                CandidateLead(
                    name=name,
                    source="graph8_companies",
                    source_id=key,
                    source_url=_clean(row.get("linkedin_url")),
                    website=row.get("website") or domain or None,
                    phone=_clean(row.get("phone")),
                    address=address,
                    country=_clean(row.get("country")),
                    # The search term graph8 matched server-side, so scoring's
                    # category similarity against the intent is a guaranteed hit.
                    category=category,
                    business_status="active" if active else "unknown",
                )
            )

        logger.info(
            "graph8_company_search_complete",
            total_candidates=len(candidates),
            filter_sets_tried=attempts,
        )
        return candidates

    async def get_details(self, source_id: str) -> CandidateLead | None:
        return None


class Graph8PeopleProvider(BusinessDiscoveryProvider):
    """Person-mode primary source: people (with LinkedIn) via graph8."""

    def __init__(self) -> None:
        self.client = Graph8Client()

    async def close(self) -> None:
        await self.client.close()

    @staticmethod
    def _filter_sets(
        job_title: str,
        variants: list[str],
        location: str | None,
        seniority: list[str],
    ) -> list[list[dict]]:
        titles = list(dict.fromkeys([job_title, *variants]))
        base: list[dict] = [
            {"field": "job_title", "operator": "any_of", "value": titles},
            # Only working professionals — never interns/students.
            {
                "field": "job_title",
                "operator": "none_of",
                "value": ["intern", "student", "trainee"],
            },
        ]
        if seniority:
            base.append(
                {"field": "seniority_level", "operator": "any_of", "value": seniority}
            )
        if not location:
            return [base]
        return [
            base + [{"field": field, "operator": "contains", "value": [location]}]
            for field in ("city", "state", "country")
        ]

    async def _query(self, filter_sets: list[list[dict]], limit: int) -> list[dict]:
        """Most specific geo filter set that returns rows wins."""
        for filters in filter_sets:
            data = await self.client.post(
                "/search/contacts",
                {"filters": filters, "page": 1, "limit": limit},
            )
            if data and isinstance(data, list):
                rows = [r for r in data if isinstance(r, dict)]
                if rows:
                    return rows
        return []

    async def search(
        self,
        plan: SearchPlan,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> list[CandidateLead]:
        job_title = (plan.job_title or "").strip()
        if not job_title:
            return []

        limit = max(1, min(plan.candidate_target, 100))
        variants = [v.strip() for v in plan.job_title_variants if v and v.strip()]
        seniority = list(plan.seniority_levels)

        rows = await self._query(
            self._filter_sets(job_title, variants, plan.location, seniority), limit
        )
        # graph8 returns [] (not an error) for an unrecognized seniority value,
        # so a bad enum must never zero out the whole person search.
        if not rows and seniority:
            rows = await self._query(
                self._filter_sets(job_title, variants, plan.location, []), limit
            )

        candidates: list[CandidateLead] = []
        seen: set[str] = set()
        for row in rows:
            person = Graph8Provider._to_person(row)
            person.email = _clean(person.email)
            person.phone = _clean(person.phone)
            person.headline = _clean(person.headline)
            person.city = _clean(person.city)
            # Every person-mode lead must be a visitable profile: no LinkedIn
            # or no name means no lead (graph8's "***" locks clean to None).
            if not person.full_name or not _clean(row.get("linkedin_url")):
                continue
            linkedin = person.linkedin_url  # https-normalized
            if not linkedin or linkedin in seen:
                continue
            seen.add(linkedin)

            employee_count = str(row.get("company_employee_count") or "").strip()
            # Address = best available geo (graph8 masks city on many rows;
            # street-level doesn't exist on contact rows).
            address = ", ".join(
                p
                for p in (
                    _clean(row.get("city")),
                    _clean(row.get("state")),
                    _clean(row.get("country")),
                )
                if p
            ) or None
            candidates.append(
                CandidateLead(
                    # The person is the lead; the company survives as website.
                    name=person.full_name,
                    source="graph8_people",
                    source_id=linkedin,
                    source_url=linkedin,
                    website=_clean(row.get("company_domain")),
                    address=address,
                    organization=_clean(row.get("company_name")),
                    country=_clean(row.get("country")),
                    category=job_title,
                    business_status="active" if (employee_count or linkedin) else "unknown",
                    contact=person,
                )
            )

        logger.info(
            "graph8_people_search_complete",
            people_matched=len(candidates),
            rows_returned=len(rows),
        )
        return candidates

    async def get_details(self, source_id: str) -> CandidateLead | None:
        return None
