from app.agents.intent_parser import INTENT_PARSING_PROMPT, SearchIntent
from app.agents.relevance_classifier import RELEVANCE_PROMPT, RelevanceResult
from app.agents.search_planner import SEARCH_PLANNING_PROMPT, SearchPlan
from app.core.constants import LocationMode
from app.core.exceptions import IntentParsingError, LocationRequiredError
from app.core.logging import get_logger
from app.providers.base.llm_provider import LLMClient

logger = get_logger()


class IntentService:
    def __init__(self, llm_client: LLMClient) -> None:
        self.llm = llm_client

    async def parse_intent(self, query: str) -> SearchIntent:
        messages = [
            {"role": "system", "content": INTENT_PARSING_PROMPT},
            {"role": "user", "content": query},
        ]

        try:
            intent = await self.llm.complete_structured(
                messages=messages, response_model=SearchIntent, temperature=0.0
            )
        except Exception as e:
            logger.error("intent_parsing_failed", error=str(e))
            raise IntentParsingError(str(e)) from e

        logger.info(
            "intent_parsed",
            entity_type=intent.entity_type,
            category=intent.category,
            location_mode=intent.location_mode,
        )
        return intent

    def validate_location(
        self,
        intent: SearchIntent,
        latitude: float | None,
        longitude: float | None,
    ) -> None:
        if intent.location_mode == LocationMode.USER_LOCATION:
            if latitude is None or longitude is None:
                raise LocationRequiredError()

    async def plan_search(self, intent: SearchIntent) -> SearchPlan:
        intent_json = intent.model_dump_json()
        messages = [
            {"role": "system", "content": SEARCH_PLANNING_PROMPT},
            {"role": "user", "content": f"Intent: {intent_json}"},
        ]

        try:
            plan = await self.llm.complete_structured(
                messages=messages, response_model=SearchPlan, temperature=0.0
            )
        except Exception as e:
            logger.error("search_planning_failed", error=str(e))
            raise IntentParsingError(f"Search planning failed: {e}") from e

        logger.info(
            "search_planned",
            primary_source=plan.primary_source,
            candidate_target=plan.candidate_target,
            requires_location=plan.requires_location,
        )
        return plan

    async def classify_relevance(
        self, business_info: str, intent_description: str
    ) -> RelevanceResult:
        messages = [
            {"role": "system", "content": RELEVANCE_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Business: {business_info}\n\n"
                    f"Search Intent: {intent_description}"
                ),
            },
        ]

        try:
            result = await self.llm.complete_structured(
                messages=messages, response_model=RelevanceResult, temperature=0.0
            )
        except Exception as e:
            logger.error("relevance_classification_failed", error=str(e))
            return RelevanceResult(
                matches_intent=False,
                relevance_score=0,
                reason=f"Classification failed: {e}",
            )

        logger.info(
            "relevance_classified",
            matches_intent=result.matches_intent,
            score=result.relevance_score,
        )
        return result
