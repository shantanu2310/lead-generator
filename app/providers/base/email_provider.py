from abc import ABC, abstractmethod

from pydantic import BaseModel


class EmailResult(BaseModel):
    email: str
    status: str = "unknown"
    confidence: float = 0.0
    source: str = ""
    source_url: str | None = None
    is_business_email: bool = True
    first_name: str | None = None
    last_name: str | None = None
    position: str | None = None


class EmailDiscoveryProvider(ABC):
    @abstractmethod
    async def discover_emails(self, domain: str) -> list[EmailResult]:
        ...

    @abstractmethod
    async def verify_email(self, email: str) -> EmailResult:
        ...

    @abstractmethod
    async def close(self) -> None:
        ...
