from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.leads import router as leads_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.pipeline import router as pipeline_router
from app.api.routes.searches import router as searches_router
from app.api.routes.settings import router as settings_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, tags=["auth"])
api_router.include_router(leads_router, tags=["leads"])
api_router.include_router(pipeline_router, tags=["pipeline"])
api_router.include_router(notifications_router, tags=["notifications"])
api_router.include_router(searches_router, tags=["searches"])
api_router.include_router(settings_router, tags=["settings"])
