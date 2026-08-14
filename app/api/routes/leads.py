import csv
import io
import math
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.schemas.requests import (
    BulkAssignRequest,
    ContactActivityCreateRequest,
    ContactCreateRequest,
    ErrorResponse,
    LeadAssignRequest,
    LeadSearchRequest,
    LeadUpdateRequest,
    StageMoveRequest,
)
from app.api.schemas.responses import (
    BulkAssignResponse,
    ContactActivityResponse,
    ContactResponse,
    LeadDetailResponse,
    LeadListItemResponse,
    LeadResponse,
    LeadSearchResponse,
    LeadVerification,
    PaginatedResponse,
    StageMoveResponse,
    TimelineEventResponse,
)
from app.core.constants import NotificationType, OUTCOME_TO_STAGE, TimelineEventType
from app.dependencies import get_current_admin, get_current_user, get_db, get_pipeline_manager
from app.models.contact_activity import ContactActivity
from app.models.department import Department
from app.models.lead import Contact, Lead
from app.models.pipeline import Notification, TimelineEvent
from app.models.user import User
from app.pipeline.pipeline_manager import PipelineManager

router = APIRouter(dependencies=[Depends(get_current_user)])


def _to_naive_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(UTC).replace(tzinfo=None)
    return dt


async def _department_names(
    db: AsyncSession, company_id: str, department_ids: list[str]
) -> dict[str, str]:
    ids = [d for d in department_ids if d]
    if not ids:
        return {}
    rows = await db.execute(
        select(Department.id, Department.name).where(
            Department.company_id == company_id,
            Department.id.in_(ids),
        )
    )
    return dict(rows.all())


async def _lead_department_name(db: AsyncSession, lead: Lead) -> str | None:
    if not lead.department_id:
        return None
    names = await _department_names(db, lead.company_id, [lead.department_id])
    return names.get(lead.department_id)


@router.post(
    "/leads/search",
    response_model=LeadSearchResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def search_leads(
    request: LeadSearchRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    pipeline_manager: PipelineManager = Depends(get_pipeline_manager),
) -> LeadSearchResponse:
    department = await db.get(Department, request.department_id)
    if not department or department.company_id != user.company_id:
        raise HTTPException(
            status_code=400,
            detail="Select a valid department. Create one in Settings before searching.",
        )

    saved_leads = await pipeline_manager.run_search(
        db=db,
        company_id=user.company_id,
        query=request.query,
        latitude=request.latitude,
        longitude=request.longitude,
        max_leads=request.max_leads,
        department_id=request.department_id,
    )

    leads = []
    for lead in saved_leads:
        leads.append(LeadResponse(
            business_name=lead.business_name,
            website=lead.website,
            email=lead.email,
            phone=lead.phone,
            address=lead.address,
            latitude=lead.latitude,
            longitude=lead.longitude,
            confidence_score=lead.lead_score,
            relevance_reason=lead.relevance_reason,
            verification=LeadVerification(
                business_active=lead.business_active,
                website_identity_verified=lead.website_identity_verified,
                email_verified=lead.email_verified,
                phone_cross_verified=lead.phone_cross_verified,
                location_match=lead.location_match,
            ),
        ))

    return LeadSearchResponse(
        query=request.query,
        candidates_checked=len(saved_leads),
        qualified_leads_found=len(saved_leads),
        requested_max_leads=request.max_leads,
        leads=leads,
    )


@router.get("/leads", response_model=PaginatedResponse)
async def list_leads(
    page: int = 1,
    page_size: int = 50,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    pipeline_stage: str | None = None,
    industry: str | None = None,
    country: str | None = None,
    state: str | None = None,
    city: str | None = None,
    priority: str | None = None,
    search: str | None = None,
    email_status: str | None = None,
    lead_score_min: int | None = None,
    search_id: str | None = None,
    assigned_to: str | None = None,
    department_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PaginatedResponse:
    stmt = select(Lead).where(Lead.company_id == user.company_id)

    if search_id:
        stmt = stmt.where(Lead.search_id == search_id)
    if department_id:
        stmt = stmt.where(Lead.department_id == department_id)
    if assigned_to:
        if assigned_to == "me":
            stmt = stmt.where(Lead.assigned_user_id == user.id)
        elif assigned_to == "unassigned":
            stmt = stmt.where(Lead.assigned_user_id.is_(None))
        else:
            stmt = stmt.where(Lead.assigned_user_id == assigned_to)
    if pipeline_stage:
        stmt = stmt.where(Lead.pipeline_stage == pipeline_stage)
    if industry:
        stmt = stmt.where(Lead.industry == industry)
    if country:
        stmt = stmt.where(Lead.country == country)
    if state:
        stmt = stmt.where(Lead.state == state)
    if city:
        stmt = stmt.where(Lead.city == city)
    if priority:
        stmt = stmt.where(Lead.priority == priority)
    if email_status:
        stmt = stmt.where(Lead.email_status == email_status)
    if lead_score_min:
        stmt = stmt.where(Lead.lead_score >= lead_score_min)
    if search:
        stmt = stmt.where(Lead.business_name.ilike(f"%{search}%"))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = await db.scalar(count_stmt) or 0
    total_pages = max(1, math.ceil(total / page_size))

    sort_col = getattr(Lead, sort_by, Lead.created_at)
    if sort_order == "desc":
        sort_col = sort_col.desc()
    stmt = stmt.order_by(sort_col).offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(stmt)
    leads = result.scalars().all()

    user_rows = (await db.execute(
        select(User.id, User.name).where(User.company_id == user.company_id)
    )).all()
    user_names = {row.id: row.name for row in user_rows}

    dept_names = await _department_names(
        db, user.company_id, [lead.department_id or "" for lead in leads]
    )

    return PaginatedResponse(
        items=[
            LeadListItemResponse(
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
                assigned_user_name=user_names.get(lead.assigned_user_id) if lead.assigned_user_id else None,
                department_id=lead.department_id,
                department_name=dept_names.get(lead.department_id) if lead.department_id else None,
                badges=lead.badges,
                created_at=lead.created_at,
            )
            for lead in leads
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/leads/export.csv")
async def export_leads_csv(
    pipeline_stage: str | None = None,
    industry: str | None = None,
    country: str | None = None,
    state: str | None = None,
    city: str | None = None,
    priority: str | None = None,
    search: str | None = None,
    email_status: str | None = None,
    lead_score_min: int | None = None,
    search_id: str | None = None,
    assigned_to: str | None = None,
    department_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    stmt = select(Lead).where(Lead.company_id == user.company_id)

    if search_id:
        stmt = stmt.where(Lead.search_id == search_id)
    if department_id:
        stmt = stmt.where(Lead.department_id == department_id)
    if assigned_to:
        if assigned_to == "me":
            stmt = stmt.where(Lead.assigned_user_id == user.id)
        elif assigned_to == "unassigned":
            stmt = stmt.where(Lead.assigned_user_id.is_(None))
        else:
            stmt = stmt.where(Lead.assigned_user_id == assigned_to)
    if pipeline_stage:
        stmt = stmt.where(Lead.pipeline_stage == pipeline_stage)
    if industry:
        stmt = stmt.where(Lead.industry == industry)
    if country:
        stmt = stmt.where(Lead.country == country)
    if state:
        stmt = stmt.where(Lead.state == state)
    if city:
        stmt = stmt.where(Lead.city == city)
    if priority:
        stmt = stmt.where(Lead.priority == priority)
    if email_status:
        stmt = stmt.where(Lead.email_status == email_status)
    if lead_score_min:
        stmt = stmt.where(Lead.lead_score >= lead_score_min)
    if search:
        stmt = stmt.where(Lead.business_name.ilike(f"%{search}%"))

    result = await db.execute(stmt.order_by(Lead.created_at.desc()).limit(5000))
    leads = result.scalars().all()

    user_rows = (await db.execute(
        select(User.id, User.name).where(User.company_id == user.company_id)
    )).all()
    user_names = {row.id: row.name for row in user_rows}

    dept_names = await _department_names(
        db, user.company_id, [lead.department_id or "" for lead in leads]
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        "business_name", "website", "email", "phone", "address", "industry",
        "employee_count", "revenue", "country", "state", "city", "deal_value",
        "pipeline_stage", "department", "lead_score", "priority", "email_status",
        "meeting_status", "assigned_to", "next_followup_date", "last_activity_at",
        "created_at",
    ])
    for lead in leads:
        writer.writerow([
            lead.business_name,
            lead.website or "",
            lead.email or "",
            lead.phone or "",
            lead.address or "",
            lead.industry or "",
            lead.employee_count if lead.employee_count is not None else "",
            lead.revenue or "",
            lead.country or "",
            lead.state or "",
            lead.city or "",
            lead.deal_value if lead.deal_value is not None else "",
            lead.pipeline_stage,
            dept_names.get(lead.department_id) or "" if lead.department_id else "",
            lead.lead_score,
            lead.priority,
            lead.email_status,
            lead.meeting_status,
            user_names.get(lead.assigned_user_id) if lead.assigned_user_id else "",
            str(lead.next_followup_date) if lead.next_followup_date else "",
            str(lead.last_activity_at) if lead.last_activity_at else "",
            str(lead.created_at) if lead.created_at else "",
        ])

    return Response(
        content="\ufeff" + buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="leads.csv"'},
    )


@router.get("/leads/{lead_id}", response_model=LeadDetailResponse)
async def get_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeadDetailResponse:
    result = await db.execute(
        select(Lead)
        .options(selectinload(Lead.contacts))
        .where(Lead.id == lead_id, Lead.company_id == user.company_id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    user_names = {}
    if lead.assigned_user_id:
        assignee = await db.get(User, lead.assigned_user_id)
        user_names = {lead.assigned_user_id: assignee.name} if assignee else {}

    return LeadDetailResponse(
        id=lead.id,
        search_id=lead.search_id,
        business_name=lead.business_name,
        website=lead.website,
        email=lead.email,
        phone=lead.phone,
        address=lead.address,
        latitude=lead.latitude,
        longitude=lead.longitude,
        category=lead.category,
        business_status=lead.business_status,
        relevance_score=lead.relevance_score,
        confidence_score=lead.confidence_score,
        relevance_reason=lead.relevance_reason,
        business_active=lead.business_active,
        website_identity_verified=lead.website_identity_verified,
        email_verified=lead.email_verified,
        phone_cross_verified=lead.phone_cross_verified,
        location_match=lead.location_match,
        pipeline_stage=lead.pipeline_stage,
        lead_score=lead.lead_score,
        ai_confidence=lead.ai_confidence,
        priority=lead.priority,
        department_id=lead.department_id,
        department_name=await _lead_department_name(db, lead),
        assigned_user_id=lead.assigned_user_id,
        assigned_user_name=user_names.get(lead.assigned_user_id),
        next_followup_date=lead.next_followup_date,
        last_activity_at=lead.last_activity_at,
        deal_value=lead.deal_value,
        industry=lead.industry,
        employee_count=lead.employee_count,
        revenue=lead.revenue,
        country=lead.country,
        state=lead.state,
        city=lead.city,
        company_logo_url=lead.company_logo_url,
        funding_info=lead.funding_info,
        technology_stack=lead.technology_stack,
        badges=lead.badges,
        email_status=lead.email_status,
        meeting_status=lead.meeting_status,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
        contacts=[
            ContactResponse(
                id=c.id,
                name=c.name,
                job_title=c.job_title,
                email=c.email,
                phone=c.phone,
                linkedin_url=c.linkedin_url,
                is_primary=c.is_primary,
            )
            for c in lead.contacts
        ],
    )


@router.patch("/leads/{lead_id}/assign")
async def assign_lead(
    lead_id: str,
    body: LeadAssignRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeadDetailResponse:
    result = await db.execute(
        select(Lead).options(selectinload(Lead.contacts)).where(
            Lead.id == lead_id, Lead.company_id == user.company_id
        )
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    target_user_id = body.user_id

    if user.is_admin:
        if target_user_id:
            assignee = await db.get(User, target_user_id)
            if not assignee or assignee.company_id != user.company_id:
                raise HTTPException(status_code=404, detail="User not found")
    else:
        if not target_user_id:
            raise HTTPException(status_code=403, detail="Only admins can unassign leads")
        if target_user_id != user.id:
            raise HTTPException(status_code=403, detail="You can only claim unassigned leads for yourself")
        if lead.assigned_user_id and lead.assigned_user_id != user.id:
            raise HTTPException(status_code=403, detail="This lead is already assigned to another user")

    previous_assignee = lead.assigned_user_id
    lead.assigned_user_id = target_user_id

    db.add(TimelineEvent(
        lead_id=lead.id,
        company_id=lead.company_id,
        event_type=TimelineEventType.LEAD_ASSIGNED.value,
        description=(
            f"Lead assigned to user {target_user_id}" if target_user_id
            else f"Lead unassigned (previously {previous_assignee})"
        ),
        event_metadata={
            "assigned_by": user.id,
            "assigned_to": target_user_id,
            "previous_assignee": previous_assignee,
        },
    ))

    if target_user_id and target_user_id != previous_assignee:
        db.add(Notification(
            notification_type=NotificationType.LEAD_ASSIGNED.value,
            company_id=lead.company_id,
            title="Lead assigned",
            message=f"Lead \"{lead.business_name}\" has been assigned to you.",
            lead_id=lead.id,
        ))

    await db.commit()
    await db.refresh(lead)

    assignee_name = None
    if lead.assigned_user_id:
        assignee = await db.get(User, lead.assigned_user_id)
        assignee_name = assignee.name if assignee else None

    return LeadDetailResponse(
        id=lead.id,
        search_id=lead.search_id,
        business_name=lead.business_name,
        website=lead.website,
        email=lead.email,
        phone=lead.phone,
        address=lead.address,
        latitude=lead.latitude,
        longitude=lead.longitude,
        category=lead.category,
        business_status=lead.business_status,
        relevance_score=lead.relevance_score,
        confidence_score=lead.confidence_score,
        relevance_reason=lead.relevance_reason,
        business_active=lead.business_active,
        website_identity_verified=lead.website_identity_verified,
        email_verified=lead.email_verified,
        phone_cross_verified=lead.phone_cross_verified,
        location_match=lead.location_match,
        pipeline_stage=lead.pipeline_stage,
        lead_score=lead.lead_score,
        ai_confidence=lead.ai_confidence,
        priority=lead.priority,
        department_id=lead.department_id,
        department_name=await _lead_department_name(db, lead),
        assigned_user_id=lead.assigned_user_id,
        assigned_user_name=assignee_name,
        next_followup_date=lead.next_followup_date,
        last_activity_at=lead.last_activity_at,
        deal_value=lead.deal_value,
        industry=lead.industry,
        employee_count=lead.employee_count,
        revenue=lead.revenue,
        country=lead.country,
        state=lead.state,
        city=lead.city,
        company_logo_url=lead.company_logo_url,
        funding_info=lead.funding_info,
        technology_stack=lead.technology_stack,
        badges=lead.badges,
        email_status=lead.email_status,
        meeting_status=lead.meeting_status,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
        contacts=[
            ContactResponse(
                id=c.id,
                name=c.name,
                job_title=c.job_title,
                email=c.email,
                phone=c.phone,
                linkedin_url=c.linkedin_url,
                is_primary=c.is_primary,
            )
            for c in lead.contacts
        ],
    )


@router.post("/leads/bulk-assign", response_model=BulkAssignResponse)
async def bulk_assign_leads(
    body: BulkAssignRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> BulkAssignResponse:
    if len(set(body.lead_ids)) < len(body.lead_ids):
        body.lead_ids = list(dict.fromkeys(body.lead_ids))

    target_user_id = body.user_id
    assignee_name = None
    if target_user_id:
        assignee = await db.get(User, target_user_id)
        if not assignee or assignee.company_id != user.company_id:
            raise HTTPException(status_code=404, detail="User not found")
        assignee_name = assignee.name

    result = await db.execute(
        select(Lead).options(selectinload(Lead.contacts)).where(
            Lead.company_id == user.company_id, Lead.id.in_(body.lead_ids)
        )
    )
    leads = result.scalars().all()
    leads_by_id = {lead.id: lead for lead in leads}

    assigned_ids: list[str] = []
    for lead_id in body.lead_ids:
        lead = leads_by_id.get(lead_id)
        if not lead:
            continue
        previous_assignee = lead.assigned_user_id
        if previous_assignee == target_user_id:
            continue
        lead.assigned_user_id = target_user_id
        assigned_ids.append(lead.id)

        db.add(TimelineEvent(
            lead_id=lead.id,
            company_id=lead.company_id,
            event_type=TimelineEventType.LEAD_ASSIGNED.value,
            description=(
                f"Lead assigned to user {target_user_id}" if target_user_id
                else f"Lead unassigned (previously {previous_assignee})"
            ),
            event_metadata={
                "assigned_by": user.id,
                "assigned_to": target_user_id,
                "previous_assignee": previous_assignee,
                "bulk": True,
            },
        ))

    assigned = len(assigned_ids)

    if assigned and target_user_id:
        db.add(Notification(
            notification_type=NotificationType.LEAD_ASSIGNED.value,
            company_id=user.company_id,
            title="Leads assigned",
            message=f"{assigned} lead{'s' if assigned != 1 else ''} has been assigned to you."
            + (f" Lead IDs: {', '.join(assigned_ids[:5])}" if assigned > 5 else ""),
        ))

    await db.commit()

    skipped = len(body.lead_ids) - assigned
    return BulkAssignResponse(total=len(body.lead_ids), assigned=assigned, skipped=skipped)


@router.delete("/leads/{lead_id}", status_code=204)
async def delete_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.company_id == user.company_id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    await db.execute(
        delete(Notification).where(
            Notification.lead_id == lead_id,
            Notification.company_id == user.company_id,
        )
    )
    await db.delete(lead)
    await db.commit()
    return Response(status_code=204)


@router.delete("/leads/{lead_id}/contacts/{contact_id}", status_code=204)
async def delete_lead_contact(
    lead_id: str,
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.company_id == user.company_id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    contact_result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.lead_id == lead_id)
    )
    contact = contact_result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    await db.delete(contact)
    await db.commit()
    return Response(status_code=204)


@router.get("/leads/{lead_id}/contact-activities", response_model=list[ContactActivityResponse])
async def list_contact_activities(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ContactActivityResponse]:
    lead = await db.scalar(select(Lead).where(Lead.id == lead_id, Lead.company_id == user.company_id))
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    activities = (await db.execute(
        select(ContactActivity)
        .where(ContactActivity.lead_id == lead_id)
        .order_by(ContactActivity.contacted_at.desc())
    )).scalars().all()

    user_rows = (await db.execute(
        select(User.id, User.name).where(User.company_id == user.company_id)
    )).all()
    user_names = {row.id: row.name for row in user_rows}

    return [
        ContactActivityResponse(
            id=a.id,
            lead_id=a.lead_id,
            user_id=a.user_id,
            user_name=user_names.get(a.user_id) if a.user_id else None,
            activity_type=a.activity_type,
            contacted_at=a.contacted_at,
            outcome=a.outcome,
            summary=a.summary,
            next_followup_at=a.next_followup_at,
            created_at=a.created_at,
        )
        for a in activities
    ]


@router.post("/leads/{lead_id}/contact-activities", response_model=ContactActivityResponse)
async def create_contact_activity(
    lead_id: str,
    body: ContactActivityCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    pipeline_manager: PipelineManager = Depends(get_pipeline_manager),
) -> ContactActivityResponse:
    lead = await db.scalar(select(Lead).where(Lead.id == lead_id, Lead.company_id == user.company_id))
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    contacted_at = _to_naive_utc(body.contacted_at) or datetime.now(UTC).replace(tzinfo=None)
    next_followup_at = _to_naive_utc(body.next_followup_at)

    activity = ContactActivity(
        lead_id=lead.id,
        company_id=lead.company_id,
        user_id=user.id,
        activity_type=body.activity_type,
        contacted_at=contacted_at,
        outcome=body.outcome,
        summary=body.summary,
        next_followup_at=next_followup_at,
    )
    db.add(activity)

    target_stage = OUTCOME_TO_STAGE.get(body.outcome)
    if target_stage and lead.pipeline_stage != target_stage:
        await pipeline_manager.move_lead_stage(
            db=db,
            lead=lead,
            to_stage=target_stage,
            moved_by=user.name or "user",
            reason=f"Contact outcome: {body.outcome}",
        )

    lead.last_activity_at = contacted_at
    if next_followup_at:
        lead.next_followup_date = next_followup_at

    db.add(TimelineEvent(
        lead_id=lead.id,
        company_id=lead.company_id,
        event_type=TimelineEventType.CONTACT_LOGGED.value,
        description=f"{user.name} logged a {body.activity_type} contact — {body.outcome}",
        event_metadata={
            "activity_id": activity.id,
            "activity_type": body.activity_type,
            "outcome": body.outcome,
        },
    ))

    await db.commit()
    await db.refresh(activity)

    return ContactActivityResponse(
        id=activity.id,
        lead_id=activity.lead_id,
        user_id=activity.user_id,
        user_name=user.name,
        activity_type=activity.activity_type,
        contacted_at=activity.contacted_at,
        outcome=activity.outcome,
        summary=activity.summary,
        next_followup_at=activity.next_followup_at,
        created_at=activity.created_at,
    )


@router.patch("/leads/{lead_id}", response_model=LeadDetailResponse)
async def update_lead(
    lead_id: str,
    update_data: LeadUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    pipeline_manager: PipelineManager = Depends(get_pipeline_manager),
) -> LeadDetailResponse:
    result = await db.execute(
        select(Lead).options(selectinload(Lead.contacts)).where(
            Lead.id == lead_id, Lead.company_id == user.company_id
        )
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    update_values = {k: v for k, v in update_data.model_dump(exclude_none=True).items()}
    if "next_followup_date" in update_values:
        update_values["next_followup_date"] = _to_naive_utc(update_values["next_followup_date"])
    if "department_id" in update_values:
        if not user.is_admin:
            raise HTTPException(status_code=403, detail="Admin access required to change department")
        target_dept = await db.get(Department, update_values["department_id"])
        if not target_dept or target_dept.company_id != user.company_id:
            raise HTTPException(status_code=400, detail="Invalid department")
    if update_values:
        await db.execute(
            update(Lead).where(
                Lead.id == lead_id, Lead.company_id == user.company_id
            ).values(**update_values)
        )
        await db.flush()

    result = await db.execute(
        select(Lead).options(selectinload(Lead.contacts)).where(
            Lead.id == lead_id, Lead.company_id == user.company_id
        )
    )
    lead = result.scalar_one()

    return LeadDetailResponse(
        id=lead.id,
        search_id=lead.search_id,
        business_name=lead.business_name,
        website=lead.website,
        email=lead.email,
        phone=lead.phone,
        address=lead.address,
        latitude=lead.latitude,
        longitude=lead.longitude,
        category=lead.category,
        business_status=lead.business_status,
        relevance_score=lead.relevance_score,
        confidence_score=lead.confidence_score,
        relevance_reason=lead.relevance_reason,
        business_active=lead.business_active,
        website_identity_verified=lead.website_identity_verified,
        email_verified=lead.email_verified,
        phone_cross_verified=lead.phone_cross_verified,
        location_match=lead.location_match,
        pipeline_stage=lead.pipeline_stage,
        lead_score=lead.lead_score,
        ai_confidence=lead.ai_confidence,
        priority=lead.priority,
        department_id=lead.department_id,
        department_name=await _lead_department_name(db, lead),
        assigned_user_id=lead.assigned_user_id,
        next_followup_date=lead.next_followup_date,
        last_activity_at=lead.last_activity_at,
        deal_value=lead.deal_value,
        industry=lead.industry,
        employee_count=lead.employee_count,
        revenue=lead.revenue,
        country=lead.country,
        state=lead.state,
        city=lead.city,
        company_logo_url=lead.company_logo_url,
        funding_info=lead.funding_info,
        technology_stack=lead.technology_stack,
        badges=lead.badges,
        email_status=lead.email_status,
        meeting_status=lead.meeting_status,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
        contacts=[
            ContactResponse(
                id=c.id,
                name=c.name,
                job_title=c.job_title,
                email=c.email,
                phone=c.phone,
                linkedin_url=c.linkedin_url,
                is_primary=c.is_primary,
            )
            for c in lead.contacts
        ],
    )


@router.patch("/leads/{lead_id}/stage", response_model=StageMoveResponse)
async def move_lead_stage(
    lead_id: str,
    move_data: StageMoveRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    pipeline_manager: PipelineManager = Depends(get_pipeline_manager),
) -> StageMoveResponse:
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.company_id == user.company_id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    await pipeline_manager.move_lead_stage(
        db=db,
        lead=lead,
        to_stage=move_data.stage,
        reason=move_data.reason,
    )

    return StageMoveResponse(
        id=lead.id,
        pipeline_stage=lead.pipeline_stage,
        message=f"Lead moved to {move_data.stage}",
    )


@router.get("/leads/{lead_id}/timeline", response_model=list[TimelineEventResponse])
async def get_lead_timeline(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[TimelineEventResponse]:
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.company_id == user.company_id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    events_result = await db.execute(
        select(TimelineEvent)
        .where(TimelineEvent.lead_id == lead_id)
        .order_by(TimelineEvent.created_at.asc())
    )
    events = events_result.scalars().all()

    return [
        TimelineEventResponse(
            id=e.id,
            event_type=e.event_type,
            description=e.description,
            metadata=e.event_metadata,
            created_at=e.created_at,
        )
        for e in events
    ]


@router.get("/leads/{lead_id}/contacts", response_model=list[ContactResponse])
async def get_lead_contacts(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ContactResponse]:
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.company_id == user.company_id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    contacts_result = await db.execute(
        select(Contact).where(Contact.lead_id == lead_id).order_by(Contact.is_primary.desc())
    )
    contacts = contacts_result.scalars().all()

    return [
        ContactResponse(
            id=c.id,
            name=c.name,
            job_title=c.job_title,
            email=c.email,
            phone=c.phone,
            linkedin_url=c.linkedin_url,
            is_primary=c.is_primary,
        )
        for c in contacts
    ]


@router.post("/leads/{lead_id}/contacts", response_model=ContactResponse)
async def create_lead_contact(
    lead_id: str,
    contact_data: ContactCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ContactResponse:
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.company_id == user.company_id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    contact = Contact(
        lead_id=lead_id,
        company_id=lead.company_id,
        name=contact_data.name,
        job_title=contact_data.job_title,
        email=contact_data.email,
        phone=contact_data.phone,
        linkedin_url=contact_data.linkedin_url,
        is_primary=contact_data.is_primary,
    )
    db.add(contact)
    await db.flush()

    return ContactResponse(
        id=contact.id,
        name=contact.name,
        job_title=contact.job_title,
        email=contact.email,
        phone=contact.phone,
        linkedin_url=contact.linkedin_url,
        is_primary=contact.is_primary,
    )
