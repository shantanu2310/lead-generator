from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import CandidateLead


class CandidateRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, candidate: CandidateLead) -> CandidateLead:
        self.session.add(candidate)
        await self.session.flush()
        return candidate

    async def create_many(self, candidates: list[CandidateLead]) -> list[CandidateLead]:
        self.session.add_all(candidates)
        await self.session.flush()
        return candidates

    async def get_by_id(self, candidate_id: UUID) -> CandidateLead | None:
        result = await self.session.execute(
            select(CandidateLead).where(CandidateLead.id == str(candidate_id))
        )
        return result.scalar_one_or_none()

    async def get_by_search_id(self, search_id: UUID) -> list[CandidateLead]:
        result = await self.session.execute(
            select(CandidateLead).where(CandidateLead.search_id == str(search_id))
        )
        return list(result.scalars().all())

    async def get_by_domain(self, domain: str) -> list[CandidateLead]:
        result = await self.session.execute(
            select(CandidateLead).where(CandidateLead.normalized_domain == domain)
        )
        return list(result.scalars().all())

    async def get_by_source_id(self, source: str, source_id: str) -> CandidateLead | None:
        result = await self.session.execute(
            select(CandidateLead).where(
                CandidateLead.source == source,
                CandidateLead.source_id == source_id,
            )
        )
        return result.scalar_one_or_none()

    async def mark_duplicate(
        self, candidate_id: UUID, duplicate_of_id: UUID
    ) -> CandidateLead | None:
        candidate = await self.get_by_id(candidate_id)
        if candidate:
            candidate.is_duplicate = True
            candidate.duplicate_of_id = str(duplicate_of_id)
            await self.session.flush()
        return candidate
