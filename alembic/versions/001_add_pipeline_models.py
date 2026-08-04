"""add pipeline models

Revision ID: 001
Revises: None
Create Date: 2026-07-30 10:42:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Pipeline fields on leads table
    op.add_column("leads", sa.Column("pipeline_stage", sa.String(50), server_default="new_lead", nullable=False))
    op.add_column("leads", sa.Column("lead_score", sa.Integer(), server_default="0", nullable=False))
    op.add_column("leads", sa.Column("ai_confidence", sa.Float(), server_default="0.0", nullable=False))
    op.add_column("leads", sa.Column("priority", sa.String(20), server_default="medium", nullable=False))
    op.add_column("leads", sa.Column("assigned_user_id", UUID(as_uuid=False), nullable=True))
    op.add_column("leads", sa.Column("next_followup_date", sa.DateTime(), nullable=True))
    op.add_column("leads", sa.Column("last_activity_at", sa.DateTime(), nullable=True))
    op.add_column("leads", sa.Column("deal_value", sa.Float(), server_default="0.0", nullable=False))
    op.add_column("leads", sa.Column("score_updated_at", sa.DateTime(), nullable=True))
    op.add_column("leads", sa.Column("industry", sa.String(200), nullable=True))
    op.add_column("leads", sa.Column("employee_count", sa.Integer(), nullable=True))
    op.add_column("leads", sa.Column("revenue", sa.String(100), nullable=True))
    op.add_column("leads", sa.Column("country", sa.String(100), nullable=True))
    op.add_column("leads", sa.Column("state", sa.String(100), nullable=True))
    op.add_column("leads", sa.Column("city", sa.String(200), nullable=True))
    op.add_column("leads", sa.Column("company_logo_url", sa.Text(), nullable=True))
    op.add_column("leads", sa.Column("funding_info", JSONB(), nullable=True))
    op.add_column("leads", sa.Column("technology_stack", JSONB(), nullable=True))
    op.add_column("leads", sa.Column("badges", JSONB(), nullable=True))
    op.add_column("leads", sa.Column("email_status", sa.String(50), server_default="pending", nullable=False))
    op.add_column("leads", sa.Column("meeting_status", sa.String(50), server_default="none", nullable=False))

    op.create_index("ix_leads_pipeline_stage", "leads", ["pipeline_stage"])
    op.create_index("ix_leads_lead_score", "leads", ["lead_score"])

    # Contacts table
    op.create_table(
        "contacts",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("lead_id", UUID(as_uuid=False), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("job_title", sa.String(200), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("linkedin_url", sa.Text(), nullable=True),
        sa.Column("is_primary", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.Column("updated_at", sa.String(), nullable=False),
    )

    # Timeline events table
    op.create_table(
        "timeline_events",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("lead_id", UUID(as_uuid=False), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("event_type", sa.String(50), nullable=False, index=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("metadata", JSONB(), nullable=True),
        sa.Column("created_at", sa.String(), nullable=False),
    )

    # Notifications table
    op.create_table(
        "notifications",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("type", sa.String(50), nullable=False, index=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("lead_id", UUID(as_uuid=False), nullable=True),
        sa.Column("read", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
    )

    # Pipeline logs table
    op.create_table(
        "pipeline_logs",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("lead_id", UUID(as_uuid=False), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("from_stage", sa.String(50), nullable=True),
        sa.Column("to_stage", sa.String(50), nullable=False),
        sa.Column("moved_by", sa.String(50), server_default="system", nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.String(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("pipeline_logs")
    op.drop_table("notifications")
    op.drop_table("timeline_events")
    op.drop_table("contacts")

    op.drop_index("ix_leads_lead_score", table_name="leads")
    op.drop_index("ix_leads_pipeline_stage", table_name="leads")

    op.drop_column("leads", "meeting_status")
    op.drop_column("leads", "email_status")
    op.drop_column("leads", "badges")
    op.drop_column("leads", "technology_stack")
    op.drop_column("leads", "funding_info")
    op.drop_column("leads", "company_logo_url")
    op.drop_column("leads", "city")
    op.drop_column("leads", "state")
    op.drop_column("leads", "country")
    op.drop_column("leads", "revenue")
    op.drop_column("leads", "employee_count")
    op.drop_column("leads", "industry")
    op.drop_column("leads", "score_updated_at")
    op.drop_column("leads", "deal_value")
    op.drop_column("leads", "last_activity_at")
    op.drop_column("leads", "next_followup_date")
    op.drop_column("leads", "assigned_user_id")
    op.drop_column("leads", "priority")
    op.drop_column("leads", "ai_confidence")
    op.drop_column("leads", "lead_score")
    op.drop_column("leads", "pipeline_stage")
