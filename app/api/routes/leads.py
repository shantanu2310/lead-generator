from fastapi import APIRouter, Depends, Query

from app.api.schemas.requests import ErrorResponse, LeadSearchRequest
from app.api.schemas.responses import LeadResponse, LeadSearchResponse, LeadVerification
from app.dependencies import get_orchestrator
from app.pipeline.orchestrator import PipelineOrchestrator

router = APIRouter()


@router.post(
    "/leads/search",
    response_model=LeadSearchResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def search_leads(
    request: LeadSearchRequest,
    orchestrator: PipelineOrchestrator = Depends(get_orchestrator),
) -> LeadSearchResponse:
    result = await orchestrator.run(
        query=request.query,
        latitude=request.latitude,
        longitude=request.longitude,
        max_leads=request.max_leads,
    )

    leads = []
    for lead in result.leads:
        leads.append(LeadResponse(
            business_name=lead.business_name,
            website=lead.website,
            email=lead.email,
            phone=lead.phone,
            address=lead.address,
            confidence_score=lead.confidence_score,
            relevance_reason=lead.relevance_reason,
            verification=LeadVerification(
                business_active=lead.verification.get("business_active", False),
                website_identity_verified=lead.verification.get(
                    "website_identity_verified", False
                ),
                email_verified=lead.verification.get("email_verified", False),
                phone_cross_verified=lead.verification.get(
                    "phone_cross_verified", False
                ),
                location_match=lead.verification.get("location_match", False),
            ),
        ))

    return LeadSearchResponse(
        query=result.query,
        candidates_checked=result.candidates_checked,
        qualified_leads_found=result.qualified_leads_found,
        requested_max_leads=result.requested_max_leads,
        leads=leads,
    )
