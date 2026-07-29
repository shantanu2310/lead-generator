import pytest

from app.agents.intent_parser import SearchIntent
from app.agents.search_planner import SearchPlan
from app.core.constants import EntityType, LocationMode
from app.core.exceptions import IntentParsingError, LocationRequiredError
from app.services.intent_service import IntentService


class MockLLMClient:
    def __init__(self, response=None):
        self._response = response
        self.call_count = 0
        self.last_messages = None

    async def complete_structured(
        self, messages, response_model, temperature=0.0, max_tokens=1000
    ):
        self.call_count += 1
        self.last_messages = messages
        if self._response:
            return self._response
        return response_model.model_validate(
            {"matches_intent": True, "relevance_score": 80, "reason": "test"}
        )

    async def complete(self, messages, temperature=0.0, max_tokens=1000):
        self.call_count += 1
        self.last_messages = messages
        return '{"test": "response"}'


class TestSearchIntentModel:
    def test_valid_intent_local_business(self):
        intent = SearchIntent(
            entity_type=EntityType.LOCAL_BUSINESS,
            category="florist",
            location="Amsterdam",
            location_mode=LocationMode.EXPLICIT,
            keywords=["florist", "flowers"],
        )
        assert intent.entity_type == EntityType.LOCAL_BUSINESS
        assert intent.category == "florist"
        assert intent.location == "Amsterdam"
        assert intent.location_mode == LocationMode.EXPLICIT

    def test_valid_intent_user_location(self):
        intent = SearchIntent(
            entity_type=EntityType.LOCAL_BUSINESS,
            category="dentist",
            location_mode=LocationMode.USER_LOCATION,
            keywords=["dentist"],
        )
        assert intent.location_mode == LocationMode.USER_LOCATION
        assert intent.location is None

    def test_default_target_count(self):
        intent = SearchIntent(
            entity_type=EntityType.COMPANY,
            category="SaaS",
            location_mode=LocationMode.NONE,
        )
        assert intent.target_count == 15

    def test_custom_target_count(self):
        intent = SearchIntent(
            entity_type=EntityType.COMPANY,
            category="SaaS",
            location_mode=LocationMode.NONE,
            target_count=10,
        )
        assert intent.target_count == 10

    def test_invalid_target_count_too_high(self):
        with pytest.raises(Exception):
            SearchIntent(
                entity_type=EntityType.COMPANY,
                category="SaaS",
                location_mode=LocationMode.NONE,
                target_count=20,
            )

    def test_empty_keywords(self):
        intent = SearchIntent(
            entity_type=EntityType.COMPANY,
            category="agency",
            location_mode=LocationMode.NONE,
        )
        assert intent.keywords == []

    def test_required_contact_fields(self):
        intent = SearchIntent(
            entity_type=EntityType.COMPANY,
            category="agency",
            location_mode=LocationMode.NONE,
            required_contact_fields=["email", "phone"],
        )
        assert "email" in intent.required_contact_fields
        assert "phone" in intent.required_contact_fields


class TestSearchPlanModel:
    def test_valid_plan(self):
        plan = SearchPlan(
            primary_source="google_places",
            secondary_source="web_search",
            candidate_target=50,
            requires_location=True,
            requires_website_analysis=True,
            search_queries=["florist Amsterdam", "flower shop Amsterdam"],
        )
        assert plan.primary_source == "google_places"
        assert plan.candidate_target == 50
        assert len(plan.search_queries) == 2

    def test_default_candidate_target(self):
        plan = SearchPlan(
            primary_source="web_search",
            search_queries=["SaaS companies"],
        )
        assert plan.candidate_target == 50

    def test_minimal_plan(self):
        plan = SearchPlan(primary_source="google_places")
        assert plan.secondary_source is None
        assert plan.requires_location is False
        assert plan.search_queries == []


class TestLocationValidation:
    @pytest.mark.asyncio
    async def test_user_location_with_coordinates(self):
        mock_llm = MockLLMClient()
        service = IntentService(mock_llm)
        intent = SearchIntent(
            entity_type=EntityType.LOCAL_BUSINESS,
            category="florist",
            location_mode=LocationMode.USER_LOCATION,
        )
        service.validate_location(intent, latitude=52.3676, longitude=4.9041)

    @pytest.mark.asyncio
    async def test_user_location_without_coordinates_raises(self):
        mock_llm = MockLLMClient()
        service = IntentService(mock_llm)
        intent = SearchIntent(
            entity_type=EntityType.LOCAL_BUSINESS,
            category="florist",
            location_mode=LocationMode.USER_LOCATION,
        )
        with pytest.raises(LocationRequiredError):
            service.validate_location(intent, latitude=None, longitude=None)

    @pytest.mark.asyncio
    async def test_explicit_location_no_coordinates_ok(self):
        mock_llm = MockLLMClient()
        service = IntentService(mock_llm)
        intent = SearchIntent(
            entity_type=EntityType.LOCAL_BUSINESS,
            category="florist",
            location="Amsterdam",
            location_mode=LocationMode.EXPLICIT,
        )
        service.validate_location(intent, latitude=None, longitude=None)

    @pytest.mark.asyncio
    async def test_no_location_no_coordinates_ok(self):
        mock_llm = MockLLMClient()
        service = IntentService(mock_llm)
        intent = SearchIntent(
            entity_type=EntityType.COMPANY,
            category="SaaS",
            location_mode=LocationMode.NONE,
        )
        service.validate_location(intent, latitude=None, longitude=None)


class TestIntentService:
    @pytest.mark.asyncio
    async def test_parse_intent_success(self):
        mock_llm = MockLLMClient(
            response=SearchIntent(
                entity_type=EntityType.LOCAL_BUSINESS,
                category="florist",
                location="Amsterdam",
                location_mode=LocationMode.EXPLICIT,
                keywords=["florist"],
            )
        )
        service = IntentService(mock_llm)
        intent = await service.parse_intent("florist in Amsterdam")
        assert intent.entity_type == EntityType.LOCAL_BUSINESS
        assert intent.category == "florist"
        assert mock_llm.call_count == 1

    @pytest.mark.asyncio
    async def test_parse_intent_failure(self):
        class FailingLLM:
            async def complete_structured(self, **kwargs):
                raise Exception("LLM failed")

            async def complete(self, **kwargs):
                raise Exception("LLM failed")

        service = IntentService(FailingLLM())
        with pytest.raises(IntentParsingError):
            await service.parse_intent("test query")

    @pytest.mark.asyncio
    async def test_plan_search_success(self):
        mock_llm = MockLLMClient(
            response=SearchPlan(
                primary_source="google_places",
                secondary_source="web_search",
                candidate_target=50,
                requires_location=True,
                search_queries=["florist Amsterdam"],
            )
        )
        service = IntentService(mock_llm)
        intent = SearchIntent(
            entity_type=EntityType.LOCAL_BUSINESS,
            category="florist",
            location="Amsterdam",
            location_mode=LocationMode.EXPLICIT,
        )
        plan = await service.plan_search(intent)
        assert plan.primary_source == "google_places"
        assert plan.candidate_target == 50
