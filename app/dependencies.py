from collections.abc import AsyncGenerator

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_access_token
from app.database.session import get_db_session
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db_session():
        yield session


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = verify_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Your account is disabled. Contact an administrator.",
        )
    return user


async def get_current_admin(
    user: User = Depends(get_current_user),
) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


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


def get_pipeline_manager():
    from app.pipeline.pipeline_manager import PipelineManager

    return PipelineManager(orchestrator=get_orchestrator())


def get_automation_service():
    from app.services.automation_service import AutomationService

    return AutomationService(pipeline_manager=get_pipeline_manager())
