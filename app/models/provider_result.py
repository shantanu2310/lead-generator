from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, generate_uuid, utcnow


class ProviderResult(Base):
    __tablename__ = "provider_results"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    search_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False, index=True)
    candidate_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), nullable=True, index=True)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    provider_method: Mapped[str] = mapped_column(String(100), nullable=False)
    request_params: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    response_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(default=utcnow)
