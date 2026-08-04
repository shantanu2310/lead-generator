from datetime import datetime

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
    latitude: float | None = None
    longitude: float | None = None
    confidence_score: int = Field(..., ge=0, le=100)
    relevance_reason: str | None = None
    verification: LeadVerification


class LeadSearchResponse(BaseModel):
    query: str
    candidates_checked: int
    qualified_leads_found: int
    requested_max_leads: int
    leads: list[LeadResponse]


class ContactResponse(BaseModel):
    id: str
    name: str
    job_title: str | None = None
    email: str | None = None
    phone: str | None = None
    linkedin_url: str | None = None
    is_primary: bool = False


class TimelineEventResponse(BaseModel):
    id: str
    event_type: str
    description: str | None = None
    metadata: dict | None = None
    created_at: datetime


class LeadDetailResponse(BaseModel):
    id: str
    search_id: str
    business_name: str
    website: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    category: str | None = None
    business_status: str
    relevance_score: float = 0.0
    confidence_score: float = 0.0
    relevance_reason: str | None = None
    business_active: bool = False
    website_identity_verified: bool = False
    email_verified: bool = False
    phone_cross_verified: bool = False
    location_match: bool = False
    pipeline_stage: str = "new_lead"
    lead_score: int = 0
    ai_confidence: float = 0.0
    priority: str = "medium"
    assigned_user_id: str | None = None
    assigned_user_name: str | None = None
    next_followup_date: datetime | None = None
    last_activity_at: datetime | None = None
    deal_value: float = 0.0
    industry: str | None = None
    employee_count: int | None = None
    revenue: str | None = None
    country: str | None = None
    state: str | None = None
    city: str | None = None
    company_logo_url: str | None = None
    funding_info: dict | None = None
    technology_stack: list | None = None
    badges: list | None = None
    email_status: str = "pending"
    meeting_status: str = "none"
    created_at: datetime
    updated_at: datetime
    contacts: list[ContactResponse] = []


class LeadListItemResponse(BaseModel):
    id: str
    search_id: str | None = None
    business_name: str
    website: str | None = None
    email: str | None = None
    phone: str | None = None
    pipeline_stage: str
    lead_score: int = 0
    ai_confidence: float = 0.0
    priority: str = "medium"
    industry: str | None = None
    country: str | None = None
    city: str | None = None
    employee_count: int | None = None
    deal_value: float = 0.0
    email_status: str = "pending"
    meeting_status: str = "none"
    next_followup_date: datetime | None = None
    last_activity_at: datetime | None = None
    assigned_user_id: str | None = None
    assigned_user_name: str | None = None
    badges: list | None = None
    created_at: datetime


class ContactActivityResponse(BaseModel):
    id: str
    lead_id: str
    user_id: str | None = None
    user_name: str | None = None
    activity_type: str
    contacted_at: datetime
    outcome: str
    summary: str | None = None
    next_followup_at: datetime | None = None
    created_at: datetime


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int


class SearchResponse(BaseModel):
    id: str
    query: str
    status: str
    candidates_discovered: int = 0
    candidates_after_dedup: int = 0
    leads_qualified: int = 0
    leads_returned: int = 0
    lead_count: int = 0
    created_at: datetime
    completed_at: datetime | None = None


class PipelineStageResponse(BaseModel):
    stage: str
    label: str
    count: int
    total_value: float = 0.0
    avg_time_hours: float = 0.0


class PipelineAnalyticsResponse(BaseModel):
    stages: list[PipelineStageResponse]
    total_leads: int
    qualified_percent: float = 0.0
    conversion_percent: float = 0.0
    avg_deal_size: float = 0.0
    avg_response_time_hours: float = 0.0
    avg_sales_cycle_days: float = 0.0
    win_rate: float = 0.0
    loss_rate: float = 0.0
    revenue_generated: float = 0.0
    pipeline_value: float = 0.0
    forecast_revenue: float = 0.0


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str | None = None
    lead_id: str | None = None
    read: bool = False
    created_at: datetime


class StageMoveResponse(BaseModel):
    id: str
    pipeline_stage: str
    message: str
