from urllib.parse import urlparse

from app.core.logging import get_logger
from app.models.evidence import Evidence, EvidenceCollection
from app.providers.base.crawler_provider import CrawledPage, CrawlerProvider, WebsiteData
from app.utils.domain import normalize_domain
from app.utils.similarity import calculate_similarity

logger = get_logger()

CONTACT_PATHS = ["/contact", "/contact-us", "/contactus", "/about", "/about-us"]
MAX_PAGES_TO_CRAWL = 5


def _find_contact_page_url(homepage: CrawledPage) -> str | None:
    if not homepage.links:
        return None
    homepage_domain = normalize_domain(homepage.url)
    for link in homepage.links:
        link_domain = normalize_domain(link)
        if link_domain != homepage_domain:
            continue
        path = urlparse(link).path.lower()
        for contact_path in CONTACT_PATHS:
            if path == contact_path or path.endswith(contact_path):
                return link
    return None


def _extract_company_name(page: CrawledPage) -> str | None:
    if page.json_ld:
        for item in page.json_ld:
            if isinstance(item, dict):
                if item.get("@type") in ("Organization", "LocalBusiness", "Company"):
                    name = item.get("name")
                    if name and isinstance(name, str):
                        return name
                if "name" in item and isinstance(item["name"], str):
                    return item["name"]

    if page.meta_tags:
        for key in ("og:site_name", "application-name"):
            if key in page.meta_tags:
                return page.meta_tags[key]

    if page.title:
        parts = page.title.split("|")
        if len(parts) > 1:
            return parts[-1].strip()
        parts = page.title.split("-")
        if len(parts) > 1:
            return parts[-1].strip()

    return None


def _extract_description(page: CrawledPage) -> str | None:
    if page.meta_tags:
        for key in ("description", "og:description"):
            if key in page.meta_tags:
                return page.meta_tags[key]

    if page.json_ld:
        for item in page.json_ld:
            if isinstance(item, dict) and "description" in item:
                desc = item["description"]
                if isinstance(desc, str):
                    return desc

    return None


def _extract_social_links(page: CrawledPage) -> list[str]:
    social_domains = [
        "facebook.com", "twitter.com", "x.com", "linkedin.com",
        "instagram.com", "youtube.com", "tiktok.com",
    ]
    social_links = []
    for link in page.links:
        domain = normalize_domain(link)
        if any(social in domain for social in social_domains):
            social_links.append(link)
    return list(set(social_links))


def _extract_structured_data(page: CrawledPage) -> dict:
    data = {}
    if page.json_ld:
        for item in page.json_ld:
            if isinstance(item, dict):
                item_type = item.get("@type", "")
                if item_type in ("Organization", "LocalBusiness", "Company"):
                    data["organization"] = item
                if item_type in ("LocalBusiness", "Store", "Restaurant"):
                    data["local_business"] = item
                if "address" in item:
                    data["address"] = item["address"]
                if "telephone" in item:
                    data["phone"] = item["telephone"]
                if "email" in item:
                    data["email"] = item["email"]
    return data


class WebsiteIntelligenceService:
    def __init__(
        self,
        primary_crawler: CrawlerProvider,
        fallback_crawler: CrawlerProvider | None = None,
    ) -> None:
        self.primary_crawler = primary_crawler
        self.fallback_crawler = fallback_crawler

    async def _crawl_with_fallback(self, url: str) -> CrawledPage:
        page = await self.primary_crawler.crawl_page(url)
        if page.error and self.fallback_crawler:
            logger.info("trying_fallback_crawler", url=url)
            page = await self.fallback_crawler.crawl_page(url)
        return page

    async def analyze_website(self, domain: str) -> WebsiteData:
        if not domain.startswith("http"):
            base_url = f"https://{domain}"
        else:
            base_url = domain

        homepage = await self._crawl_with_fallback(base_url)
        data = WebsiteData(domain=normalize_domain(base_url), homepage=homepage)

        if homepage.error:
            logger.warning("homepage_crawl_failed", domain=domain, error=homepage.error)
            return data

        contact_url = _find_contact_page_url(homepage)
        if contact_url:
            data.contact_page = await self._crawl_with_fallback(contact_url)

        data.company_name = _extract_company_name(homepage)
        data.description = _extract_description(homepage)
        data.social_links = _extract_social_links(homepage)

        all_emails = set(homepage.emails)
        all_phones = set(homepage.phones)

        if data.contact_page:
            all_emails.update(data.contact_page.emails or [])
            all_phones.update(data.contact_page.phones or [])

        data.emails_found = list(all_emails)
        data.phones_found = list(all_phones)
        data.pages_crawled = 1 + (1 if data.contact_page else 0)

        logger.info(
            "website_analysis_complete",
            domain=domain,
            pages_crawled=data.pages_crawled,
            emails_found=len(data.emails_found),
            phones_found=len(data.phones_found),
        )
        return data

    def build_evidence(
        self,
        website_data: WebsiteData,
        candidate_source: str,
    ) -> EvidenceCollection:
        collection = EvidenceCollection()

        if website_data.domain:
            collection.add(Evidence(
                field_name="website",
                value=f"https://{website_data.domain}",
                source="official_website",
                source_url=website_data.homepage.url if website_data.homepage else None,
                confidence=0.95,
            ))

        if website_data.company_name:
            collection.add(Evidence(
                field_name="company_name",
                value=website_data.company_name,
                source="official_website",
                source_url=website_data.homepage.url if website_data.homepage else None,
                confidence=0.9,
            ))

        for email in website_data.emails_found:
            collection.add(Evidence(
                field_name="email",
                value=email,
                source="official_website",
                source_url=website_data.homepage.url if website_data.homepage else None,
                confidence=0.85,
            ))

        for phone in website_data.phones_found:
            collection.add(Evidence(
                field_name="phone",
                value=phone,
                source="official_website",
                source_url=website_data.homepage.url if website_data.homepage else None,
                confidence=0.8,
            ))

        if website_data.homepage and website_data.homepage.text_content:
            structured = _extract_structured_data(website_data.homepage)
            if "address" in structured:
                addr = structured["address"]
                if isinstance(addr, dict):
                    address_str = ", ".join(
                        str(v) for v in addr.values() if isinstance(v, str)
                    )
                else:
                    address_str = str(addr)
                collection.add(Evidence(
                    field_name="address",
                    value=address_str,
                    source="official_website",
                    source_url=website_data.homepage.url,
                    confidence=0.85,
                ))

        return collection

    def verify_website_identity(
        self,
        website_data: WebsiteData,
        candidate_name: str,
        candidate_phone: str | None = None,
        candidate_address: str | None = None,
    ) -> dict:
        result = {
            "name_match": False,
            "phone_match": False,
            "address_match": False,
            "identity_score": 0.0,
        }

        if website_data.company_name and candidate_name:
            sim = calculate_similarity(
                website_data.company_name.lower(), candidate_name.lower()
            )
            result["name_match"] = sim >= 0.7

        if website_data.phones_found and candidate_phone:
            for phone in website_data.phones_found:
                normalized_phone = phone.replace(" ", "").replace("-", "")
                normalized_candidate = candidate_phone.replace(" ", "").replace("-", "")
                if normalized_phone == normalized_candidate:
                    result["phone_match"] = True
                    break

        if website_data.homepage and candidate_address:
            text = website_data.homepage.text_content or ""
            if candidate_address.lower() in text.lower():
                result["address_match"] = True

        score = 0.0
        if result["name_match"]:
            score += 0.5
        if result["phone_match"]:
            score += 0.3
        if result["address_match"]:
            score += 0.2
        result["identity_score"] = score

        return result
