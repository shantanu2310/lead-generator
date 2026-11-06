from app.agents.intent_parser import INTENT_PARSING_PROMPT, SearchIntent
from app.agents.relevance_classifier import RELEVANCE_PROMPT, RelevanceResult
from app.agents.search_planner import SEARCH_PLANNING_PROMPT, SearchPlan
from app.core.constants import LocationMode
from app.core.exceptions import IntentParsingError, LocationRequiredError
from app.core.logging import get_logger
from app.providers.base.llm_provider import LLMClient

logger = get_logger()


def derive_seniority_levels(*titles: str | None) -> list[str]:
    """Senior words in the query -> graph8 seniority_level filter values.

    Only values verified live against graph8 are used; an unrecognized value
    makes graph8 silently return 0 rows, so unknown tiers (VP, chief) map to
    no filter at all.
    """
    text = " ".join(t for t in titles if t).lower()
    if "director" in text:
        return ["Director"]
    if any(w in text for w in ("manager", "head", "lead")):
        return ["Manager"]
    return []


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

    async def plan_search(
        self, intent: SearchIntent, mode: str = "company"
    ) -> SearchPlan:
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

        # Mode decides the source chain in code (never LLM-dependent):
        # company -> Google Places first (graph8 fallback is added by discovery
        # when Places returns 0); person -> strictly graph8 people, no
        # secondary source so company-only rows can never enter person results.
        update: dict = {
            "category": intent.category,
            "location": intent.location,
            "job_title": intent.job_title,
            "job_title_variants": intent.job_title_variants,
            "seniority_levels": derive_seniority_levels(
                intent.job_title, *intent.job_title_variants
            ),
        }
        if mode == "person":
            update["primary_source"] = "graph8_people"
            update["secondary_source"] = None
        else:
            update["primary_source"] = "google_places"
        plan = plan.model_copy(update=update)

        logger.info(
            "search_planned",
            mode=mode,
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
