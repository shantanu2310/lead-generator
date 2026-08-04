import asyncio

from celery import shared_task

from app.celery_app import celery_app
from app.core.logging import get_logger
from app.database.session import get_db_session

logger = get_logger()


async def _run_auto_transition() -> None:
    from app.dependencies import get_automation_service

    service = get_automation_service()
    async for session in get_db_session():
        try:
            await service.evaluate_auto_transitions(session)
        except Exception as e:
            logger.error("auto_transition_failed", error=str(e))


async def _run_generate_insights() -> None:
    from app.dependencies import get_automation_service

    service = get_automation_service()
    async for session in get_db_session():
        try:
            await service.generate_insights(session)
        except Exception as e:
            logger.error("insight_generation_failed", error=str(e))


@celery_app.task(bind=True, max_retries=3)
def auto_transition_leads(self):
    try:
        asyncio.run(_run_auto_transition())
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(bind=True, max_retries=3)
def generate_insights(self):
    try:
        asyncio.run(_run_generate_insights())
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
