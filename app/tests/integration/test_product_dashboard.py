from datetime import datetime

import pytest
import pytest_asyncio
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.routes.departments import DepartmentUpdate, delete_department, rename_department
from app.api.routes.pipeline import get_pipeline_dashboard, get_pipeline_insights
from app.api.routes.searches import list_searches
from app.database.base import Base
from app.dependencies import get_current_user, get_db, get_pipeline_manager
from app.main import app  # Register all model relationships.
from app.models.contact_activity import ContactActivity
from app.models.department import Department
from app.models.lead import Contact, Lead
from app.models.pipeline import Notification
from app.models.search import Search
from app.models.user import User
from app.pipeline.pipeline_manager import PipelineManager
from app.pipeline.selection import SelectedLead, SelectionResult


@pytest_asyncio.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_dashboard_filters_all_funnel_counts_and_priority_by_product_and_company(db):
    user = User(
        id="admin", company_id="company", name="Admin", email="a@example.com",
        password_hash="x", is_admin=True,
    )
    leads = [
        Lead(id="a", search_id="sa", company_id="company", business_name="A", normalized_name="a",
             department_id="one", pipeline_stage="qualified", lead_score=90, email_verified=True),
        Lead(id="b", search_id="sb", company_id="company", business_name="B", normalized_name="b",
             department_id="two", pipeline_stage="qualified", lead_score=90, email_verified=True),
        Lead(id="c", search_id="sc", company_id="company", business_name="C", normalized_name="c",
             department_id=None),
        Lead(id="d", search_id="sd", company_id="other", business_name="D", normalized_name="d",
             department_id="one", lead_score=90),
    ]
    db.add_all(leads)
    db.add_all([
        Contact(lead_id="a", company_id="company", name="A contact"),
        Contact(lead_id="b", company_id="company", name="B contact"),
        ContactActivity(lead_id="a", company_id="company", outcome="interested"),
        ContactActivity(lead_id="b", company_id="company", outcome="interested"),
    ])
    await db.flush()

    filtered = await get_pipeline_dashboard(department_id="one", db=db, user=user)
    all_products = await get_pipeline_dashboard(department_id=None, db=db, user=user)
    counts = {stage.key: stage.count for stage in filtered.funnel}
    assert filtered.kpis.total_leads == 1
    assert filtered.kpis.qualified == 1
    assert filtered.kpis.verified_email == 1
    assert filtered.kpis.hot_leads == 1
    assert counts["decision_maker_found"] == counts["contacted"] == counts["replied"] == 1
    assert [lead.id for lead in filtered.priority_leads] == ["a"]
    assert all_products.kpis.total_leads == 3  # Includes unassigned legacy records.
    assert {lead.id for lead in all_products.priority_leads} == {"a", "b", "c"}


@pytest.mark.asyncio
async def test_insights_include_only_selected_product_leads(db):
    user = User(
        id="admin", company_id="company", name="Admin", email="a@example.com",
        password_hash="x", is_admin=True,
    )
    db.add_all([
        Lead(id="a", search_id="sa", company_id="company", business_name="A", normalized_name="a",
             department_id="one"),
        Lead(id="b", search_id="sb", company_id="company", business_name="B", normalized_name="b",
             department_id="two"),
        Lead(id="c", search_id="sc", company_id="other", business_name="C", normalized_name="c",
             department_id="one"),
        Notification(id="na", company_id="company", notification_type="ai_insight", title="A",
                     lead_id="a"),
        Notification(id="nb", company_id="company", notification_type="ai_insight", title="B",
                     lead_id="b"),
        Notification(id="global", company_id="company", notification_type="ai_insight",
                     title="Company-wide"),
        Notification(id="foreign", company_id="company", notification_type="ai_insight",
                     title="Other company", lead_id="c"),
    ])
    await db.flush()
    filtered = await get_pipeline_insights(limit=20, department_id="one", db=db, user=user)
    all_products = await get_pipeline_insights(limit=20, department_id=None, db=db, user=user)
    assert [insight.id for insight in filtered] == ["na"]
    assert {insight.id for insight in all_products} == {"na", "nb", "global", "foreign"}


@pytest.mark.asyncio
async def test_search_records_product_and_links_generated_leads(db):
    class Orchestrator:
        async def run(self, **kwargs):
            running = await db.scalar(select(Search).where(Search.status == "running"))
            assert running and running.department_id == "product"
            return SelectionResult(
                query=kwargs["query"], candidates_checked=7, qualified_leads_found=1,
                requested_max_leads=kwargs["max_leads"],
                leads=[SelectedLead(business_name="HR company", confidence_score=60)],
            )

    search, leads = await PipelineManager(Orchestrator()).run_search(
        db, company_id="company", query="HR companies", max_leads=5, department_id="product"
    )
    assert search.status == "completed" and search.completed_at is not None
    assert search.max_leads == 5 and search.candidates_discovered == 7
    assert leads[0].search_id == search.id and leads[0].department_id == "product"


@pytest.mark.asyncio
async def test_failed_search_remains_in_history_without_leads(db):
    class BrokenOrchestrator:
        async def run(self, **kwargs):
            raise RuntimeError("provider failed")

    with pytest.raises(RuntimeError, match="provider failed"):
        await PipelineManager(BrokenOrchestrator()).run_search(
            db, company_id="company", query="HR companies", department_id="product"
        )
    search = await db.scalar(select(Search))
    assert search.status == "failed" and search.completed_at is not None
    assert search.department_id == "product"
    assert not (await db.execute(select(Lead))).scalars().all()


@pytest.mark.asyncio
async def test_product_deletion_blocks_leads_and_archived_searches(db):
    user = User(
        id="admin", company_id="company", name="Admin", email="a@example.com",
        password_hash="x", is_admin=True,
    )
    db.add_all([
        Department(id="lead-product", company_id="company", name="Lead product"),
        Department(id="history-product", company_id="company", name="History product"),
        Department(id="empty", company_id="company", name="Empty product"),
        Department(id="foreign", company_id="other", name="Other company"),
        Lead(id="lead", company_id="company", search_id="old", business_name="A",
             normalized_name="a", department_id="lead-product"),
        Search(id="history", company_id="company", query="old", department_id="history-product",
               archived_at=datetime.now()),
    ])
    await db.flush()
    for product_id in ("lead-product", "history-product"):
        with pytest.raises(HTTPException) as error:
            await delete_department(product_id, db=db, user=user)
        assert error.value.status_code == 409
    with pytest.raises(HTTPException) as error:
        await delete_department("foreign", db=db, user=user)
    assert error.value.status_code == 404
    await delete_department("empty", db=db, user=user)
    assert await db.get(Department, "empty") is None


@pytest.mark.asyncio
async def test_product_rename_keeps_search_and_lead_relationships(db):
    user = User(
        id="admin", company_id="company", name="Admin", email="a@example.com",
        password_hash="x", is_admin=True,
    )
    db.add_all([
        Department(id="product", company_id="company", name="Old"),
        Search(id="search", company_id="company", query="HR", department_id="product", max_leads=5,
               status="completed"),
        Lead(id="lead", company_id="company", search_id="search", business_name="A",
             normalized_name="a", department_id="product"),
    ])
    await db.flush()
    await rename_department("product", DepartmentUpdate(name="New"), db=db, user=user)
    history = await list_searches(page=1, page_size=20, archived=False, db=db, user=user)
    assert history.items[0].department_name == "New"
    assert history.items[0].max_leads == 5 and history.items[0].lead_count == 1
    lead = await db.get(Lead, "lead")
    assert lead.search_id == "search" and lead.department_id == "product"


@pytest.mark.asyncio
async def test_admin_dashboard_and_member_permissions_through_api(db):
    user = User(
        id="user", company_id="company", name="User", email="a@example.com",
        password_hash="x", is_admin=True,
    )
    db.add_all([
        Lead(id="a", search_id="sa", company_id="company", business_name="A", normalized_name="a",
             department_id="one"),
        Lead(id="b", search_id="sb", company_id="company", business_name="B", normalized_name="b",
             department_id="two"),
    ])
    await db.flush()

    async def override_db():
        yield db

    async def override_user():
        return user

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_user
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(
                "/api/v1/pipeline/dashboard", params={"department_id": "one"}
            )
            assert response.status_code == 200
            assert response.json()["kpis"]["total_leads"] == 1
            user.is_admin = False
            assert (await client.get("/api/v1/pipeline/dashboard")).status_code == 403
            assert (await client.get("/api/v1/searches")).status_code == 403
            assert (await client.post(
                "/api/v1/departments", json={"name": "New"}
            )).status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_generation_history_and_selected_leads_through_api(db):
    user = User(
        id="admin", company_id="company", name="Admin", email="a@example.com",
        password_hash="x", is_admin=True,
    )
    db.add_all([
        Department(id="product", company_id="company", name="Recruiting"),
        Department(id="foreign", company_id="other", name="Other"),
    ])
    await db.commit()

    class Orchestrator:
        async def run(self, **kwargs):
            if kwargs["query"] == "fail":
                raise RuntimeError("test failure")
            return SelectionResult(
                query=kwargs["query"], candidates_checked=3, qualified_leads_found=1,
                requested_max_leads=kwargs["max_leads"],
                leads=[SelectedLead(
                    business_name="Acme", email="hr@example.com", confidence_score=75
                )],
            )

    async def override_db():
        yield db

    async def override_user():
        return user

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_pipeline_manager] = lambda: PipelineManager(Orchestrator())
    try:
        transport = ASGITransport(app=app, raise_app_exceptions=False)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            invalid = await client.post(
                "/api/v1/leads/search", json={"query": "HR", "department_id": "foreign"}
            )
            assert invalid.status_code == 400
            result = await client.post(
                "/api/v1/leads/search",
                json={"query": "HR", "department_id": "product", "max_leads": 5},
            )
            assert result.status_code == 200
            search_id = result.json()["search_id"]
            lead = await db.scalar(select(Lead).where(Lead.search_id == search_id))
            db.add(Contact(
                lead_id=lead.id, company_id="company", name="HR manager", is_primary=True
            ))
            await db.commit()
            records = (await client.get("/api/v1/searches")).json()["items"]
            assert records[0]["department_name"] == "Recruiting"
            assert records[0]["max_leads"] == 5 and records[0]["lead_count"] == 1
            response = await client.get("/api/v1/leads", params={"search_id": search_id})
            leads = response.json()["items"]
            assert len(leads) == 1 and leads[0]["contact_name"] == "HR manager"
            assert leads[0]["department_name"] == "Recruiting"
            failed = await client.post(
                "/api/v1/leads/search", json={"query": "fail", "department_id": "product"}
            )
            assert failed.status_code == 500
            history = (await client.get("/api/v1/searches")).json()["items"]
            assert {record["status"] for record in history} == {"completed", "failed"}
    finally:
        app.dependency_overrides.pop(get_pipeline_manager, None)
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
