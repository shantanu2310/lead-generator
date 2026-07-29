from app.core.logging import get_logger
from app.models.evidence import EvidenceCollection
from app.utils.similarity import calculate_similarity

logger = get_logger()


class CrossValidationResult:
    def __init__(self) -> None:
        self.name_verified = False
        self.phone_verified = False
        self.email_verified = False
        self.address_verified = False
        self.website_verified = False
        self.source_count = 0
        self.conflicts: list[str] = []

    @property
    def verification_score(self) -> float:
        checks = [
            self.name_verified,
            self.phone_verified,
            self.email_verified,
            self.address_verified,
            self.website_verified,
        ]
        verified = sum(1 for c in checks if c)
        return verified / len(checks)


class CrossValidationService:
    def validate(
        self,
        evidence: EvidenceCollection,
        candidate_name: str | None = None,
        candidate_phone: str | None = None,
        candidate_address: str | None = None,
        candidate_domain: str | None = None,
    ) -> CrossValidationResult:
        result = CrossValidationResult()

        sources = set(e.source for e in evidence.items)
        result.source_count = len(sources)

        name_evidence = evidence.get_by_field("company_name")
        if name_evidence and candidate_name:
            for ev in name_evidence:
                sim = calculate_similarity(
                    ev.value.lower(), candidate_name.lower()
                )
                if sim >= 0.7:
                    result.name_verified = True
                    break

        phone_evidence = evidence.get_by_field("phone")
        if phone_evidence and candidate_phone:
            normalized_candidate = candidate_phone.replace(" ", "").replace("-", "")
            for ev in phone_evidence:
                normalized_ev = ev.value.replace(" ", "").replace("-", "")
                if normalized_ev == normalized_candidate:
                    result.phone_verified = True
                    break

        email_evidence = evidence.get_by_field("email")
        if email_evidence:
            valid_emails = [
                e for e in email_evidence
                if e.confidence >= 0.7
            ]
            if valid_emails:
                result.email_verified = True

        address_evidence = evidence.get_by_field("address")
        if address_evidence and candidate_address:
            for ev in address_evidence:
                sim = calculate_similarity(
                    ev.value.lower(), candidate_address.lower()
                )
                if sim >= 0.7:
                    result.address_verified = True
                    break

        if candidate_domain:
            domain_evidence = [
                e for e in evidence.items
                if e.source == "official_website"
            ]
            if domain_evidence:
                result.website_verified = True

        if evidence.has_cross_source_confirmation("phone"):
            result.phone_verified = True
        if evidence.has_cross_source_confirmation("email"):
            result.email_verified = True
        if evidence.has_cross_source_confirmation("company_name"):
            result.name_verified = True

        logger.info(
            "cross_validation_complete",
            name_verified=result.name_verified,
            phone_verified=result.phone_verified,
            email_verified=result.email_verified,
            address_verified=result.address_verified,
            website_verified=result.website_verified,
            source_count=result.source_count,
        )
        return result
