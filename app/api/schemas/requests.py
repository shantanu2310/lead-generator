from pydantic import BaseModel, Field

from app.core.constants import MAX_LEADS


class LeadSearchRequest(BaseModel):
    query: str = Field(
        ..., min_length=1, max_length=500, description="Natural language search query"
    )
    latitude: float | None = Field(
        None, ge=-90, le=90, description="Latitude for location-based search"
    )
    longitude: float | None = Field(
        None, ge=-180, le=180, description="Longitude for location-based search"
    )
    max_leads: int = Field(MAX_LEADS, ge=1, le=MAX_LEADS, description="Maximum leads to return")


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail
