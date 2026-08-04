from datetime import datetime

from sqlalchemy import ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, generate_uuid, utcnow


class ProviderResult(Base):
    __tablename__ = "provider_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    search_id: Mapped[str] = mapped_column(String(36), ForeignKey("searches.id"), nullable=False, index=True)
    candidate_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("candidate_leads.id"), nullable=True, index=True)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    provider_method: Mapped[str] = mapped_column(String(100), nullable=False)
    request_params: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    response_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
