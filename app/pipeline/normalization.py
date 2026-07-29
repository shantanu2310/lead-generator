from app.core.logging import get_logger
from app.providers.base.business_provider import CandidateLead
from app.utils.domain import normalize_domain
from app.utils.email import normalize_email
from app.utils.phone import normalize_phone
from app.utils.text import normalize_company_name

logger = get_logger()


def normalize_candidate(candidate: CandidateLead) -> CandidateLead:
    candidate.normalized_name = normalize_company_name(candidate.name)
    candidate.normalized_domain = normalize_domain(candidate.website) if candidate.website else None
    candidate.normalized_email = normalize_email(candidate.email) if candidate.email else None
    candidate.normalized_phone = normalize_phone(candidate.phone) if candidate.phone else None
    return candidate


def normalize_candidates(candidates: list[CandidateLead]) -> list[CandidateLead]:
    normalized = [normalize_candidate(c) for c in candidates]
    logger.info("candidates_normalized", count=len(normalized))
    return normalized
