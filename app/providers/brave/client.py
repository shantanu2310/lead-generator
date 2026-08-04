import httpx

from app.config import settings
from app.core.exceptions import ProviderAuthenticationError
from app.core.logging import get_logger

logger = get_logger()

BRAVE_SEARCH_BASE_URL = "https://api.search.brave.com/res/v1"


class BraveSearchClient:
    @property
    def api_key(self) -> str:
        return settings.brave_search_api_key

    def __init__(self) -> None:
        self.client = httpx.AsyncClient(
            base_url=BRAVE_SEARCH_BASE_URL,
            headers={"Accept": "application/json"},
            timeout=30.0,
        )

    async def close(self) -> None:
        await self.client.aclose()

    async def web_search(
        self,
        query: str,
        count: int = 20,
        country: str | None = None,
    ) -> list[dict]:
        if not self.api_key:
            logger.warning("brave_search_skipped", reason="no_api_key")
            return []

        params = {"q": query, "count": min(count, 20)}
        if country:
            params["country"] = country

        try:
            response = await self.client.get(
                "/web/search",
                params=params,
                headers={"X-Subscription-Token": self.api_key},
            )
            response.raise_for_status()
            data = response.json()
            return data.get("web", {}).get("results", [])
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise ProviderAuthenticationError("brave_search")
            logger.error("brave_search_failed", status=e.response.status_code)
            return []
        except httpx.RequestError as e:
            logger.error("brave_search_request_failed", error=str(e))
            return []

    async def local_search(
        self,
        query: str,
        latitude: float | None = None,
        longitude: float | None = None,
        count: int = 20,
    ) -> list[dict]:
        if not self.api_key:
            logger.warning("brave_local_search_skipped", reason="no_api_key")
            return []

        params = {"q": query, "count": min(count, 20)}
        if latitude and longitude:
            params["lat"] = str(latitude)
            params["long"] = str(longitude)

        try:
            response = await self.client.get(
                "/local/pois",
                params=params,
                headers={"X-Subscription-Token": self.api_key},
            )
            response.raise_for_status()
            data = response.json()
            return data.get("results", [])
        except httpx.HTTPStatusError as e:
            logger.error("brave_local_search_failed", status=e.response.status_code)
            return []
        except httpx.RequestError as e:
            logger.error("brave_local_search_request_failed", error=str(e))
            return []
