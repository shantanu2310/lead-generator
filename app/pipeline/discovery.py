
from app.agents.search_planner import SearchPlan
from app.core.logging import get_logger
from app.providers.base.business_provider import BusinessDiscoveryProvider, CandidateLead

logger = get_logger()


class DiscoveryService:
    def __init__(self, providers: dict[str, BusinessDiscoveryProvider]) -> None:
        self.providers = providers

    async def discover(
        self,
        plan: SearchPlan,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> list[CandidateLead]:
        all_candidates = []

        primary_provider = self.providers.get(plan.primary_source)
        if primary_provider:
            candidates = await primary_provider.search(
                plan=plan,
                latitude=latitude if plan.requires_location else None,
                longitude=longitude if plan.requires_location else None,
            )
            all_candidates.extend(candidates)
            logger.info(
                "primary_discovery_complete",
                source=plan.primary_source,
                count=len(candidates),
            )

        if plan.secondary_source and len(all_candidates) < plan.candidate_target:
            secondary_provider = self.providers.get(plan.secondary_source)
            if secondary_provider:
                remaining = plan.candidate_target - len(all_candidates)
                secondary_plan = plan.model_copy(
                    update={"candidate_target": remaining}
                )
                candidates = await secondary_provider.search(
                    plan=secondary_plan,
                    latitude=latitude if plan.requires_location else None,
                    longitude=longitude if plan.requires_location else None,
                )
                all_candidates.extend(candidates)
                logger.info(
                    "secondary_discovery_complete",
                    source=plan.secondary_source,
                    count=len(candidates),
                )

        logger.info(
            "discovery_complete",
            total_candidates=len(all_candidates),
        )
        return all_candidates
