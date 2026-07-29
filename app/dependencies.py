from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db_session


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db_session():
        yield session


def get_orchestrator():
    from app.pipeline.cross_validation import CrossValidationService
    from app.pipeline.discovery import DiscoveryService
    from app.pipeline.orchestrator import PipelineOrchestrator
    from app.pipeline.scoring import ScoringService
    from app.pipeline.selection import SelectionService
    from app.providers.brave.provider import BraveSearchProvider
    from app.providers.crawling.crawl4ai_provider import Crawl4AIProvider
    from app.providers.google_places.provider import GooglePlacesProvider
    from app.providers.hunter.provider import HunterProvider
    from app.providers.openai.client import get_llm_client
    from app.services.enrichment_service import EmailEnrichmentService
    from app.services.intent_service import IntentService
    from app.services.verification_service import (
        EmailVerificationService,
        PhoneVerificationService,
    )
    from app.services.website_service import WebsiteIntelligenceService

    llm_client = get_llm_client()
    intent_service = IntentService(llm_client)

    google_places = GooglePlacesProvider()
    brave_search = BraveSearchProvider()
    discovery_service = DiscoveryService({
        "google_places": google_places,
        "brave_search": brave_search,
    })

    crawl4ai = Crawl4AIProvider()
    website_service = WebsiteIntelligenceService(crawl4ai)

    hunter = HunterProvider()
    email_enrichment = EmailEnrichmentService([hunter])
    email_verification = EmailVerificationService([hunter])
    phone_verification = PhoneVerificationService()

    cross_validation = CrossValidationService()
    scoring_service = ScoringService()
    selection_service = SelectionService()

    return PipelineOrchestrator(
        intent_service=intent_service,
        discovery_service=discovery_service,
        website_service=website_service,
        email_enrichment=email_enrichment,
        email_verification=email_verification,
        phone_verification=phone_verification,
        cross_validation=cross_validation,
        scoring_service=scoring_service,
        selection_service=selection_service,
    )
