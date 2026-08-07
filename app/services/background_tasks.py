import asyncio
import time

from app.core.logging import get_logger
from app.database.session import get_db_session

logger = get_logger()

PERIODIC_INTERVAL_SECONDS = 120


async def _run_periodic_jobs_once() -> None:
    async for session in get_db_session():
        try:
            from app.dependencies import get_automation_service

            service = get_automation_service()
            transitions = await service.evaluate_auto_transitions(session)
            insights = await service.generate_insights(session)
            logger.info(
                "background_jobs_completed",
                transitions=len(transitions),
                insights=len(insights),
            )
        except Exception as e:
            logger.error("background_jobs_failed", error=str(e))
        break


class BackgroundTaskRunner:
    def __init__(self, interval_seconds: int = PERIODIC_INTERVAL_SECONDS) -> None:
        self._interval = interval_seconds
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        if self._task is None:
            self._task = asyncio.create_task(self._loop(), name="background-jobs")

    async def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _loop(self) -> None:
        while True:
            started = time.monotonic()
            try:
                await _run_periodic_jobs_once()
            except Exception as e:
                logger.error("background_loop_iteration_error", error=str(e))
            elapsed = time.monotonic() - started
            await asyncio.sleep(max(1.0, self._interval - elapsed))