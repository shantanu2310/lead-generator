from abc import ABC, abstractmethod

from pydantic import BaseModel, Field


class CrawledPage(BaseModel):
    url: str
    status_code: int = 200
    content_type: str = "text/html"
    title: str | None = None
    html: str | None = None
    text_content: str | None = None
    links: list[str] = Field(default_factory=list)
    emails: list[str] = Field(default_factory=list)
    phones: list[str] = Field(default_factory=list)
    json_ld: list[dict] = Field(default_factory=list)
    meta_tags: dict[str, str] = Field(default_factory=dict)
    structured_data: dict = Field(default_factory=dict)
    error: str | None = None


class WebsiteData(BaseModel):
    domain: str
    homepage: CrawledPage | None = None
    contact_page: CrawledPage | None = None
    about_page: CrawledPage | None = None
    pages_crawled: int = 0
    emails_found: list[str] = Field(default_factory=list)
    phones_found: list[str] = Field(default_factory=list)
    company_name: str | None = None
    description: str | None = None
    social_links: list[str] = Field(default_factory=list)


class CrawlerProvider(ABC):
    @abstractmethod
    async def crawl_page(self, url: str) -> CrawledPage:
        ...

    @abstractmethod
    async def close(self) -> None:
        ...
