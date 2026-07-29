from app.core.logging import get_logger
from app.models.evidence import Evidence
from app.providers.base.email_provider import EmailDiscoveryProvider, EmailResult
from app.providers.base.schemas import PhoneVerificationResult
from app.utils.email import is_business_email, is_valid_email_format
from app.utils.phone import phones_match, validate_phone

logger = get_logger()


class EmailVerificationService:
    def __init__(self, providers: list[EmailDiscoveryProvider]) -> None:
        self.providers = providers

    async def verify_email(
        self,
        email: str,
        domain: str | None = None,
    ) -> EmailResult:
        if not is_valid_email_format(email):
            return EmailResult(
                email=email,
                status="invalid",
                confidence=0.0,
                source="format_check",
            )

        for provider in self.providers:
            try:
                result = await provider.verify_email(email)
                if result.status != "unknown":
                    if domain:
                        result.is_business_email = is_business_email(email, domain)
                    logger.info(
                        "email_verified",
                        email=email,
                        status=result.status,
                        provider=provider.__class__.__name__,
                    )
                    return result
            except Exception as e:
                logger.warning(
                    "email_verification_failed",
                    email=email,
                    provider=provider.__class__.__name__,
                    error=str(e),
                )
                continue

        return EmailResult(
            email=email,
            status="unknown",
            confidence=0.0,
            source="no_verification",
        )

    def build_verification_evidence(
        self,
        email_result: EmailResult,
    ) -> Evidence:
        confidence_map = {
            "valid": 0.95,
            "risky": 0.5,
            "invalid": 0.0,
            "accept_all": 0.4,
            "unknown": 0.2,
        }
        confidence = confidence_map.get(email_result.status, 0.0)

        return Evidence(
            field_name="email",
            value=email_result.email,
            source=f"verification_{email_result.source}",
            confidence=confidence,
        )


class PhoneVerificationService:
    def verify_phone(
        self,
        phone: str,
        source_phone: str | None = None,
        default_country: str = "US",
    ) -> PhoneVerificationResult:
        validation = validate_phone(phone, default_country)

        cross_verified = False
        if source_phone and validation["normalized"]:
            cross_verified = phones_match(phone, source_phone)

        confidence = 0.0
        if validation["is_valid"]:
            confidence = 0.9
        elif validation["is_possible"]:
            confidence = 0.6

        if cross_verified:
            confidence = min(confidence + 0.1, 1.0)

        result = PhoneVerificationResult(
            phone=phone,
            normalized_phone=validation["normalized"],
            is_possible=validation["is_possible"],
            is_valid=validation["is_valid"],
            country_code=validation["country_code"],
            verification_source="phonenumbers_lib",
            confidence=confidence,
        )

        logger.info(
            "phone_verified",
            phone=phone,
            is_valid=validation["is_valid"],
            cross_verified=cross_verified,
            confidence=confidence,
        )
        return result

    def build_verification_evidence(
        self,
        phone_result: PhoneVerificationResult,
        source: str = "phone_verification",
    ) -> Evidence:
        return Evidence(
            field_name="phone",
            value=phone_result.normalized_phone or phone_result.phone,
            source=source,
            confidence=phone_result.confidence,
        )
