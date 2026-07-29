from pydantic import BaseModel


class PhoneVerificationResult(BaseModel):
    phone: str
    normalized_phone: str | None = None
    is_possible: bool = False
    is_valid: bool = False
    country_code: int | None = None
    verification_source: str = ""
    confidence: float = 0.0
