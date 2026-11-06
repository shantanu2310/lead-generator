from abc import ABC, abstractmethod

from pydantic import BaseModel


class PersonRecord(BaseModel):
    """A person found in an external contact database (e.g. graph8)."""

    first_name: str | None = None
    last_name: str | None = None
    full_name: str = ""
    job_title: str | None = None
    email: str | None = None
    phone: str | None = None
    linkedin_url: str | None = None
    headline: str | None = None
    seniority: str | None = None
    department: str | None = None
    city: str | None = None
    confidence: float = 0.0


class CompanyRecord(BaseModel):
    """Firmographic data for a company found in an external database."""

    name: str | None = None
    domain: str | None = None
    industry: str | None = None
    employee_count: int | None = None
    revenue: str | None = None
    country: str | None = None
    state: str | None = None
    city: str | None = None
    logo_url: str | None = None
    confidence: float = 0.0


class ContactDiscoveryProvider(ABC):
    """Finds people (with LinkedIn profiles) and companies in a B2B data index."""

    @abstractmethod
    async def search_people_by_company(
        self,
        domain: str | None = None,
        company_name: str | None = None,
        limit: int = 25,
    ) -> list[PersonRecord]:
        ...

    @abstractmethod
    async def lookup_person_by_email(self, email: str) -> PersonRecord | None:
        ...

    @abstractmethod
    async def search_company(
        self,
        domain: str | None = None,
        name: str | None = None,
    ) -> CompanyRecord | None:
        ...

    @abstractmethod
    async def close(self) -> None:
        ...
