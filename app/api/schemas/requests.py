from datetime import datetime

from pydantic import BaseModel, Field


class ProviderSettingsUpdate(BaseModel):
    llm_api_key: str | None = None
    llm_model: str | None = None
    google_places_api_key: str | None = None
    brave_search_api_key: str | None = None
    hunter_api_key: str | None = None


class PipelineSettingsUpdate(BaseModel):
    max_leads: int | None = Field(default=None, ge=1, le=100)
    minimum_lead_score: int | None = Field(default=None, ge=0, le=100)
    default_candidate_target: int | None = Field(default=None, ge=1, le=500)
    max_website_pages: int | None = Field(default=None, ge=1, le=50)
    website_concurrency: int | None = Field(default=None, ge=1, le=20)
    provider_concurrency: int | None = Field(default=None, ge=1, le=20)

from app.core.constants import MAX_LEADS


class LeadSearchRequest(BaseModel):
    query: str = Field(
        ..., min_length=1, max_length=500, description="Natural language search query"
    )
    department_id: str = Field(
        ..., min_length=1, max_length=36, description="Department to categorize leads into"
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


class LeadFilterRequest(BaseModel):
    pipeline_stage: str | None = None
    industry: str | None = None
    country: str | None = None
    state: str | None = None
    city: str | None = None
    priority: str | None = None
    assigned_user_id: str | None = None
    search: str | None = None
    email_status: str | None = None
    meeting_status: str | None = None
    lead_score_min: int | None = None
    lead_score_max: int | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)
    sort_by: str = Field(default="created_at")
    sort_order: str = Field(default="desc")


class StageMoveRequest(BaseModel):
    stage: str = Field(..., min_length=1, max_length=50)
    reason: str | None = None


class LeadUpdateRequest(BaseModel):
    business_name: str | None = None
    website: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    industry: str | None = None
    employee_count: int | None = None
    revenue: str | None = None
    country: str | None = None
    state: str | None = None
    city: str | None = None
    priority: str | None = None
    assigned_user_id: str | None = None
    deal_value: float | None = None
    next_followup_date: datetime | None = None
    badges: list[str] | None = None
    department_id: str | None = None
    notes: str | None = None


class ContactCreateRequest(BaseModel):
    name: str
    job_title: str | None = None
    email: str | None = None
    phone: str | None = None
    linkedin_url: str | None = None
    is_primary: bool = False


class LeadAssignRequest(BaseModel):
    user_id: str | None = None


class BulkAssignRequest(BaseModel):
    lead_ids: list[str] = Field(min_length=1, max_length=500)
    user_id: str | None = None


class ContactActivityCreateRequest(BaseModel):
    activity_type: str = Field(default="other", min_length=1, max_length=50)
    contacted_at: datetime | None = None
    outcome: str = Field(default="no_answer", min_length=1, max_length=50)
    summary: str | None = Field(default=None, max_length=5000)
    next_followup_at: datetime | None = None
