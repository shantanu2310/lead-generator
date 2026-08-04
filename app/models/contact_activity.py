from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, generate_uuid, utcnow


class ContactActivity(Base):
    __tablename__ = "contact_activities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    lead_id: Mapped[str] = mapped_column(String(36), ForeignKey("leads.id"), nullable=False, index=True)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    activity_type: Mapped[str] = mapped_column(String(50), nullable=False, default="other")
    contacted_at: Mapped[datetime] = mapped_column(nullable=False, default=utcnow)
    outcome: Mapped[str] = mapped_column(String(50), nullable=False, default="no_answer")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_followup_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[str] = mapped_column(default=utcnow)

    lead = relationship("Lead", back_populates="contact_activities")
