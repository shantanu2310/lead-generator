from sqlalchemy import Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, generate_uuid, utcnow


class Search(Base):
    __tablename__ = "searches"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    query: Mapped[str] = mapped_column(String(1000), nullable=False)
    latitude: Mapped[float | None] = mapped_column(nullable=True)
    longitude: Mapped[float | None] = mapped_column(nullable=True)
    max_leads: Mapped[int] = mapped_column(Integer, default=15)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    candidates_discovered: Mapped[int] = mapped_column(Integer, default=0)
    candidates_after_dedup: Mapped[int] = mapped_column(Integer, default=0)
    leads_qualified: Mapped[int] = mapped_column(Integer, default=0)
    leads_returned: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[str] = mapped_column(default=utcnow)
    completed_at: Mapped[str | None] = mapped_column(nullable=True)

    intent = relationship("SearchIntent", back_populates="search", uselist=False)


class SearchIntent(Base):
    __tablename__ = "search_intents"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    search_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[str | None] = mapped_column(String(200), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(200), nullable=True)
    location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    location_mode: Mapped[str] = mapped_column(String(50), nullable=False)
    radius_km: Mapped[float | None] = mapped_column(nullable=True)
    keywords: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    negative_keywords: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    required_contact_fields: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    target_count: Mapped[int] = mapped_column(Integer, default=15)
    created_at: Mapped[str] = mapped_column(default=utcnow)

    search = relationship("Search", back_populates="intent")
