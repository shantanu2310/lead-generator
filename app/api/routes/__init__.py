from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.leads import router as leads_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health_router, tags=["health"])
api_router.include_router(leads_router, tags=["leads"])
