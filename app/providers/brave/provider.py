from app.core.logging import get_logger
from app.providers.base.business_provider import (
    BusinessDiscoveryProvider,
    CandidateLead,
    SearchPlan,
)
from app.providers.brave.client import BraveSearchClient
from app.utils.domain import normalize_domain
from app.utils.text import normalize_company_name

logger = get_logger()


class BraveSearchProvider(BusinessDiscoveryProvider):
    def __init__(self) -> None:
        self.client = BraveSearchClient()

    async def close(self) -> None:
        await self.client.close()

    def _parse_web_result(self, result: dict) -> CandidateLead:
        title = result.get("title", "")
        url = result.get("url", "")
        description = result.get("description", "")
        domain = result.get("meta_url", {}).get("hostname", "")

        if not domain and url:
            domain = normalize_domain(url)

        normalized_name = normalize_company_name(title)

        return CandidateLead(
            name=title,
            normalized_name=normalized_name,
            source="brave_search",
            source_id=url,
            source_url=url,
            website=url if url.startswith("http") else None,
            normalized_domain=domain if domain else None,
            address=description[:200] if description else None,
        )

    def _parse_local_result(self, result: dict) -> CandidateLead:
        name = result.get("name", "")
        address = result.get("address", {})
        address_str = ", ".join(
            filter(None, [
                address.get("street", ""),
                address.get("city", ""),
                address.get("region", ""),
                address.get("country", ""),
            ])
        )

        website = result.get("website")
        domain = normalize_domain(website) if website else None

        return CandidateLead(
            name=name,
            normalized_name=normalize_company_name(name),
            source="brave_search",
            source_id=result.get("id"),
            website=website,
            normalized_domain=domain,
            phone=result.get("phone"),
            address=address_str if address_str else None,
            latitude=result.get("coordinates", {}).get("latitude"),
            longitude=result.get("coordinates", {}).get("longitude"),
            category=result.get("category"),
        )

    async def search(
        self,
        plan: SearchPlan,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> list[CandidateLead]:
        candidates = []
        seen_urls = set()

        for query in plan.search_queries:
            if plan.requires_location and latitude and longitude:
                results = await self.client.local_search(
                    query=query,
                    latitude=latitude,
                    longitude=longitude,
                )
                for result in results:
                    candidate = self._parse_local_result(result)
                    key = candidate.source_id or candidate.name
                    if key not in seen_urls:
                        seen_urls.add(key)
                        candidates.append(candidate)
            else:
                results = await self.client.web_search(query=query)
                for result in results:
                    candidate = self._parse_web_result(result)
                    key = candidate.source_id or candidate.name
                    if key not in seen_urls:
                        seen_urls.add(key)
                        candidates.append(candidate)

            if len(candidates) >= plan.candidate_target:
                break

        logger.info(
            "brave_search_complete",
            total_candidates=len(candidates),
            queries_executed=len(plan.search_queries),
        )
        return candidates

    async def get_details(self, source_id: str) -> CandidateLead | None:
        return None
