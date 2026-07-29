from pydantic import BaseModel, Field

from app.core.constants import (
    MINIMUM_LEAD_SCORE,
)
from app.core.logging import get_logger
from app.models.evidence import EvidenceCollection
from app.pipeline.cross_validation import CrossValidationResult
from app.utils.email import is_business_email
from app.utils.similarity import calculate_similarity

logger = get_logger()

SCORING_WEIGHTS = {
    "category_match": 25,
    "business_active": 15,
    "website_identity_verified": 15,
    "phone_cross_verified": 15,
    "email_verified": 15,
    "location_match": 10,
    "recent_business_signal": 5,
}


class LeadSignals(BaseModel):
    category_match: bool = False
    business_active: bool = False
    website_identity_verified: bool = False
    phone_cross_verified: bool = False
    email_verified: bool = False
    location_match: bool = False
    recent_business_signal: bool = False


class LeadScore(BaseModel):
    total_score: int = Field(ge=0, le=100)
    signals: LeadSignals
    passes_threshold: bool = False


class ScoringService:
    def __init__(self, minimum_score: int = MINIMUM_LEAD_SCORE) -> None:
        self.minimum_score = minimum_score

    def calculate_score(
        self,
        signals: LeadSignals,
    ) -> LeadScore:
        score = 0

        if signals.category_match:
            score += SCORING_WEIGHTS["category_match"]
        if signals.business_active:
            score += SCORING_WEIGHTS["business_active"]
        if signals.website_identity_verified:
            score += SCORING_WEIGHTS["website_identity_verified"]
        if signals.phone_cross_verified:
            score += SCORING_WEIGHTS["phone_cross_verified"]
        if signals.email_verified:
            score += SCORING_WEIGHTS["email_verified"]
        if signals.location_match:
            score += SCORING_WEIGHTS["location_match"]
        if signals.recent_business_signal:
            score += SCORING_WEIGHTS["recent_business_signal"]

        return LeadScore(
            total_score=score,
            signals=signals,
            passes_threshold=score >= self.minimum_score,
        )

    def evaluate_signals(
        self,
        candidate_name: str | None,
        candidate_category: str | None,
        intent_category: str | None,
        business_status: str,
        cross_validation: CrossValidationResult,
        evidence: EvidenceCollection,
        domain: str | None = None,
        intent_requires_location: bool = False,
        candidate_latitude: float | None = None,
        candidate_longitude: float | None = None,
    ) -> LeadSignals:
        signals = LeadSignals()

        if candidate_category and intent_category:
            cat_sim = calculate_similarity(
                candidate_category.lower(), intent_category.lower()
            )
            signals.category_match = cat_sim >= 0.5
        elif intent_category and not candidate_category:
            signals.category_match = False

        signals.business_active = business_status == "active"

        signals.website_identity_verified = (
            cross_validation.website_verified
            and cross_validation.name_verified
        )

        signals.phone_cross_verified = cross_validation.phone_verified

        email_evidence = evidence.get_by_field("email")
        valid_emails = []
        for e in email_evidence:
            if e.confidence < 0.7:
                continue
            if domain and not is_business_email(e.value, domain):
                continue
            valid_emails.append(e)
        signals.email_verified = len(valid_emails) > 0

        if intent_requires_location:
            signals.location_match = (
                candidate_latitude is not None and candidate_longitude is not None
            )
        else:
            signals.location_match = True

        signals.recent_business_signal = True

        return signals

    def score_candidate(
        self,
        candidate_name: str | None,
        candidate_category: str | None,
        intent_category: str | None,
        business_status: str,
        cross_validation: CrossValidationResult,
        evidence: EvidenceCollection,
        domain: str | None = None,
        intent_requires_location: bool = False,
        candidate_latitude: float | None = None,
        candidate_longitude: float | None = None,
    ) -> LeadScore:
        signals = self.evaluate_signals(
            candidate_name=candidate_name,
            candidate_category=candidate_category,
            intent_category=intent_category,
            business_status=business_status,
            cross_validation=cross_validation,
            evidence=evidence,
            domain=domain,
            intent_requires_location=intent_requires_location,
            candidate_latitude=candidate_latitude,
            candidate_longitude=candidate_longitude,
        )
        return self.calculate_score(signals)
