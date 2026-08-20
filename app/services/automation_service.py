from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import PipelineStage, TimelineEventType
from app.core.logging import get_logger
from app.models.company import Company
from app.models.lead import Lead
from app.models.pipeline import Notification, PipelineLog, TimelineEvent

logger = get_logger()


class AutomationService:
    def __init__(self, pipeline_manager) -> None:
        self.pipeline_manager = pipeline_manager

    async def evaluate_auto_transitions(self, db: AsyncSession) -> list[Lead]:
        leads_to_update: list[Lead] = []

        for stage, conditions in self._transition_rules().items():
            stmt = select(Lead).where(
                Lead.pipeline_stage == stage,
                *conditions["where"],
            )
            result = await db.execute(stmt)
            leads = result.scalars().all()

            for lead in leads:
                await self.pipeline_manager.move_lead_stage(
                    db=db,
                    lead=lead,
                    to_stage=conditions["to"],
                    moved_by="ai",
                    reason=conditions.get("reason", "Auto-transition"),
                )
                leads_to_update.append(lead)

        await db.flush()
        if leads_to_update:
            logger.info(
                "auto_transitions_applied",
                count=len(leads_to_update),
            )
        return leads_to_update

    async def generate_insights(self, db: AsyncSession) -> list[Notification]:
        insights: list[Notification] = []
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        dedup_window = now - timedelta(days=1)

        companies = (await db.execute(select(Company.id))).scalars().all()
        for company_id in companies:
            stuck_outreach = await db.scalar(
                select(func.count(Lead.id)).where(
                    Lead.company_id == company_id,
                    Lead.pipeline_stage == PipelineStage.OUTREACH_READY.value,
                    Lead.updated_at <= now - timedelta(days=7),
                )
            )
            latest_stuck = await db.scalar(
                select(func.count(Notification.id)).where(
                    Notification.company_id == company_id,
                    Notification.notification_type == "ai_insight",
                    Notification.title == f"{stuck_outreach} leads stuck in Outreach",
                    Notification.created_at >= dedup_window,
                )
            )
            if stuck_outreach and stuck_outreach > 0 and not latest_stuck:
                n = await self.pipeline_manager.create_notification(
                    db=db,
                    company_id=company_id,
                    notification_type="ai_insight",
                    title=f"{stuck_outreach} leads stuck in Outreach",
                    message=f"{stuck_outreach} leads have been in Outreach Ready for more than 7 days.",
                )
                insights.append(n)

            inactive = await db.scalar(
                select(func.count(Lead.id)).where(
                    Lead.company_id == company_id,
                    Lead.pipeline_stage.notin_([
                        PipelineStage.WON.value,
                        PipelineStage.LOST.value,
                    ]),
                    Lead.last_activity_at <= now - timedelta(days=14),
                )
            )
            latest_inactive = await db.scalar(
                select(func.count(Notification.id)).where(
                    Notification.company_id == company_id,
                    Notification.notification_type == "ai_insight",
                    Notification.title == f"{inactive} inactive leads",
                    Notification.created_at >= dedup_window,
                )
            )
            if inactive and inactive > 0 and not latest_inactive:
                n = await self.pipeline_manager.create_notification(
                    db=db,
                    company_id=company_id,
                    notification_type="ai_insight",
                    title=f"{inactive} inactive leads",
                    message=f"{inactive} leads have had no activity for 14+ days.",
                )
                insights.append(n)

            hot = await db.scalar(
                select(func.count(Lead.id)).where(
                    Lead.company_id == company_id,
                    Lead.lead_score >= 80,
                    Lead.pipeline_stage.notin_([
                        PipelineStage.WON.value,
                        PipelineStage.LOST.value,
                    ]),
                )
            )
            latest_hot = await db.scalar(
                select(func.count(Notification.id)).where(
                    Notification.company_id == company_id,
                    Notification.notification_type == "ai_insight",
                    Notification.title == f"{hot} hot leads need attention",
                    Notification.created_at >= dedup_window,
                )
            )
            if hot and hot > 0 and not latest_hot:
                n = await self.pipeline_manager.create_notification(
                    db=db,
                    company_id=company_id,
                    notification_type="ai_insight",
                    title=f"{hot} hot leads need attention",
                    message=f"{hot} high-scoring leads (score 80+) are waiting for action.",
                )
                insights.append(n)

            ready = await db.scalar(
                select(func.count(Lead.id)).where(
                    Lead.company_id == company_id,
                    Lead.email_verified.is_(True),
                    Lead.pipeline_stage.in_([
                        PipelineStage.NEW_LEAD.value,
                        PipelineStage.QUALIFIED.value,
                        PipelineStage.CONTACT_FOUND.value,
                        PipelineStage.VERIFIED.value,
                        PipelineStage.RESEARCH_COMPLETE.value,
                        PipelineStage.OUTREACH_READY.value,
                    ]),
                )
            )
            latest_ready = await db.scalar(
                select(func.count(Notification.id)).where(
                    Notification.company_id == company_id,
                    Notification.notification_type == "ai_insight",
                    Notification.title == f"{ready} verified leads ready for outreach",
                    Notification.created_at >= dedup_window,
                )
            )
            if ready and ready > 0 and not latest_ready:
                n = await self.pipeline_manager.create_notification(
                    db=db,
                    company_id=company_id,
                    notification_type="ai_insight",
                    title=f"{ready} verified leads ready for outreach",
                    message=f"{ready} leads have verified emails and have not been contacted yet.",
                )
                insights.append(n)

            inactive_7d = await db.scalar(
                select(func.count(Lead.id)).where(
                    Lead.company_id == company_id,
                    Lead.pipeline_stage.notin_([
                        PipelineStage.WON.value,
                        PipelineStage.LOST.value,
                    ]),
                    Lead.last_activity_at <= now - timedelta(days=7),
                    Lead.last_activity_at > now - timedelta(days=14),
                )
            )
            latest_inactive_7d = await db.scalar(
                select(func.count(Notification.id)).where(
                    Notification.company_id == company_id,
                    Notification.notification_type == "ai_insight",
                    Notification.title == f"{inactive_7d} leads inactive for 7+ days",
                    Notification.created_at >= dedup_window,
                )
            )
            if inactive_7d and inactive_7d > 0 and not latest_inactive_7d:
                n = await self.pipeline_manager.create_notification(
                    db=db,
                    company_id=company_id,
                    notification_type="ai_insight",
                    title=f"{inactive_7d} leads inactive for 7+ days",
                    message=f"{inactive_7d} leads have had no activity for 7+ days.",
                )
                insights.append(n)

            this_week = await db.scalar(
                select(func.count(PipelineLog.id)).where(
                    PipelineLog.company_id == company_id,
                    PipelineLog.to_stage == PipelineStage.QUALIFIED.value,
                    PipelineLog.created_at > now - timedelta(days=7),
                )
            ) or 0
            prev_week = await db.scalar(
                select(func.count(PipelineLog.id)).where(
                    PipelineLog.company_id == company_id,
                    PipelineLog.to_stage == PipelineStage.QUALIFIED.value,
                    PipelineLog.created_at > now - timedelta(days=14),
                    PipelineLog.created_at <= now - timedelta(days=7),
                )
            ) or 0
            if this_week > 0 and (prev_week == 0 or this_week > prev_week):
                growth = round((this_week - prev_week) / prev_week * 100) if prev_week > 0 else None
                title = (
                    f"Qualified leads up {growth}% this week"
                    if growth is not None
                    else "Qualified leads up this week"
                )
                latest_growth = await db.scalar(
                    select(func.count(Notification.id)).where(
                        Notification.company_id == company_id,
                        Notification.notification_type == "ai_insight",
                        Notification.title == title,
                        Notification.created_at >= dedup_window,
                    )
                )
                if not latest_growth:
                    n = await self.pipeline_manager.create_notification(
                        db=db,
                        company_id=company_id,
                        notification_type="ai_insight",
                        title=title,
                        message=f"{this_week} leads moved to Qualified in the last 7 days.",
                    )
                    insights.append(n)

        await db.flush()
        return insights

    def _transition_rules(self) -> dict:
        now = datetime.now(timezone.utc)
        return {
            PipelineStage.NEW_LEAD.value: {
                "to": PipelineStage.QUALIFIED.value,
                "where": [
                    Lead.lead_score >= 60,
                ],
                "reason": "Lead score >= 60, auto-qualified",
            },
            PipelineStage.VERIFIED.value: {
                "to": PipelineStage.RESEARCH_COMPLETE.value,
                "where": [
                    Lead.email_verified == True,
                    Lead.website_identity_verified == True,
                ],
                "reason": "Email + website verified, research complete",
            },
            PipelineStage.OUTREACH_READY.value: {
                "to": PipelineStage.EMAIL_SENT.value,
                "where": [
                    Lead.email_status == "sent",
                ],
                "reason": "Email sent to lead",
            },
        }
