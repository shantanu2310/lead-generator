from pydantic import BaseModel, Field


class LeadVerification(BaseModel):
    business_active: bool
    website_identity_verified: bool
    email_verified: bool
    phone_cross_verified: bool
    location_match: bool


class LeadResponse(BaseModel):
    business_name: str
    website: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    confidence_score: int = Field(..., ge=0, le=100)
    relevance_reason: str | None = None
    verification: LeadVerification


class LeadSearchResponse(BaseModel):
    query: str
    candidates_checked: int
    qualified_leads_found: int
    requested_max_leads: int
    leads: list[LeadResponse]
