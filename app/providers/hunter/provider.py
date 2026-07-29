import httpx

from app.config import settings
from app.core.exceptions import ProviderAuthenticationError
from app.core.logging import get_logger
from app.providers.base.email_provider import EmailDiscoveryProvider, EmailResult

logger = get_logger()

HUNTER_API_BASE = "https://api.hunter.io/v2"


class HunterClient:
    def __init__(self) -> None:
        self.api_key = settings.hunter_api_key
        self.client = httpx.AsyncClient(
            base_url=HUNTER_API_BASE,
            timeout=30.0,
        )

    async def close(self) -> None:
        await self.client.aclose()

    async def domain_search(
        self, domain: str, limit: int = 10
    ) -> dict | None:
        if not self.api_key:
            raise ProviderAuthenticationError("hunter")

        params = {
            "domain": domain,
            "api_key": self.api_key,
            "limit": min(limit, 20),
        }

        try:
            response = await self.client.get("/domain-search", params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise ProviderAuthenticationError("hunter")
            if e.response.status_code == 429:
                logger.warning("hunter_rate_limited", domain=domain)
                return None
            logger.error("hunter_domain_search_failed", status=e.response.status_code)
            return None
        except httpx.RequestError as e:
            logger.error("hunter_request_failed", error=str(e))
            return None

    async def email_verify(self, email: str) -> dict | None:
        if not self.api_key:
            raise ProviderAuthenticationError("hunter")

        params = {"email": email, "api_key": self.api_key}

        try:
            response = await self.client.get("/email-verifier", params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError:
            logger.error("hunter_email_verify_failed", email=email)
            return None
        except httpx.RequestError as e:
            logger.error("hunter_verify_request_failed", error=str(e))
            return None


class HunterProvider(EmailDiscoveryProvider):
    def __init__(self) -> None:
        self.client = HunterClient()

    async def close(self) -> None:
        await self.client.close()

    async def discover_emails(self, domain: str) -> list[EmailResult]:
        data = await self.client.domain_search(domain)
        if not data or "data" not in data:
            return []

        results = []
        emails_data = data["data"].get("emails", [])

        for email_data in emails_data:
            email = email_data.get("value", "")
            if not email:
                continue

            confidence = email_data.get("confidence", 0) / 100.0

            status = "unknown"
            if confidence >= 0.8:
                status = "valid"
            elif confidence >= 0.5:
                status = "risky"

            results.append(EmailResult(
                email=email,
                status=status,
                confidence=confidence,
                source="hunter",
                first_name=email_data.get("first_name"),
                last_name=email_data.get("last_name"),
                position=email_data.get("position"),
            ))

        logger.info("hunter_emails_discovered", domain=domain, count=len(results))
        return results

    async def verify_email(self, email: str) -> EmailResult:
        data = await self.client.email_verify(email)
        if not data or "data" not in data:
            return EmailResult(
                email=email,
                status="unknown",
                confidence=0.0,
                source="hunter",
            )

        email_data = data["data"]
        status = email_data.get("status", "unknown")
        score = email_data.get("score", 0) / 100.0

        result = EmailResult(
            email=email,
            status=status,
            confidence=score,
            source="hunter",
            is_business_email=email_data.get("mx_found", False),
        )

        logger.info("hunter_email_verified", email=email, status=status, score=score)
        return result
