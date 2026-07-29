from app.core.logging import get_logger
from app.providers.base.business_provider import (
    BusinessDiscoveryProvider,
    CandidateLead,
    SearchPlan,
)
from app.providers.google_places.client import GooglePlacesClient
from app.utils.domain import normalize_domain
from app.utils.text import normalize_company_name

logger = get_logger()

CATEGORY_MAP = {
    "florist": "florist",
    "flower shop": "florist",
    "dentist": "dentist",
    "dental clinic": "dentist",
    "restaurant": "restaurant",
    "cafe": "cafe",
    "coffee shop": "cafe",
    "marketing agency": "marketing agency",
    "marketing firm": "marketing agency",
    "law firm": "law firm",
    "lawyer": "law firm",
    "accounting": "accountant",
    "accountant": "accountant",
    "plumber": "plumber",
    "electrician": "electrician",
    "real estate": "real estate agent",
    "gym": "gym",
    "fitness": "gym",
    "salon": "beauty salon",
    "hair salon": "beauty salon",
    "bakery": "bakery",
    "pharmacy": "pharmacy",
    "hotel": "hotel",
    "auto repair": "car repair",
    "mechanic": "car repair",
}


class GooglePlacesProvider(BusinessDiscoveryProvider):
    def __init__(self) -> None:
        self.client = GooglePlacesClient()

    async def close(self) -> None:
        await self.client.close()

    def _extract_category(self, categories: list[str]) -> str | None:
        if not categories:
            return None
        primary = categories[0].lower()
        return CATEGORY_MAP.get(primary, primary)

    def _parse_place(self, place: dict) -> CandidateLead:
        name = place.get("displayName", {}).get("text", "")
        normalized_name = normalize_company_name(name)

        address_parts = []
        location = place.get("location", {})
        if "address" in place:
            addr = place["address"]
            if isinstance(addr, dict):
                for field in ["addressLines", "administrativeArea", "country"]:
                    if field in addr:
                        val = addr[field]
                        if isinstance(val, list):
                            address_parts.extend(val)
                        elif isinstance(val, str):
                            address_parts.append(val)
            elif isinstance(addr, str):
                address_parts.append(addr)

        address = ", ".join(address_parts) if address_parts else None
        website = place.get("websiteUri")
        normalized_domain = normalize_domain(website) if website else None

        phone = None
        if "internationalPhoneNumber" in place:
            phone = place["internationalPhoneNumber"]
        elif "nationalPhoneNumber" in place:
            phone = place["nationalPhoneNumber"]

        categories = place.get("types", [])
        category = self._extract_category(categories)

        business_status = "active"
        if place.get("businessStatus") == "CLOSED_PERMANENTLY":
            business_status = "closed_permanently"
        elif place.get("businessStatus") == "CLOSED_TEMPORARILY":
            business_status = "closed_temporarily"

        return CandidateLead(
            name=name,
            normalized_name=normalized_name,
            source="google_places",
            source_id=place.get("id"),
            website=website,
            normalized_domain=normalized_domain,
            phone=phone,
            address=address,
            latitude=location.get("latitude"),
            longitude=location.get("longitude"),
            category=category,
            business_status=business_status,
        )

    async def search(
        self,
        plan: SearchPlan,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> list[CandidateLead]:
        candidates = []
        seen_ids = set()

        for query in plan.search_queries:
            places = await self.client.text_search(
                query=query,
                latitude=latitude if plan.requires_location else None,
                longitude=longitude if plan.requires_location else None,
                max_results=20,
            )

            for place in places:
                place_id = place.get("id")
                if place_id in seen_ids:
                    continue
                seen_ids.add(place_id)

                candidate = self._parse_place(place)
                candidates.append(candidate)

            if len(candidates) >= plan.candidate_target:
                break

        logger.info(
            "google_places_search_complete",
            total_candidates=len(candidates),
            queries_executed=len(plan.search_queries),
        )
        return candidates

    async def get_details(self, source_id: str) -> CandidateLead | None:
        place = await self.client.get_place_details(source_id)
        if not place:
            return None
        return self._parse_place(place)
