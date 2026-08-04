from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.responses import (
    PipelineAnalyticsResponse,
    PipelineStageResponse,
)
from app.core.constants import PipelineStage
from app.dependencies import get_current_user, get_db
from app.models.lead import Lead

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


@router.get("/pipeline/stages", response_model=list[PipelineStageResponse])
async def get_pipeline_stages(
    search_id: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[PipelineStageResponse]:
    conditions = [cond for cond in [_search_filter(search_id)] if cond is not None]

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
) -> PipelineAnalyticsResponse:
    conditions = [cond for cond in [_search_filter(search_id)] if cond is not None]

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
        win_rate=win_rate,
        loss_rate=loss_rate,
        revenue_generated=float(won_deal_value),
        pipeline_value=float(total_deal_value),
        forecast_revenue=float(total_deal_value * 0.3),
    )
