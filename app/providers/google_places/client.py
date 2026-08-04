import httpx

from app.config import settings
from app.core.exceptions import ProviderAuthenticationError
from app.core.logging import get_logger

logger = get_logger()

GOOGLE_PLACES_BASE_URL = "https://places.googleapis.com/v1"


class GooglePlacesClient:
    @property
    def api_key(self) -> str:
        return settings.google_places_api_key

    def __init__(self) -> None:
        self.client = httpx.AsyncClient(
            base_url=GOOGLE_PLACES_BASE_URL,
            timeout=30.0,
        )

    async def close(self) -> None:
        await self.client.aclose()

    async def text_search(
        self,
        query: str,
        latitude: float | None = None,
        longitude: float | None = None,
        max_results: int = 20,
    ) -> list[dict]:
        if not self.api_key:
            raise ProviderAuthenticationError("google_places")

        payload = {
            "textQuery": query,
            "maxResultCount": min(max_results, 20),
            "languageCode": "en",
        }

        if latitude and longitude:
            payload["locationBias"] = {
                "circle": {
                    "center": {"latitude": latitude, "longitude": longitude},
                    "radius": 50000.0,
                }
            }

        try:
            response = await self.client.post(
                "/places:searchText",
                json=payload,
                headers={
                    "X-Goog-Api-Key": self.api_key,
                    "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.formattedAddress,places.websiteUri,places.internationalPhoneNumber,places.nationalPhoneNumber,places.types,places.businessStatus",
                },
            )
            response.raise_for_status()
            data = response.json()
            return data.get("places", [])
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise ProviderAuthenticationError("google_places")
            logger.error("google_places_search_failed", status=e.response.status_code)
            return []
        except httpx.RequestError as e:
            logger.error("google_places_request_failed", error=str(e))
            return []

    async def get_place_details(self, place_id: str) -> dict | None:
        if not self.api_key:
            raise ProviderAuthenticationError("google_places")

        try:
            response = await self.client.get(
                f"/places/{place_id}",
                headers={
                    "X-Goog-Api-Key": self.api_key,
                    "X-Goog-FieldMask": "*",
                },
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError:
            logger.error("google_places_details_failed", place_id=place_id)
            return None
        except httpx.RequestError as e:
            logger.error("google_places_details_request_failed", error=str(e))
            return None
