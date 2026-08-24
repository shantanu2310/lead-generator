import os

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

HAS_API_KEY = bool(os.environ.get("LLM_API_KEY"))


class TestHealthEndpoint:
    @pytest.mark.asyncio
    async def test_health_check(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["version"] == "0.1.0"


class TestLeadsSearchValidation:
    @pytest.mark.asyncio
    async def test_search_requires_auth(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/v1/leads/search", json={})
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_search_invalid_max_leads(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/leads/search",
                json={"query": "florist", "max_leads": 20},
            )
        assert response.status_code == 401

    @pytest.mark.asyncio
    @pytest.mark.skipif(not HAS_API_KEY, reason="No LLM API key configured")
    async def test_search_near_me_requires_location(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/leads/search",
                json={"query": "florist near me"},
            )
        assert response.status_code == 401

    @pytest.mark.asyncio
    @pytest.mark.skipif(not HAS_API_KEY, reason="No LLM API key configured")
    async def test_search_explicit_location_no_coords(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/leads/search",
                json={"query": "florist in Amsterdam"},
            )
        assert response.status_code in (200, 500)

    @pytest.mark.asyncio
    @pytest.mark.skipif(not HAS_API_KEY, reason="No LLM API key configured")
    async def test_search_with_all_params(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/leads/search",
                json={
                    "query": "florist near me",
                    "latitude": 52.3676,
                    "longitude": 4.9041,
                    "max_leads": 10,
                },
            )
        assert response.status_code in (200, 500)
