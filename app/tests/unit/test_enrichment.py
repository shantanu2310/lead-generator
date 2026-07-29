import pytest

from app.providers.base.crawler_provider import CrawledPage, WebsiteData
from app.providers.base.email_provider import EmailDiscoveryProvider, EmailResult
from app.providers.base.schemas import PhoneVerificationResult
from app.services.enrichment_service import EmailEnrichmentService
from app.services.verification_service import (
    EmailVerificationService,
    PhoneVerificationService,
)


class MockEmailProvider(EmailDiscoveryProvider):
    def __init__(self, emails=None):
        self._emails = emails or []
        self.discover_count = 0
        self.verify_count = 0

    async def discover_emails(self, domain: str) -> list[EmailResult]:
        self.discover_count += 1
        return self._emails

    async def verify_email(self, email: str) -> EmailResult:
        self.verify_count += 1
        for e in self._emails:
            if e.email == email:
                return e
        return EmailResult(email=email, status="unknown", confidence=0.0, source="mock")

    async def close(self):
        pass


class TestEmailEnrichmentService:
    @pytest.mark.asyncio
    async def test_discover_from_website_first(self):
        provider = MockEmailProvider([])
        service = EmailEnrichmentService([provider])
        website_data = WebsiteData(
            domain="example.com",
            emails_found=["info@example.com", "sales@example.com"],
            homepage=CrawledPage(url="https://example.com"),
        )

        results, evidence = await service.discover_emails("example.com", website_data)
        assert len(results) == 2
        assert results[0].email == "info@example.com"
        assert provider.discover_count == 0

    @pytest.mark.asyncio
    async def test_fallback_to_provider(self):
        provider = MockEmailProvider([
            EmailResult(email="contact@biz.com", status="valid", confidence=0.8, source="hunter"),
        ])
        service = EmailEnrichmentService([provider])

        results, evidence = await service.discover_emails("biz.com")
        assert len(results) == 1
        assert results[0].email == "contact@biz.com"
        assert provider.discover_count == 1

    @pytest.mark.asyncio
    async def test_waterfall_stops_on_high_confidence(self):
        provider1 = MockEmailProvider([
            EmailResult(email="a@test.com", status="valid", confidence=0.9, source="hunter"),
        ])
        provider2 = MockEmailProvider([
            EmailResult(email="b@test.com", status="valid", confidence=0.85, source="other"),
        ])
        service = EmailEnrichmentService([provider1, provider2])

        results, _ = await service.discover_emails("test.com")
        assert len(results) == 1
        assert provider2.discover_count == 0

    @pytest.mark.asyncio
    async def test_waterfall_continues_on_low_confidence(self):
        provider1 = MockEmailProvider([
            EmailResult(email="a@test.com", status="risky", confidence=0.4, source="hunter"),
        ])
        provider2 = MockEmailProvider([
            EmailResult(email="b@test.com", status="valid", confidence=0.9, source="other"),
        ])
        service = EmailEnrichmentService([provider1, provider2])

        results, _ = await service.discover_emails("test.com")
        assert len(results) == 2

    @pytest.mark.asyncio
    async def test_no_emails_found(self):
        provider = MockEmailProvider([])
        service = EmailEnrichmentService([provider])

        results, evidence = await service.discover_emails("empty.com")
        assert len(results) == 0
        assert len(evidence.items) == 0


class TestEmailVerificationService:
    @pytest.mark.asyncio
    async def test_valid_email(self):
        provider = MockEmailProvider([
            EmailResult(email="test@example.com", status="valid", confidence=0.95, source="hunter"),
        ])
        service = EmailVerificationService([provider])

        result = await service.verify_email("test@example.com", "example.com")
        assert result.status == "valid"
        assert result.is_business_email is True

    @pytest.mark.asyncio
    async def test_invalid_format(self):
        service = EmailVerificationService([])
        result = await service.verify_email("not-an-email")
        assert result.status == "invalid"
        assert result.confidence == 0.0

    @pytest.mark.asyncio
    async def test_free_email_not_business(self):
        provider = MockEmailProvider([
            EmailResult(email="test@gmail.com", status="valid", confidence=0.9, source="hunter"),
        ])
        service = EmailVerificationService([provider])

        result = await service.verify_email("test@gmail.com", "example.com")
        assert result.is_business_email is False

    @pytest.mark.asyncio
    async def test_build_evidence(self):
        service = EmailVerificationService([])
        email_result = EmailResult(
            email="test@example.com",
            status="valid",
            confidence=0.9,
            source="hunter",
        )
        evidence = service.build_verification_evidence(email_result)
        assert evidence.field_name == "email"
        assert evidence.value == "test@example.com"
        assert evidence.confidence == 0.95


class TestPhoneVerificationService:
    def test_valid_phone(self):
        service = PhoneVerificationService()
        result = service.verify_phone("+31201234567")
        assert result.is_valid is True
        assert result.normalized_phone == "+31201234567"
        assert result.confidence > 0

    def test_invalid_phone(self):
        service = PhoneVerificationService()
        result = service.verify_phone("not-a-phone")
        assert result.is_valid is False
        assert result.normalized_phone is None

    def test_cross_verification(self):
        service = PhoneVerificationService()
        result = service.verify_phone("+31201234567", source_phone="+31201234567")
        assert result.is_valid is True
        assert result.confidence >= 0.9

    def test_build_evidence(self):
        service = PhoneVerificationService()
        phone_result = PhoneVerificationResult(
            phone="+31201234567",
            normalized_phone="+31201234567",
            is_valid=True,
            confidence=0.9,
            verification_source="phonenumbers_lib",
        )
        evidence = service.build_verification_evidence(phone_result)
        assert evidence.field_name == "phone"
        assert evidence.value == "+31201234567"
        assert evidence.confidence == 0.9

    def test_empty_phone(self):
        service = PhoneVerificationService()
        result = service.verify_phone("")
        assert result.is_valid is False
