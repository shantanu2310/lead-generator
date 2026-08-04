from app.core.constants import PipelineStage, TimelineEventType
from app.core.logging import get_logger
from app.models.lead import Contact, Lead
from app.models.pipeline import Notification, PipelineLog, TimelineEvent
from app.models.search import Search
from app.pipeline.orchestrator import PipelineOrchestrator

logger = get_logger()


class PipelineManager:
    def __init__(
        self,
        orchestrator: PipelineOrchestrator,
    ) -> None:
        self.orchestrator = orchestrator

    async def run_search(
        self,
        db,
        query: str,
        latitude: float | None = None,
        longitude: float | None = None,
        max_leads: int = 15,
    ) -> list[Lead]:
        logger.info("pipeline_manager_started", query=query, max_leads=max_leads)

        result = await self.orchestrator.run(
            query=query,
            latitude=latitude,
            longitude=longitude,
            max_leads=max_leads,
        )

        search = Search(
            query=result.query,
            latitude=latitude,
            longitude=longitude,
            max_leads=result.requested_max_leads,
            status="completed",
            candidates_discovered=result.candidates_checked,
            candidates_after_dedup=result.candidates_checked,
            leads_qualified=result.qualified_leads_found,
            leads_returned=len(result.leads),
        )
        db.add(search)
        await db.flush()

        saved_leads: list[Lead] = []
        for lead_data in result.leads:
            lead = Lead(
                search_id=search.id,
                business_name=lead_data.business_name,
                normalized_name=lead_data.business_name.lower().strip(),
                website=lead_data.website,
                email=lead_data.email,
                phone=lead_data.phone,
                address=lead_data.address,
                latitude=lead_data.latitude,
                longitude=lead_data.longitude,
                confidence_score=float(lead_data.confidence_score),
                relevance_score=float(lead_data.confidence_score),
                relevance_reason=lead_data.relevance_reason,
                business_active=lead_data.verification.get("business_active", False),
                website_identity_verified=lead_data.verification.get("website_identity_verified", False),
                email_verified=lead_data.verification.get("email_verified", False),
                phone_cross_verified=lead_data.verification.get("phone_cross_verified", False),
                location_match=lead_data.verification.get("location_match", False),
                pipeline_stage=PipelineStage.NEW_LEAD.value,
                lead_score=lead_data.confidence_score,
                ai_confidence=lead_data.confidence_score / 100.0,
                last_activity_at=None,
                badges=[],
            )
            db.add(lead)
            await db.flush()

            await self._create_timeline_event(
                db, lead.id, TimelineEventType.COMPANY_FOUND,
                f"Company discovered via search: {query}",
            )

            if lead_data.website:
                await self._create_timeline_event(
                    db, lead.id, TimelineEventType.WEBSITE_VERIFIED,
                    f"Website verified: {lead_data.website}",
                )

            if lead_data.email:
                status = "verified" if lead.email_verified else "pending"
                lead.email_status = status
                if lead.email_verified:
                    await self._create_timeline_event(
                        db, lead.id, TimelineEventType.EMAIL_VERIFIED,
                        f"Email verified: {lead_data.email}",
                    )
                    await self.create_notification(
                        db,
                        notification_type="email_verified",
                        title=f"Email verified: {lead.business_name}",
                        message=f"Verified {lead_data.email} on {lead.business_name}",
                        lead_id=lead.id,
                    )

            if lead.lead_score >= 80:
                await self.create_notification(
                    db,
                    notification_type="high_score_lead",
                    title=f"High-value lead: {lead.business_name}",
                    message=f"Scored {lead.lead_score}/100 - highly qualified candidate.",
                    lead_id=lead.id,
                )

            saved_leads.append(lead)
            await db.flush()

        if saved_leads:
            await self.create_notification(
                db,
                notification_type="new_lead",
                title=f"{len(saved_leads)} new leads found",
                message=f"Search '{query}' found {len(saved_leads)} qualified leads.",
            )

        logger.info(
            "pipeline_manager_complete",
            search_id=search.id,
            leads_saved=len(saved_leads),
        )

        return saved_leads

    async def move_lead_stage(
        self,
        db,
        lead: Lead,
        to_stage: str,
        moved_by: str = "user",
        reason: str | None = None,
    ) -> Lead:
        from_stage = lead.pipeline_stage
        if from_stage == to_stage:
            return lead

        lead.pipeline_stage = to_stage
        lead.last_activity_at = None

        log = PipelineLog(
            lead_id=lead.id,
            from_stage=from_stage,
            to_stage=to_stage,
            moved_by=moved_by,
            reason=reason,
        )
        db.add(log)

        event_type = self._stage_to_event_type(to_stage)
        await self._create_timeline_event(
            db, lead.id, event_type,
            f"Stage changed from {from_stage} to {to_stage}",
            metadata={"from_stage": from_stage, "to_stage": to_stage, "moved_by": moved_by},
        )

        if to_stage == PipelineStage.WON.value:
            await self.create_notification(
                db,
                notification_type="deal_won",
                title=f"Deal won: {lead.business_name}",
                message=f"Lead moved to Won by {moved_by}.",
                lead_id=lead.id,
            )
        elif to_stage == PipelineStage.LOST.value:
            await self.create_notification(
                db,
                notification_type="deal_lost",
                title=f"Deal lost: {lead.business_name}",
                message=f"Lead moved to Lost by {moved_by}.",
                lead_id=lead.id,
            )

        await db.flush()
        return lead

    async def _create_timeline_event(
        self,
        db,
        lead_id: str,
        event_type: TimelineEventType,
        description: str | None = None,
        metadata: dict | None = None,
    ) -> TimelineEvent:
        event = TimelineEvent(
            lead_id=lead_id,
            event_type=event_type.value,
            description=description,
            event_metadata=metadata,
        )
        db.add(event)
        return event

    async def create_notification(
        self,
        db,
        notification_type: str,
        title: str,
        message: str | None = None,
        lead_id: str | None = None,
    ) -> Notification:
        notification = Notification(
            notification_type=notification_type,
            title=title,
            message=message,
            lead_id=lead_id,
        )
        db.add(notification)
        await db.flush()
        return notification

    def _stage_to_event_type(self, stage: str) -> TimelineEventType:
        mapping = {
            PipelineStage.NEW_LEAD.value: TimelineEventType.COMPANY_FOUND,
            PipelineStage.QUALIFIED.value: TimelineEventType.AI_SUMMARY_GENERATED,
            PipelineStage.CONTACT_FOUND.value: TimelineEventType.CONTACT_FOUND,
            PipelineStage.VERIFIED.value: TimelineEventType.EMAIL_VERIFIED,
            PipelineStage.RESEARCH_COMPLETE.value: TimelineEventType.AI_SUMMARY_GENERATED,
            PipelineStage.OUTREACH_READY.value: TimelineEventType.COLD_EMAIL_CREATED,
            PipelineStage.EMAIL_SENT.value: TimelineEventType.EMAIL_SENT,
            PipelineStage.FOLLOW_UP.value: TimelineEventType.REPLY_RECEIVED,
            PipelineStage.MEETING.value: TimelineEventType.MEETING_SCHEDULED,
            PipelineStage.PROPOSAL.value: TimelineEventType.PROPOSAL_SENT,
            PipelineStage.NEGOTIATION.value: TimelineEventType.PROPOSAL_SENT,
            PipelineStage.WON.value: TimelineEventType.DEAL_WON,
            PipelineStage.LOST.value: TimelineEventType.DEAL_LOST,
        }
        return mapping.get(stage, TimelineEventType.STAGE_CHANGED)
