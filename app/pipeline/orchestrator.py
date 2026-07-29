from app.core.logging import get_logger
from app.models.evidence import EvidenceCollection
from app.pipeline.cross_validation import CrossValidationService
from app.pipeline.deduplication import deduplicate_candidates
from app.pipeline.discovery import DiscoveryService
from app.pipeline.normalization import normalize_candidates
from app.pipeline.scoring import ScoringService
from app.pipeline.selection import SelectionResult, SelectionService
from app.services.enrichment_service import EmailEnrichmentService
from app.services.intent_service import IntentService
from app.services.verification_service import EmailVerificationService, PhoneVerificationService
from app.services.website_service import WebsiteIntelligenceService

logger = get_logger()


class PipelineOrchestrator:
    def __init__(
        self,
        intent_service: IntentService,
        discovery_service: DiscoveryService,
        website_service: WebsiteIntelligenceService,
        email_enrichment: EmailEnrichmentService,
        email_verification: EmailVerificationService,
        phone_verification: PhoneVerificationService,
        cross_validation: CrossValidationService,
        scoring_service: ScoringService,
        selection_service: SelectionService,
    ) -> None:
        self.intent_service = intent_service
        self.discovery_service = discovery_service
        self.website_service = website_service
        self.email_enrichment = email_enrichment
        self.email_verification = email_verification
        self.phone_verification = phone_verification
        self.cross_validation = cross_validation
        self.scoring_service = scoring_service
        self.selection_service = selection_service

    async def run(
        self,
        query: str,
        latitude: float | None = None,
        longitude: float | None = None,
        max_leads: int = 15,
    ) -> SelectionResult:
        logger.info("pipeline_started", query=query)

        intent = await self.intent_service.parse_intent(query)
        logger.info(
            "intent_parsed",
            entity_type=intent.entity_type,
            category=intent.category,
            location_mode=intent.location_mode.value,
            location=intent.location,
        )

        self.intent_service.validate_location(intent, latitude, longitude)
        plan = await self.intent_service.plan_search(intent)

        logger.info(
            "plan_created",
            primary_source=plan.primary_source,
            secondary_source=plan.secondary_source,
            candidate_target=plan.candidate_target,
            requires_location=plan.requires_location,
            requires_website_analysis=plan.requires_website_analysis,
            requires_email_enrichment=plan.requires_email_enrichment,
            search_queries=plan.search_queries,
        )

        candidates = await self.discovery_service.discover(
            plan=plan,
            latitude=latitude,
            longitude=longitude,
        )
        logger.info("candidates_discovered", count=len(candidates))

        if candidates:
            for i, c in enumerate(candidates[:3]):
                logger.info(
                    f"candidate_sample_{i}",
                    name=c.name,
                    domain=c.normalized_domain,
                    website=c.website,
                    phone=c.phone,
                    category=c.category,
                )

        candidates = normalize_candidates(candidates)
        candidates = deduplicate_candidates(candidates)
        logger.info("after_dedup", count=len(candidates))

        scored_candidates = []
        for candidate in candidates:
            if candidate.business_status == "closed_permanently":
                continue

            evidence = EvidenceCollection()
            website_data = None

            if candidate.normalized_domain and plan.requires_website_analysis:
                try:
                    website_data = await self.website_service.analyze_website(
                        candidate.normalized_domain
                    )
                    website_evidence = self.website_service.build_evidence(
                        website_data, candidate.source
                    )
                    for item in website_evidence.items:
                        evidence.add(item)
                    logger.info(
                        "website_analysis_done",
                        domain=candidate.normalized_domain,
                        emails_found=len(website_data.emails_found) if website_data else 0,
                        phones_found=len(website_data.phones_found) if website_data else 0,
                        evidence_count=len(evidence.items),
                    )
                except Exception as e:
                    logger.warning(
                        "website_analysis_failed",
                        domain=candidate.normalized_domain,
                        error=str(e),
                    )

            if plan.requires_email_enrichment and candidate.normalized_domain:
                try:
                    emails, email_evidence = await self.email_enrichment.discover_emails(
                        domain=candidate.normalized_domain,
                        website_data=website_data,
                    )
                    for item in email_evidence.items:
                        evidence.add(item)

                    for email_result in emails:
                        verified = await self.email_verification.verify_email(
                            email_result.email,
                            domain=candidate.normalized_domain,
                        )
                        verification_evidence = (
                            self.email_verification.build_verification_evidence(verified)
                        )
                        evidence.add(verification_evidence)
                except Exception as e:
                    logger.warning(
                        "email_enrichment_failed",
                        domain=candidate.normalized_domain,
                        error=str(e),
                    )

            if plan.requires_phone_enrichment and candidate.phone:
                try:
                    phone_result = self.phone_verification.verify_phone(
                        candidate.phone
                    )
                    phone_evidence = self.phone_verification.build_verification_evidence(
                        phone_result
                    )
                    evidence.add(phone_evidence)
                except Exception as e:
                    logger.warning(
                        "phone_verification_failed",
                        phone=candidate.phone,
                        error=str(e),
                    )

            cross_result = self.cross_validation.validate(
                evidence=evidence,
                candidate_name=candidate.name,
                candidate_phone=candidate.phone,
                candidate_address=candidate.address,
                candidate_domain=candidate.normalized_domain,
            )

            score = self.scoring_service.score_candidate(
                candidate_name=candidate.name,
                candidate_category=candidate.category,
                intent_category=intent.category,
                business_status=candidate.business_status,
                cross_validation=cross_result,
                evidence=evidence,
                domain=candidate.normalized_domain,
                intent_requires_location=intent.location_mode.value == "user_location",
                candidate_latitude=candidate.latitude,
                candidate_longitude=candidate.longitude,
            )

            if score.total_score >= 30:
                logger.info(
                    "candidate_scored",
                    name=candidate.name,
                    score=score.total_score,
                    passes=score.passes_threshold,
                    signals=score.signals.model_dump(),
                )

            scored_candidates.append((candidate, score, evidence, intent.category))

        result = self.selection_service.select_leads(
            scored_candidates=scored_candidates,
            query=query,
            requested_max=max_leads,
        )

        logger.info(
            "pipeline_complete",
            candidates_discovered=len(candidates),
            leads_scored=len(scored_candidates),
            leads_returned=len(result.leads),
            qualified_leads_found=result.qualified_leads_found,
        )

        return result
