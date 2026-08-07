from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import PipelineStage, TimelineEventType
from app.core.logging import get_logger
from app.models.company import Company
from app.models.lead import Lead
from app.models.pipeline import Notification, TimelineEvent

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
