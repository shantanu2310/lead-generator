import asyncio

import httpx

from app.config import settings
from app.core.exceptions import ProviderAuthenticationError
from app.core.logging import get_logger
from app.providers.base.contact_provider import (
    CompanyRecord,
    ContactDiscoveryProvider,
    PersonRecord,
)

logger = get_logger()

DEFAULT_BASE_URL = "https://be.graph8.com/api/v1"


class Graph8Client:
    """Thin async client for the graph8 REST API (be.graph8.com/api/v1)."""

    def __init__(self) -> None:
        self.client = httpx.AsyncClient(timeout=30.0)

    @property
    def api_key(self) -> str:
        return settings.graph8_api_key

    @property
    def base_url(self) -> str:
        return (settings.graph8_base_url or DEFAULT_BASE_URL).rstrip("/")

    async def close(self) -> None:
        await self.client.aclose()

    def _headers(self) -> dict[str, str]:
        if not self.api_key:
            raise ProviderAuthenticationError("graph8")
        return {"Authorization": f"Bearer {self.api_key}"}

    async def post(self, path: str, payload: dict) -> dict | None:
        """POST JSON to graph8. Retries once on 429, returns None on failure."""
        url = f"{self.base_url}{path}"
        headers = self._headers()

        for attempt in range(2):
            try:
                response = await self.client.post(url, json=payload, headers=headers)

                if response.status_code == 429:
                    if attempt == 0:
                        retry_after = response.headers.get("Retry-After", "")
                        delay = float(retry_after) if retry_after.isdigit() else 1.0
                        logger.warning("graph8_rate_limited", path=path, retry_after=delay)
                        await asyncio.sleep(delay)
                        continue
                    logger.warning("graph8_rate_limited", path=path, exhausted=True)
                    return None

                response.raise_for_status()
                body = response.json()
                return body.get("data", body) if isinstance(body, dict) else body

            except httpx.HTTPStatusError as e:
                if e.response.status_code in (401, 403):
                    raise ProviderAuthenticationError("graph8")
                logger.error(
                    "graph8_request_failed",
                    path=path,
                    status=e.response.status_code,
                    body=e.response.text[:300],
                )
                return None
            except (httpx.RequestError, ValueError) as e:
                logger.error("graph8_request_error", path=path, error=str(e))
                return None

        return None


class Graph8Provider(ContactDiscoveryProvider):
    """Discovers people (LinkedIn profiles) and companies via graph8's data index."""

    def __init__(self) -> None:
        self.client = Graph8Client()

    async def close(self) -> None:
        await self.client.close()

    async def search_people_by_company(
        self,
        domain: str | None = None,
        company_name: str | None = None,
        limit: int = 25,
    ) -> list[PersonRecord]:
        # Primary strategy: exact company domain match (most precise).
        if domain:
            people = await self._search_contacts(
                [{"field": "company_domain", "operator": "any_of", "value": [domain]}],
                limit,
            )
            if people:
                return people

        # Fallback: fuzzy company-name match.
        if company_name:
            return await self._search_contacts(
                [{"field": "company_name", "operator": "contains", "value": [company_name]}],
                limit,
            )
        return []

    async def lookup_person_by_email(self, email: str) -> PersonRecord | None:
        data = await self.client.post("/enrichment/lookup/person", {"email": email})
        if not data or not data.get("found"):
            return None

        row = data.get("data") or {}
        first = (row.get("first_name") or "").strip()
        last = (row.get("last_name") or "").strip()
        return PersonRecord(
            first_name=first or None,
            last_name=last or None,
            full_name=f"{first} {last}".strip(),
            job_title=row.get("job_title"),
            email=row.get("work_email"),
            linkedin_url=row.get("linkedin_url"),
            confidence=float(data.get("confidence") or 0.0),
        )

    async def search_company(
        self,
        domain: str | None = None,
        name: str | None = None,
    ) -> CompanyRecord | None:
        if domain:
            filters = [{"field": "domain", "operator": "any_of", "value": [domain]}]
        elif name:
            filters = [{"field": "name", "operator": "contains", "value": [name]}]
        else:
            return None

        data = await self.client.post(
            "/search/companies", {"filters": filters, "page": 1, "limit": 5}
        )
        if not data or not isinstance(data, list) or not data:
            return None

        row = data[0]
        raw_count = str(row.get("employee_count") or "").strip()
        employee_count = int(raw_count) if raw_count.isdigit() else None

        return CompanyRecord(
            name=row.get("name"),
            domain=row.get("domain"),
            industry=row.get("industry"),
            employee_count=employee_count,
            revenue=row.get("revenue"),
            country=row.get("country"),
            state=row.get("state"),
            city=row.get("city"),
            logo_url=row.get("logo_url"),
        )

    async def _search_contacts(self, filters: list[dict], limit: int) -> list[PersonRecord]:
        data = await self.client.post(
            "/search/contacts",
            {"filters": filters, "page": 1, "limit": max(1, min(limit, 100))},
        )
        if not data or not isinstance(data, list):
            return []
        return [self._to_person(row) for row in data if isinstance(row, dict)]

    @staticmethod
    def _to_person(row: dict) -> PersonRecord:
        first = (row.get("first_name") or "").strip()
        last = (row.get("last_name") or "").strip()
        full_name = (row.get("full_name") or f"{first} {last}").strip()

        confidence = 0.0
        try:
            confidence = float(row.get("confidence_score") or 0.0)
            if confidence > 1.0:
                confidence /= 100.0
        except (TypeError, ValueError):
            confidence = 0.0

        return PersonRecord(
            first_name=first or None,
            last_name=last or None,
            full_name=full_name,
            job_title=row.get("job_title"),
            email=row.get("work_email"),
            phone=row.get("direct_phone") or row.get("mobile_phone"),
            linkedin_url=row.get("linkedin_url"),
            seniority=row.get("seniority_level"),
            department=row.get("job_department"),
            city=row.get("city"),
            confidence=max(0.0, min(confidence, 1.0)),
        )
