import pytest

from app.agents.search_planner import SearchPlan
from app.pipeline.deduplication import deduplicate_candidates
from app.pipeline.discovery import DiscoveryService
from app.pipeline.normalization import normalize_candidates
from app.providers.base.business_provider import CandidateLead


class TestCandidateLeadModel:
    def test_create_candidate(self):
        candidate = CandidateLead(
            name="Test Business",
            source="google_places",
            source_id="place_123",
        )
        assert candidate.name == "Test Business"
        assert candidate.source == "google_places"
        assert candidate.source_id == "place_123"

    def test_default_values(self):
        candidate = CandidateLead(name="Test", source="test")
        assert candidate.normalized_name == ""
        assert candidate.business_status == "unknown"
        assert candidate.website is None
        assert candidate.email is None

    def test_optional_fields(self):
        candidate = CandidateLead(
            name="Test",
            source="test",
            website="https://example.com",
            phone="+1234567890",
            email="test@example.com",
        )
        assert candidate.website == "https://example.com"
        assert candidate.phone == "+1234567890"
        assert candidate.email == "test@example.com"


class TestNormalization:
    def test_normalize_name(self):
        candidates = [
            CandidateLead(name="  Example Ltd  ", source="test"),
            CandidateLead(name="EXAMPLE B.V.", source="test"),
        ]
        normalized = normalize_candidates(candidates)
        assert normalized[0].normalized_name == "example"
        assert normalized[1].normalized_name == "example"

    def test_normalize_domain(self):
        candidates = [
            CandidateLead(
                name="Test",
                source="test",
                website="https://www.example.com/",
            ),
        ]
        normalized = normalize_candidates(candidates)
        assert normalized[0].normalized_domain == "example.com"

    def test_normalize_email(self):
        candidates = [
            CandidateLead(
                name="Test",
                source="test",
                email="  Test@Example.COM  ",
            ),
        ]
        normalized = normalize_candidates(candidates)
        assert normalized[0].normalized_email == "test@example.com"

    def test_normalize_phone(self):
        candidates = [
            CandidateLead(
                name="Test",
                source="test",
                phone="+31201234567",
            ),
        ]
        normalized = normalize_candidates(candidates)
        assert normalized[0].normalized_phone == "+31201234567"

    def test_normalize_empty_list(self):
        normalized = normalize_candidates([])
        assert normalized == []


class TestDeduplication:
    def test_exact_duplicate_source_id(self):
        candidates = [
            CandidateLead(name="Business A", source="google_places", source_id="123"),
            CandidateLead(name="Business B", source="google_places", source_id="123"),
        ]
        unique = deduplicate_candidates(candidates)
        assert len(unique) == 1
        assert unique[0].name == "Business A"

    def test_exact_duplicate_domain(self):
        candidates = [
            CandidateLead(
                name="Business A",
                source="google_places",
                normalized_domain="example.com",
            ),
            CandidateLead(
                name="Business B",
                source="brave_search",
                normalized_domain="example.com",
            ),
        ]
        unique = deduplicate_candidates(candidates)
        assert len(unique) == 1

    def test_exact_duplicate_phone(self):
        candidates = [
            CandidateLead(
                name="Business A",
                source="google_places",
                normalized_phone="+1234567890",
            ),
            CandidateLead(
                name="Business B",
                source="brave_search",
                normalized_phone="+1234567890",
            ),
        ]
        unique = deduplicate_candidates(candidates)
        assert len(unique) == 1

    def test_fuzzy_duplicate_same_name(self):
        candidates = [
            CandidateLead(
                name="Example Corp.",
                source="google_places",
                normalized_name="example corp.",
                address="123 Main St, Amsterdam",
            ),
            CandidateLead(
                name="Example Corp",
                source="brave_search",
                normalized_name="example corp",
                address="123 Main St, Amsterdam",
            ),
        ]
        unique = deduplicate_candidates(candidates)
        assert len(unique) == 1

    def test_different_businesses(self):
        candidates = [
            CandidateLead(
                name="Business A",
                source="google_places",
                normalized_name="business a",
                address="123 Main St",
            ),
            CandidateLead(
                name="Business B",
                source="google_places",
                normalized_name="business b",
                address="456 Oak Ave",
            ),
        ]
        unique = deduplicate_candidates(candidates)
        assert len(unique) == 2

    def test_different_domains_keep_both(self):
        candidates = [
            CandidateLead(
                name="Business A",
                source="google_places",
                normalized_domain="a.com",
            ),
            CandidateLead(
                name="Business A",
                source="brave_search",
                normalized_domain="b.com",
            ),
        ]
        unique = deduplicate_candidates(candidates)
        assert len(unique) == 2

    def test_empty_list(self):
        unique = deduplicate_candidates([])
        assert unique == []


class TestDiscoveryService:
    @pytest.mark.asyncio
    async def test_discover_with_primary_provider(self):
        class MockProvider:
            async def search(self, plan, latitude=None, longitude=None):
                return [
                    CandidateLead(name="Business 1", source="mock"),
                    CandidateLead(name="Business 2", source="mock"),
                ]

        service = DiscoveryService({"google_places": MockProvider()})
        plan = SearchPlan(
            primary_source="google_places",
            search_queries=["florist Amsterdam"],
        )
        candidates = await service.discover(plan)
        assert len(candidates) == 2

    @pytest.mark.asyncio
    async def test_discover_with_secondary_provider(self):
        class MockPrimaryProvider:
            async def search(self, plan, latitude=None, longitude=None):
                return [CandidateLead(name="Business 1", source="primary")]

        class MockSecondaryProvider:
            async def search(self, plan, latitude=None, longitude=None):
                return [CandidateLead(name="Business 2", source="secondary")]

        service = DiscoveryService({
            "primary": MockPrimaryProvider(),
            "secondary": MockSecondaryProvider(),
        })
        plan = SearchPlan(
            primary_source="primary",
            secondary_source="secondary",
            candidate_target=10,
            search_queries=["query"],
        )
        candidates = await service.discover(plan)
        assert len(candidates) == 2
