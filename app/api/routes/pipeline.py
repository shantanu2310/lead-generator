from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.responses import (
    InsightResponse,
    LeadListItemResponse,
    PipelineAnalyticsResponse,
    PipelineStageResponse,
    TeamLeadsResponse,
    TeamUnassignedResponse,
    TeamUserLeadsResponse,
)
from app.core.constants import NotificationType, PipelineStage
from app.dependencies import get_current_admin, get_current_user, get_db
from app.models.contact_activity import ContactActivity
from app.models.lead import Lead
from app.models.pipeline import Notification
from app.models.user import User

router = APIRouter(dependencies=[Depends(get_current_user)])

STAGE_LABELS = {
    PipelineStage.NEW_LEAD.value: "New Lead",
    PipelineStage.QUALIFIED.value: "Qualified",
    PipelineStage.CONTACT_FOUND.value: "Contact Found",
    PipelineStage.VERIFIED.value: "Verified",
    PipelineStage.RESEARCH_COMPLETE.value: "Research Complete",
    PipelineStage.OUTREACH_READY.value: "Outreach Ready",
    PipelineStage.EMAIL_SENT.value: "Email Sent",
    PipelineStage.FOLLOW_UP.value: "Follow-up",
    PipelineStage.MEETING.value: "Meeting",
    PipelineStage.PROPOSAL.value: "Proposal",
    PipelineStage.NEGOTIATION.value: "Negotiation",
    PipelineStage.WON.value: "Won",
    PipelineStage.LOST.value: "Lost",
}


def _search_filter(search_id: str | None = None):
    return Lead.search_id == search_id if search_id else None


def _naive_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(UTC).replace(tzinfo=None)
    return dt


def _lead_item(lead: Lead, user_names: dict[str, str]) -> LeadListItemResponse:
    return LeadListItemResponse(
        id=lead.id,
        search_id=lead.search_id,
        business_name=lead.business_name,
        website=lead.website,
        email=lead.email,
        phone=lead.phone,
        pipeline_stage=lead.pipeline_stage,
        lead_score=lead.lead_score,
        ai_confidence=lead.ai_confidence,
        priority=lead.priority,
        industry=lead.industry,
        country=lead.country,
        city=lead.city,
        employee_count=lead.employee_count,
        deal_value=lead.deal_value,
        email_status=lead.email_status,
        meeting_status=lead.meeting_status,
        next_followup_date=lead.next_followup_date,
        last_activity_at=lead.last_activity_at,
        assigned_user_id=lead.assigned_user_id,
        assigned_user_name=(
            user_names.get(lead.assigned_user_id) if lead.assigned_user_id else None
        ),
        badges=lead.badges,
        created_at=lead.created_at,
    )


def _stage_summary(leads: list[Lead]) -> dict[str, int]:
    summary: dict[str, int] = {}
    for lead in leads:
        summary[lead.pipeline_stage] = summary.get(lead.pipeline_stage, 0) + 1
    return summary


@router.get("/pipeline/stages", response_model=list[PipelineStageResponse])
async def get_pipeline_stages(
    search_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[PipelineStageResponse]:
    conditions = [Lead.company_id == user.company_id]
    search_cond = _search_filter(search_id)
    if search_cond is not None:
        conditions.append(search_cond)

    stmt = select(
        Lead.pipeline_stage,
        func.count(Lead.id).label("count"),
        func.coalesce(func.sum(Lead.deal_value), 0).label("total_value"),
    ).group_by(Lead.pipeline_stage)
    if conditions:
        stmt = stmt.where(*conditions)
    result = await db.execute(stmt)
    rows = result.all()
    stage_counts = {row.pipeline_stage: row for row in rows}

    stages = []
    for stage_value in PipelineStage:
        label = STAGE_LABELS.get(stage_value.value, stage_value.value.replace("_", " ").title())
        row = stage_counts.get(stage_value.value)
        stages.append(PipelineStageResponse(
            stage=stage_value.value,
            label=label,
            count=row.count if row else 0,
            total_value=float(row.total_value) if row else 0.0,
        ))
    return stages


@router.get("/pipeline/analytics", response_model=PipelineAnalyticsResponse)
async def get_pipeline_analytics(
    search_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PipelineAnalyticsResponse:
    conditions = [Lead.company_id == user.company_id]
    search_cond = _search_filter(search_id)
    if search_cond is not None:
        conditions.append(search_cond)

    total = await db.scalar(
        select(func.count(Lead.id)).where(*conditions)
    )
    total = total or 0

    won_count = await db.scalar(
        select(func.count(Lead.id)).where(Lead.pipeline_stage == PipelineStage.WON.value, *conditions)
    ) or 0
    lost_count = await db.scalar(
        select(func.count(Lead.id)).where(Lead.pipeline_stage == PipelineStage.LOST.value, *conditions)
    ) or 0

    total_deal_value = await db.scalar(
        select(func.coalesce(func.sum(Lead.deal_value), 0)).where(*conditions)
    ) or 0.0

    stages_data = await db.execute(
        select(
            Lead.pipeline_stage,
            func.count(Lead.id).label("count"),
            func.coalesce(func.sum(Lead.deal_value), 0).label("total_value"),
        )
        .where(*conditions)
        .group_by(Lead.pipeline_stage)
        .order_by(Lead.pipeline_stage)
    )
    stages = []
    for row in stages_data.all():
        label = STAGE_LABELS.get(row.pipeline_stage, row.pipeline_stage.replace("_", " ").title())
        stages.append(PipelineStageResponse(
            stage=row.pipeline_stage,
            label=label,
            count=row.count,
            total_value=float(row.total_value),
        ))

    lead_timing = (await db.execute(
        select(Lead.pipeline_stage, Lead.created_at, Lead.last_activity_at).where(*conditions)
    )).all()
    stage_times: dict[str, list[float]] = {}
    cycle_hours: list[float] = []
    for stage, created_at, last_activity_at in lead_timing:
        created = _naive_utc(created_at)
        end = _naive_utc(last_activity_at) or created
        if created is None or end is None:
            continue
        hours = max(0.0, (end - created).total_seconds() / 3600.0)
        stage_times.setdefault(stage, []).append(hours)
        cycle_hours.append(hours)

    for s in stages:
        times = stage_times.get(s.stage)
        if times:
            s.avg_time_hours = round(sum(times) / len(times), 1)

    avg_sales_cycle_days = (
        round((sum(cycle_hours) / len(cycle_hours)) / 24.0, 1) if cycle_hours else 0.0
    )

    response_rows = (await db.execute(
        select(Lead.created_at, func.min(ContactActivity.contacted_at).label("first_contacted"))
        .join(Lead, Lead.id == ContactActivity.lead_id)
        .where(*conditions)
        .group_by(Lead.id, Lead.created_at)
    )).all()
    response_hours: list[float] = []
    for created_at, first_contacted in response_rows:
        created = _naive_utc(created_at)
        first = _naive_utc(first_contacted)
        if created is None or first is None:
            continue
        response_hours.append(max(0.0, (first - created).total_seconds() / 3600.0))
    avg_response_time_hours = (
        round(sum(response_hours) / len(response_hours), 1) if response_hours else 0.0
    )

    won_deal_value = await db.scalar(
        select(func.coalesce(func.sum(Lead.deal_value), 0))
        .where(Lead.pipeline_stage == PipelineStage.WON.value, *conditions)
    ) or 0.0

    closed = won_count + lost_count
    win_rate = (won_count / closed * 100) if closed > 0 else 0.0
    loss_rate = (lost_count / closed * 100) if closed > 0 else 0.0

    qualified = await db.scalar(
        select(func.count(Lead.id))
        .where(Lead.pipeline_stage.notin_([PipelineStage.NEW_LEAD.value]), *conditions)
    ) or 0

    return PipelineAnalyticsResponse(
        stages=stages,
        total_leads=total,
        qualified_percent=(qualified / total * 100) if total > 0 else 0.0,
        conversion_percent=(won_count / total * 100) if total > 0 else 0.0,
        avg_deal_size=float(total_deal_value / total) if total > 0 else 0.0,
        avg_response_time_hours=avg_response_time_hours,
        avg_sales_cycle_days=avg_sales_cycle_days,
        win_rate=win_rate,
        loss_rate=loss_rate,
        revenue_generated=float(won_deal_value),
        pipeline_value=float(total_deal_value),
        forecast_revenue=float(total_deal_value * 0.3),
    )


@router.get("/pipeline/insights", response_model=list[InsightResponse])
async def get_pipeline_insights(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[InsightResponse]:
    cap = max(1, min(limit, 100))
    result = await db.execute(
        select(Notification)
        .where(
            Notification.company_id == user.company_id,
            Notification.notification_type == NotificationType.AI_INSIGHT.value,
        )
        .order_by(Notification.created_at.desc())
        .limit(cap)
    )
    notifications = result.scalars().all()
    return [
        InsightResponse(
            id=n.id,
            title=n.title,
            message=n.message,
            lead_id=n.lead_id,
            created_at=n.created_at,
        )
        for n in notifications
    ]


@router.get("/pipeline/team-leads", response_model=TeamLeadsResponse)
async def get_team_leads(
    per_user_limit: int = 100,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> TeamLeadsResponse:
    per = max(1, min(per_user_limit, 500))

    leads = (await db.execute(
        select(Lead)
        .where(Lead.company_id == admin.company_id)
        .order_by(Lead.updated_at.desc())
    )).scalars().all()

    users = (await db.execute(
        select(User)
        .where(User.company_id == admin.company_id)
        .order_by(User.name)
    )).scalars().all()

    buckets: dict[str | None, list[Lead]] = {}
    for lead in leads:
        buckets.setdefault(lead.assigned_user_id, []).append(lead)

    user_names = {u.id: u.name for u in users}
    known_buckets = {u.id: buckets.get(u.id, []) for u in users}

    unassigned_leads = list(buckets.get(None, []))
    for key, bucket in buckets.items():
        if key is not None and key not in user_names:
            unassigned_leads.extend(bucket)

    team_users = [
        TeamUserLeadsResponse(
            id=u.id,
            name=u.name,
            email=u.email,
            avatar_url=u.avatar_url,
            is_admin=u.is_admin,
            is_active=u.is_active,
            total=len(known_buckets[u.id]),
            by_stage=_stage_summary(known_buckets[u.id]),
            leads=[_lead_item(lead, user_names) for lead in known_buckets[u.id][:per]],
        )
        for u in users
    ]

    return TeamLeadsResponse(
        users=team_users,
        unassigned=TeamUnassignedResponse(
            total=len(unassigned_leads),
            by_stage=_stage_summary(unassigned_leads),
            leads=[_lead_item(lead, user_names) for lead in unassigned_leads[:per]],
        ),
    )
