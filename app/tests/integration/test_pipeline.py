
import pytest

from app.agents.intent_parser import SearchIntent
from app.agents.search_planner import SearchPlan
from app.core.constants import EntityType, LocationMode
from app.models.evidence import Evidence, EvidenceCollection
from app.pipeline.cross_validation import CrossValidationService
from app.pipeline.orchestrator import PipelineOrchestrator
from app.pipeline.scoring import ScoringService
from app.pipeline.selection import SelectionService
from app.providers.base.business_provider import CandidateLead
from app.providers.base.crawler_provider import CrawledPage, WebsiteData
from app.providers.base.email_provider import EmailResult


class MockIntentService:
    async def parse_intent(self, query):
        return SearchIntent(
            entity_type=EntityType.LOCAL_BUSINESS,
            category="florist",
            location="Amsterdam",
            location_mode=LocationMode.EXPLICIT,
            keywords=["florist"],
        )

    def validate_location(self, intent, latitude, longitude):
        pass

    async def plan_search(self, intent):
        return SearchPlan(
            primary_source="google_places",
            secondary_source="brave_search",
            candidate_target=50,
            requires_location=True,
            requires_website_analysis=True,
            requires_email_enrichment=True,
            requires_phone_enrichment=True,
            search_queries=["florist Amsterdam"],
        )


class MockDiscoveryService:
    async def discover(self, plan, latitude=None, longitude=None):
        return [
            CandidateLead(
                name="Bloom Flowers",
                normalized_name="bloom flowers",
                source="google_places",
                source_id="place_123",
                website="https://bloomflowers.nl",
                normalized_domain="bloomflowers.nl",
                phone="+31201234567",
                normalized_phone="+31201234567",
                address="123 Flower St, Amsterdam",
                latitude=52.3676,
                longitude=4.9041,
                category="florist",
                business_status="active",
            ),
            CandidateLead(
                name="Tulip Garden",
                normalized_name="tulip garden",
                source="google_places",
                source_id="place_456",
                website="https://tulipgarden.nl",
                normalized_domain="tulipgarden.nl",
                phone="+31209876543",
                normalized_phone="+31209876543",
                address="456 Tulip Lane, Amsterdam",
                latitude=52.3700,
                longitude=4.9100,
                category="florist",
                business_status="active",
            ),
        ]


class MockWebsiteService:
    async def analyze_website(self, domain):
        return WebsiteData(
            domain=domain,
            company_name="Bloom Flowers",
            emails_found=["info@bloomflowers.nl"],
            phones_found=["+31201234567"],
            homepage=CrawledPage(url=f"https://{domain}"),
        )

    def build_evidence(self, website_data, source):
        evidence = EvidenceCollection()
        if website_data.company_name:
            evidence.add(Evidence(
                field_name="company_name",
                value=website_data.company_name,
                source="official_website",
                confidence=0.9,
            ))
        for email in website_data.emails_found:
            evidence.add(Evidence(
                field_name="email",
                value=email,
                source="official_website",
                confidence=0.85,
            ))
        for phone in website_data.phones_found:
            evidence.add(Evidence(
                field_name="phone",
                value=phone,
                source="official_website",
                confidence=0.8,
            ))
        return evidence

    def verify_website_identity(self, *args, **kwargs):
        return {"name_match": True, "identity_score": 0.8}


class MockEmailEnrichment:
    async def discover_emails(self, domain, website_data=None):
        evidence = EvidenceCollection()
        emails = []
        if website_data and website_data.emails_found:
            for email in website_data.emails_found:
                emails.append(EmailResult(
                    email=email,
                    status="valid",
                    confidence=0.85,
                    source="official_website",
                ))
                evidence.add(Evidence(
                    field_name="email",
                    value=email,
                    source="official_website",
                    confidence=0.85,
                ))
        return emails, evidence


class MockEmailVerification:
    async def verify_email(self, email, domain=None):
        return EmailResult(
            email=email,
            status="valid",
            confidence=0.95,
            source="mock",
            is_business_email=True,
        )

    def build_verification_evidence(self, email_result):
        return Evidence(
            field_name="email",
            value=email_result.email,
            source="verification_mock",
            confidence=0.95,
        )


class MockPhoneVerification:
    def verify_phone(self, phone, source_phone=None, default_country="US"):
        from app.providers.base.schemas import PhoneVerificationResult
        return PhoneVerificationResult(
            phone=phone,
            normalized_phone=phone,
            is_possible=True,
            is_valid=True,
            confidence=0.9,
            verification_source="mock",
        )

    def build_verification_evidence(self, phone_result):
        return Evidence(
            field_name="phone",
            value=phone_result.normalized_phone,
            source="phone_verification",
            confidence=0.9,
        )


class TestPipelineOrchestrator:
    @pytest.mark.asyncio
    async def test_full_pipeline_flow(self):
        orchestrator = PipelineOrchestrator(
            intent_service=MockIntentService(),
            discovery_service=MockDiscoveryService(),
            website_service=MockWebsiteService(),
            email_enrichment=MockEmailEnrichment(),
            email_verification=MockEmailVerification(),
            phone_verification=MockPhoneVerification(),
            cross_validation=CrossValidationService(),
            scoring_service=ScoringService(),
            selection_service=SelectionService(),
        )

        result = await orchestrator.run(
            query="florist in Amsterdam",
            latitude=52.3676,
            longitude=4.9041,
            max_leads=15,
        )

        assert result.query == "florist in Amsterdam"
        assert result.candidates_checked >= 0
        assert result.requested_max_leads == 15

    @pytest.mark.asyncio
    async def test_pipeline_returns_leads(self):
        orchestrator = PipelineOrchestrator(
            intent_service=MockIntentService(),
            discovery_service=MockDiscoveryService(),
            website_service=MockWebsiteService(),
            email_enrichment=MockEmailEnrichment(),
            email_verification=MockEmailVerification(),
            phone_verification=MockPhoneVerification(),
            cross_validation=CrossValidationService(),
            scoring_service=ScoringService(minimum_score=0),
            selection_service=SelectionService(),
        )

        result = await orchestrator.run(
            query="florist in Amsterdam",
            latitude=52.3676,
            longitude=4.9041,
        )

        assert len(result.leads) > 0
        lead = result.leads[0]
        assert lead.business_name is not None
        assert lead.confidence_score >= 0

    @pytest.mark.asyncio
    async def test_pipeline_empty_candidates(self):
        class EmptyDiscovery:
            async def discover(self, plan, latitude=None, longitude=None):
                return []

        orchestrator = PipelineOrchestrator(
            intent_service=MockIntentService(),
            discovery_service=EmptyDiscovery(),
            website_service=MockWebsiteService(),
            email_enrichment=MockEmailEnrichment(),
            email_verification=MockEmailVerification(),
            phone_verification=MockPhoneVerification(),
            cross_validation=CrossValidationService(),
            scoring_service=ScoringService(),
            selection_service=SelectionService(),
        )

        result = await orchestrator.run(query="nonexistent business XYZ")
        assert len(result.leads) == 0
