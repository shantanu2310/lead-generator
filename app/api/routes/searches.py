import math

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.responses import PaginatedResponse, SearchResponse
from app.database.base import utcnow
from app.dependencies import get_current_admin, get_current_user, get_db
from app.models.lead import Lead
from app.models.search import Search
from app.models.user import User

router = APIRouter(dependencies=[Depends(get_current_admin)])


@router.get("/searches", response_model=PaginatedResponse)
async def list_searches(
    page: int = 1,
    page_size: int = 20,
    archived: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PaginatedResponse:
    scope = (
        Search.archived_at.is_not(None) if archived else Search.archived_at.is_(None)
    )
    count_stmt = (
        select(func.count(Search.id))
        .where(Search.company_id == user.company_id, scope)
    )
    total = await db.scalar(count_stmt) or 0
    total_pages = max(1, math.ceil(total / page_size))

    result = await db.execute(
        select(Search)
        .where(Search.company_id == user.company_id, scope)
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
            department_id=s.department_id,
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


@router.delete("/searches/{search_id}", status_code=204)
async def archive_search(
    search_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    search = await db.get(Search, search_id)
    if not search or search.company_id != user.company_id:
        raise HTTPException(status_code=404, detail="Search not found")
    search.archived_at = utcnow()
    await db.commit()
    return Response(status_code=204)


@router.patch("/searches/{search_id}/restore", response_model=SearchResponse)
async def restore_search(
    search_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SearchResponse:
    search = await db.get(Search, search_id)
    if not search or search.company_id != user.company_id:
        raise HTTPException(status_code=404, detail="Search not found")
    search.archived_at = None
    await db.commit()
    return SearchResponse(
        id=search.id,
        query=search.query,
        status=search.status,
        candidates_discovered=search.candidates_discovered,
        candidates_after_dedup=search.candidates_after_dedup,
        leads_qualified=search.leads_qualified,
        leads_returned=search.leads_returned,
        lead_count=0,
        department_id=search.department_id,
        created_at=search.created_at,
        completed_at=search.completed_at,
    )
