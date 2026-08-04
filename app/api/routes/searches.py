import math

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.responses import PaginatedResponse, SearchResponse
from app.dependencies import get_current_user, get_db
from app.models.lead import Lead
from app.models.search import Search

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/searches", response_model=PaginatedResponse)
async def list_searches(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PaginatedResponse:
    count_stmt = select(func.count(Search.id)).where(Search.company_id == user.company_id)
    total = await db.scalar(count_stmt) or 0
    total_pages = max(1, math.ceil(total / page_size))

    result = await db.execute(
        select(Search)
        .where(Search.company_id == user.company_id)
        .order_by(Search.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    searches = result.scalars().all()

    lead_counts: dict[str, int] = {}
    if searches:
        counts = await db.execute(
            select(Lead.search_id, func.count(Lead.id))
            .where(
                Lead.search_id.in_([s.id for s in searches]),
                Lead.company_id == user.company_id,
            )
            .group_by(Lead.search_id)
        )
        lead_counts = dict(counts.all())

    items = [
        SearchResponse(
            id=s.id,
            query=s.query,
            status=s.status,
            candidates_discovered=s.candidates_discovered,
            candidates_after_dedup=s.candidates_after_dedup,
            leads_qualified=s.leads_qualified,
            leads_returned=s.leads_returned,
            lead_count=lead_counts.get(s.id, 0),
            created_at=s.created_at,
            completed_at=s.completed_at,
        )
        for s in searches
    ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
