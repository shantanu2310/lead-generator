from fastapi import APIRouter, Depends
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.responses import NotificationResponse
from app.dependencies import get_current_user, get_db
from app.models.pipeline import Notification

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/notifications", response_model=list[NotificationResponse])
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
) -> list[NotificationResponse]:
    stmt = select(Notification).order_by(Notification.created_at.desc()).limit(limit)
    if unread_only:
        stmt = stmt.where(Notification.read == False)
    result = await db.execute(stmt)
    notifications = result.scalars().all()
    return [
        NotificationResponse(
            id=n.id,
            type=n.notification_type,
            title=n.title,
            message=n.message,
            lead_id=n.lead_id,
            read=n.read,
            created_at=n.created_at,
        )
        for n in notifications
    ]


@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification).where(Notification.id == notification_id).values(read=True)
    )
    await db.flush()
    return {"status": "ok"}


@router.patch("/notifications/read-all")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification).values(read=True)
    )
    await db.flush()
    return {"status": "ok"}


@router.get("/notifications/unread-count")
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
):
    count = await db.scalar(
        select(func.count(Notification.id)).where(Notification.read == False)
    )
    return {"count": count or 0}
