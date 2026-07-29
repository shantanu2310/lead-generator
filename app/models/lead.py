from sqlalchemy import Float, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import BusinessStatus
from app.database.base import Base, generate_uuid, utcnow


class CandidateLead(Base):
    __tablename__ = "candidate_leads"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    search_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False, index=True)
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
    duplicate_of_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), nullable=True)
    created_at: Mapped[str] = mapped_column(default=utcnow)
    updated_at: Mapped[str] = mapped_column(default=utcnow, onupdate=utcnow)

    lead = relationship("Lead", back_populates="candidate", uselist=False)
    evidence = relationship("Evidence", back_populates="candidate")


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    candidate_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False, index=True)
    search_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False, index=True)
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
    business_active: Mapped[bool] = mapped_column(default=False)
    website_identity_verified: Mapped[bool] = mapped_column(default=False)
    email_verified: Mapped[bool] = mapped_column(default=False)
    phone_cross_verified: Mapped[bool] = mapped_column(default=False)
    location_match: Mapped[bool] = mapped_column(default=False)
    recent_business_signal: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[str] = mapped_column(default=utcnow)
    updated_at: Mapped[str] = mapped_column(default=utcnow, onupdate=utcnow)

    candidate = relationship("CandidateLead", back_populates="lead")
