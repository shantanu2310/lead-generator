from datetime import datetime

from sqlalchemy import Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import BusinessStatus, PipelineStage
from app.database.base import Base, generate_uuid, utcnow


class CandidateLead(Base):
    __tablename__ = "candidate_leads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    search_id: Mapped[str] = mapped_column(String(36), ForeignKey("searches.id"), nullable=False, index=True)
    company_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(500), nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    source_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    website: Mapped[str | None] = mapped_column(Text, nullable=True)
    normalized_domain: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    normalized_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    normalized_email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    latitude: Mapped[float | None] = mapped_column(nullable=True)
    longitude: Mapped[float | None] = mapped_column(nullable=True)
    country: Mapped[str | None] = mapped_column(String(10), nullable=True)
    category: Mapped[str | None] = mapped_column(String(200), nullable=True)
    business_status: Mapped[str] = mapped_column(
        String(50), default=BusinessStatus.UNKNOWN.value
    )
    relevance_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_duplicate: Mapped[bool] = mapped_column(default=False)
    duplicate_of_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    lead = relationship("Lead", back_populates="candidate", uselist=False)


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    candidate_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("candidate_leads.id"), nullable=True, index=True)
    search_id: Mapped[str] = mapped_column(String(36), ForeignKey("searches.id"), nullable=False, index=True)
    company_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    business_name: Mapped[str] = mapped_column(String(500), nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(500), nullable=False)
    website: Mapped[str | None] = mapped_column(Text, nullable=True)
    normalized_domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    normalized_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    normalized_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    latitude: Mapped[float | None] = mapped_column(nullable=True)
    longitude: Mapped[float | None] = mapped_column(nullable=True)
    category: Mapped[str | None] = mapped_column(String(200), nullable=True)
    business_status: Mapped[str] = mapped_column(
        String(50), default=BusinessStatus.ACTIVE.value
    )
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    relevance_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Verification flags
    business_active: Mapped[bool] = mapped_column(default=False)
    website_identity_verified: Mapped[bool] = mapped_column(default=False)
    email_verified: Mapped[bool] = mapped_column(default=False)
    phone_cross_verified: Mapped[bool] = mapped_column(default=False)
    location_match: Mapped[bool] = mapped_column(default=False)
    recent_business_signal: Mapped[bool] = mapped_column(default=False)

    # Pipeline fields
    pipeline_stage: Mapped[str] = mapped_column(String(50), default=PipelineStage.NEW_LEAD.value, index=True)
    department_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    lead_score: Mapped[int] = mapped_column(Integer, default=0, index=True)
    ai_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    assigned_user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    next_followup_date: Mapped[datetime | None] = mapped_column(nullable=True)
    last_activity_at: Mapped[datetime | None] = mapped_column(nullable=True)
    deal_value: Mapped[float] = mapped_column(Float, default=0.0)
    score_updated_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Company info
    industry: Mapped[str | None] = mapped_column(String(200), nullable=True)
    employee_count: Mapped[int | None] = mapped_column(nullable=True)
    revenue: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    city: Mapped[str | None] = mapped_column(String(200), nullable=True)
    company_logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Enrichment
    funding_info: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    technology_stack: Mapped[list | None] = mapped_column(JSON, nullable=True)
    badges: Mapped[list | None] = mapped_column(JSON, default=list)

    # Status tracking
    email_status: Mapped[str] = mapped_column(String(50), default="pending")
    meeting_status: Mapped[str] = mapped_column(String(50), default="none")

    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    candidate = relationship("CandidateLead", back_populates="lead")
    contacts = relationship("Contact", back_populates="lead", cascade="all, delete-orphan")
    contact_activities = relationship(
        "ContactActivity", back_populates="lead", cascade="all, delete-orphan",
        order_by="ContactActivity.contacted_at.desc()",
    )
    timeline = relationship("TimelineEvent", back_populates="lead", cascade="all, delete-orphan", order_by="TimelineEvent.created_at")
    pipeline_logs = relationship("PipelineLog", back_populates="lead", cascade="all, delete-orphan", order_by="PipelineLog.created_at")


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    lead_id: Mapped[str] = mapped_column(String(36), ForeignKey("leads.id"), nullable=False, index=True)
    company_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    job_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_primary: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    lead = relationship("Lead", back_populates="contacts")
