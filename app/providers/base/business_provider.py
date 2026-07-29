from abc import ABC, abstractmethod
from datetime import datetime

from pydantic import BaseModel, Field


class CandidateLead(BaseModel):
    name: str
    normalized_name: str = ""
    source: str
    source_id: str | None = None
    source_url: str | None = None
    website: str | None = None
    normalized_domain: str | None = None
    phone: str | None = None
    normalized_phone: str | None = None
    email: str | None = None
    normalized_email: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    country: str | None = None
    category: str | None = None
    business_status: str = "unknown"
    discovered_at: datetime = Field(default_factory=datetime.utcnow)


class SearchPlan(BaseModel):
    primary_source: str
    secondary_source: str | None = None
    candidate_target: int = 50
    requires_location: bool = False
    requires_website_analysis: bool = False
    requires_email_enrichment: bool = False
    requires_phone_enrichment: bool = False
    search_queries: list[str] = Field(default_factory=list)


class BusinessDiscoveryProvider(ABC):
    @abstractmethod
    async def search(
        self,
        plan: SearchPlan,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> list[CandidateLead]:
        ...

    @abstractmethod
    async def get_details(self, source_id: str) -> CandidateLead | None:
        ...
