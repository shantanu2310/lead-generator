from pydantic import BaseModel, Field

from app.core.constants import MAX_LEADS, MINIMUM_LEAD_SCORE
from app.core.logging import get_logger
from app.models.evidence import EvidenceCollection
from app.pipeline.scoring import LeadScore
from app.providers.base.business_provider import CandidateLead

logger = get_logger()


class SelectedLead(BaseModel):
    business_name: str
    website: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    confidence_score: int = Field(ge=0, le=100)
    relevance_reason: str | None = None
    verification: dict = Field(default_factory=dict)


class SelectionResult(BaseModel):
    query: str
    candidates_checked: int
    qualified_leads_found: int
    requested_max_leads: int
    leads: list[SelectedLead]


class SelectionService:
    def __init__(self, max_leads: int = MAX_LEADS, minimum_score: int = MINIMUM_LEAD_SCORE) -> None:
        self.max_leads = max_leads
        self.minimum_score = minimum_score

    def select_leads(
        self,
        scored_candidates: list[tuple[CandidateLead, LeadScore, EvidenceCollection, str | None]],
        query: str,
        requested_max: int | None = None,
    ) -> SelectionResult:
        max_leads = min(requested_max or self.max_leads, self.max_leads)

        qualified = []
        for candidate, score, evidence, reason in scored_candidates:
            if not score.passes_threshold:
                continue
            if candidate.business_status == "closed_permanently":
                continue

            lead = self._build_lead(candidate, score, evidence, reason)
            qualified.append((lead, score.total_score))

        qualified.sort(key=lambda x: x[1], reverse=True)
        selected = [lead for lead, _ in qualified[:max_leads]]

        logger.info(
            "leads_selected",
            candidates_checked=len(scored_candidates),
            qualified_leads=len(qualified),
            selected=len(selected),
        )

        return SelectionResult(
            query=query,
            candidates_checked=len(scored_candidates),
            qualified_leads_found=len(qualified),
            requested_max_leads=max_leads,
            leads=selected,
        )

    def _build_lead(
        self,
        candidate: CandidateLead,
        score: LeadScore,
        evidence: EvidenceCollection,
        reason: str | None,
    ) -> SelectedLead:
        email_evidence = evidence.get_best_by_field("email")
        phone_evidence = evidence.get_best_by_field("phone")
        website_evidence = evidence.get_best_by_field("website")
        address_evidence = evidence.get_best_by_field("address")

        return SelectedLead(
            business_name=candidate.name,
            website=website_evidence.value if website_evidence else candidate.website,
            email=email_evidence.value if email_evidence else candidate.email,
            phone=phone_evidence.value if phone_evidence else candidate.phone,
            address=address_evidence.value if address_evidence else candidate.address,
            latitude=candidate.latitude,
            longitude=candidate.longitude,
            confidence_score=score.total_score,
            relevance_reason=reason,
            verification={
                "business_active": score.signals.business_active,
                "website_identity_verified": score.signals.website_identity_verified,
                "email_verified": score.signals.email_verified,
                "phone_cross_verified": score.signals.phone_cross_verified,
                "location_match": score.signals.location_match,
            },
        )
