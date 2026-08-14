from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
import re

import sentry_sdk
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from sqlalchemy import text

from app.api.routes import api_router
from app.config import settings
from app.core.logging import get_logger, setup_logging
from app.database.base import Base
from app.database.session import _get_engine
from app.services.background_tasks import BackgroundTaskRunner
from app.websocket.manager import manager

logger = get_logger()

_background_runner: BackgroundTaskRunner | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    setup_logging(log_level=settings.log_level)
    if settings.sentry_dsn:
        sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.app_env)

    engine = _get_engine()
    if engine:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        migration_statements = [
            "ALTER TABLE searches ADD COLUMN archived_at TIMESTAMP",
            "ALTER TABLE leads ADD COLUMN department_id VARCHAR(36)",
            "ALTER TABLE searches ADD COLUMN department_id VARCHAR(36)",
        ]
        for stmt in migration_statements:
            try:
                async with engine.begin() as conn:
                    await conn.execute(text(stmt))
            except Exception:
                pass
        logger.info("database_tables_created")
    else:
        logger.warning("database_not_available")

    global _background_runner
    if settings.background_jobs_enabled:
        _background_runner = BackgroundTaskRunner()
        await _background_runner.start()
        logger.info("background_jobs_scheduler_started")

    yield

    if _background_runner is not None:
        await _background_runner.stop()
        _background_runner = None
        logger.info("background_jobs_scheduler_stopped")


app = FastAPI(
    title="Lead Generator API",
    description="Precision lead generation agent focused on accuracy and verified contactability",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.app_debug else None,
    redoc_url="/redoc" if settings.app_debug else None,
)

app.include_router(api_router)


@app.middleware("http")
async def collapse_double_slashes(request, call_next):
    if "//" in request.url.path:
        path = re.sub("/{2,}", "/", request.url.path)
        request.scope["path"] = path
        request.scope["raw_path"] = path.encode()
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/pipeline")
async def pipeline_websocket(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback

    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": str(exc)}},
    )


@app.get("/")
async def api_root():
    return {
        "service": "Lead Generator API",
        "version": "0.1.0",
        "status": "ok",
        "health": "/api/v1/health",
        "docs": "/docs",
    }


