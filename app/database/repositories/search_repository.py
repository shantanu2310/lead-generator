from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.search import Search, SearchIntent


class SearchRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, search: Search) -> Search:
        self.session.add(search)
        await self.session.flush()
        return search

    async def get_by_id(self, search_id: UUID) -> Search | None:
        result = await self.session.execute(
            select(Search).where(Search.id == str(search_id))
        )
        return result.scalar_one_or_none()

    async def update_status(self, search_id: UUID, status: str) -> Search | None:
        search = await self.get_by_id(search_id)
        if search:
            search.status = status
            await self.session.flush()
        return search

    async def increment_candidates(self, search_id: UUID, count: int = 1) -> Search | None:
        search = await self.get_by_id(search_id)
        if search:
            search.candidates_discovered += count
            await self.session.flush()
        return search


class SearchIntentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, intent: SearchIntent) -> SearchIntent:
        self.session.add(intent)
        await self.session.flush()
        return intent

    async def get_by_search_id(self, search_id: UUID) -> SearchIntent | None:
        result = await self.session.execute(
            select(SearchIntent).where(SearchIntent.search_id == str(search_id))
        )
        return result.scalar_one_or_none()
