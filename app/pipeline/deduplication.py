from app.core.constants import (
    ADDRESS_SIMILARITY_THRESHOLD,
    NAME_SIMILARITY_THRESHOLD,
)
from app.core.logging import get_logger
from app.providers.base.business_provider import CandidateLead
from app.utils.similarity import calculate_similarity

logger = get_logger()


def _get_exact_key(candidate: CandidateLead) -> str | None:
    if candidate.source_id:
        return f"source:{candidate.source}:{candidate.source_id}"
    if candidate.normalized_domain:
        return f"domain:{candidate.normalized_domain}"
    if candidate.normalized_phone:
        return f"phone:{candidate.normalized_phone}"
    if candidate.normalized_email:
        return f"email:{candidate.normalized_email}"
    return None


def _is_fuzzy_duplicate(
    candidate: CandidateLead,
    existing: CandidateLead,
) -> bool:
    if not candidate.normalized_name or not existing.normalized_name:
        return False

    name_sim = calculate_similarity(candidate.normalized_name, existing.normalized_name)
    if name_sim < NAME_SIMILARITY_THRESHOLD:
        return False

    if candidate.address and existing.address:
        addr_sim = calculate_similarity(candidate.address, existing.address)
        return addr_sim >= ADDRESS_SIMILARITY_THRESHOLD

    return name_sim >= NAME_SIMILARITY_THRESHOLD


def deduplicate_candidates(candidates: list[CandidateLead]) -> list[CandidateLead]:
    unique = []
    seen_exact_keys: dict[str, CandidateLead] = {}
    marked_as_duplicate: set[int] = set()

    for candidate in candidates:
        exact_key = _get_exact_key(candidate)
        if exact_key and exact_key in seen_exact_keys:
            marked_as_duplicate.add(id(candidate))
            continue
        if exact_key:
            seen_exact_keys[exact_key] = candidate

    for candidate in candidates:
        if id(candidate) in marked_as_duplicate:
            continue

        is_dup = False
        for existing in unique:
            if _is_fuzzy_duplicate(candidate, existing):
                is_dup = True
                break

        if not is_dup:
            unique.append(candidate)

    removed = len(candidates) - len(unique)
    logger.info(
        "deduplication_complete",
        original_count=len(candidates),
        unique_count=len(unique),
        removed=removed,
    )
    return unique
