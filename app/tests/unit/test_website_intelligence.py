import pytest

from app.models.evidence import Evidence, EvidenceCollection
from app.providers.base.crawler_provider import CrawledPage, WebsiteData
from app.providers.crawling.crawl4ai_provider import _extract_emails, _extract_phones
from app.services.website_service import (
    WebsiteIntelligenceService,
    _extract_company_name,
    _extract_description,
    _extract_social_links,
    _extract_structured_data,
)


class TestEmailExtraction:
    def test_extract_emails_from_text(self):
        text = "Contact us at info@example.com or support@test.org"
        emails = _extract_emails(text)
        assert "info@example.com" in emails
        assert "support@test.org" in emails

    def test_extract_no_emails(self):
        text = "No email addresses here"
        emails = _extract_emails(text)
        assert emails == []

    def test_extract_duplicate_emails(self):
        text = "info@test.com and info@test.com"
        emails = _extract_emails(text)
        assert len(emails) == 1


class TestPhoneExtraction:
    def test_extract_phones(self):
        text = "Call us at +1-555-123-4567 or (555) 987-6543"
        phones = _extract_phones(text)
        assert len(phones) >= 1

    def test_extract_no_phones(self):
        text = "No phone numbers here"
        phones = _extract_phones(text)
        assert phones == []


class TestCompanyNameExtraction:
    def test_from_json_ld(self):
        page = CrawledPage(
            url="https://example.com",
            json_ld=[{"@type": "Organization", "name": "Example Corp"}],
        )
        name = _extract_company_name(page)
        assert name == "Example Corp"

    def test_from_meta_tags(self):
        page = CrawledPage(
            url="https://example.com",
            meta_tags={"og:site_name": "My Business"},
        )
        name = _extract_company_name(page)
        assert name == "My Business"

    def test_from_title(self):
        page = CrawledPage(
            url="https://example.com",
            title="Welcome | Example Company",
        )
        name = _extract_company_name(page)
        assert name == "Example Company"

    def test_no_data(self):
        page = CrawledPage(url="https://example.com")
        name = _extract_company_name(page)
        assert name is None


class TestDescriptionExtraction:
    def test_from_meta(self):
        page = CrawledPage(
            url="https://example.com",
            meta_tags={"description": "A great company"},
        )
        desc = _extract_description(page)
        assert desc == "A great company"

    def test_from_json_ld(self):
        page = CrawledPage(
            url="https://example.com",
            json_ld=[{"@type": "Organization", "description": "We do things"}],
        )
        desc = _extract_description(page)
        assert desc == "We do things"


class TestSocialLinksExtraction:
    def test_extract_social_links(self):
        page = CrawledPage(
            url="https://example.com",
            links=[
                "https://example.com/about",
                "https://facebook.com/example",
                "https://linkedin.com/company/example",
            ],
        )
        social = _extract_social_links(page)
        assert len(social) == 2
        assert any("facebook" in s for s in social)
        assert any("linkedin" in s for s in social)

    def test_no_social_links(self):
        page = CrawledPage(
            url="https://example.com",
            links=["https://example.com/about", "https://example.com/contact"],
        )
        social = _extract_social_links(page)
        assert social == []


class TestStructuredDataExtraction:
    def test_extract_org(self):
        page = CrawledPage(
            url="https://example.com",
            json_ld=[{"@type": "Organization", "name": "Test", "telephone": "+1234"}],
        )
        data = _extract_structured_data(page)
        assert "organization" in data
        assert data["phone"] == "+1234"


class TestEvidenceModel:
    def test_create_evidence(self):
        evidence = Evidence(
            field_name="email",
            value="test@example.com",
            source="official_website",
            confidence=0.9,
        )
        assert evidence.field_name == "email"
        assert evidence.confidence == 0.9

    def test_evidence_collection_add(self):
        collection = EvidenceCollection()
        collection.add(Evidence(
            field_name="email",
            value="a@test.com",
            source="website",
            confidence=0.9,
        ))
        collection.add(Evidence(
            field_name="email",
            value="b@test.com",
            source="hunter",
            confidence=0.8,
        ))
        assert len(collection.get_by_field("email")) == 2

    def test_get_best_by_field(self):
        collection = EvidenceCollection()
        collection.add(Evidence(
            field_name="email",
            value="a@test.com",
            source="website",
            confidence=0.8,
        ))
        collection.add(Evidence(
            field_name="email",
            value="b@test.com",
            source="hunter",
            confidence=0.95,
        ))
        best = collection.get_best_by_field("email")
        assert best is not None
        assert best.value == "b@test.com"

    def test_has_cross_source_confirmation(self):
        collection = EvidenceCollection()
        collection.add(Evidence(
            field_name="phone",
            value="+1234",
            source="google_places",
            confidence=0.9,
        ))
        collection.add(Evidence(
            field_name="phone",
            value="+1234",
            source="official_website",
            confidence=0.85,
        ))
        assert collection.has_cross_source_confirmation("phone") is True

    def test_no_cross_source(self):
        collection = EvidenceCollection()
        collection.add(Evidence(
            field_name="phone",
            value="+1234",
            source="google_places",
            confidence=0.9,
        ))
        assert collection.has_cross_source_confirmation("phone") is False


class TestWebsiteIdentityVerification:
    @pytest.mark.asyncio
    async def test_identity_verification_name_match(self):
        class MockCrawler:
            async def crawl_page(self, url):
                return CrawledPage(
                    url=url,
                    title="Example Corp",
                    text_content="Welcome to Example Corp",
                )
            async def close(self):
                pass

        service = WebsiteIntelligenceService(MockCrawler())
        website_data = WebsiteData(
            domain="example.com",
            company_name="Example Corp",
        )
        result = service.verify_website_identity(
            website_data, candidate_name="Example Corporation"
        )
        assert result["name_match"] is True

    @pytest.mark.asyncio
    async def test_identity_verification_no_match(self):
        class MockCrawler:
            async def crawl_page(self, url):
                return CrawledPage(url=url)
            async def close(self):
                pass

        service = WebsiteIntelligenceService(MockCrawler())
        website_data = WebsiteData(
            domain="example.com",
            company_name="Different Company",
        )
        result = service.verify_website_identity(
            website_data, candidate_name="Example Corp"
        )
        assert result["name_match"] is False
        assert result["identity_score"] == 0.0


class TestWebsiteIntelligenceService:
    @pytest.mark.asyncio
    async def test_analyze_website(self):
        class MockCrawler:
            async def crawl_page(self, url):
                return CrawledPage(
                    url=url,
                    title="Test | Example",
                    emails=["info@example.com"],
                    phones=["+1234567890"],
                    links=["https://example.com/contact"],
                    json_ld=[{"@type": "Organization", "name": "Example"}],
                )
            async def close(self):
                pass

        service = WebsiteIntelligenceService(MockCrawler())
        data = await service.analyze_website("example.com")
        assert data.domain == "example.com"
        assert data.company_name == "Example"
        assert "info@example.com" in data.emails_found

    @pytest.mark.asyncio
    async def test_build_evidence(self):
        class MockCrawler:
            async def crawl_page(self, url):
                return CrawledPage(url=url)
            async def close(self):
                pass

        service = WebsiteIntelligenceService(MockCrawler())
        website_data = WebsiteData(
            domain="example.com",
            company_name="Example Corp",
            emails_found=["info@example.com"],
            phones_found=["+1234567890"],
        )
        evidence = service.build_evidence(website_data, "google_places")
        assert len(evidence.items) >= 3
        name_evidence = evidence.get_best_by_field("company_name")
        assert name_evidence is not None
        assert name_evidence.value == "Example Corp"
