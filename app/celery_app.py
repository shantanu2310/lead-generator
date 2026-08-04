from celery import Celery

from app.config import settings

celery_app = Celery(
    "leadgen",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.celery_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_ignore_result=False,
    result_expires=3600,
    beat_schedule={
        "auto-transition-leads": {
            "task": "app.celery_tasks.auto_transition_leads",
            "schedule": 300.0,
        },
        "generate-insights": {
            "task": "app.celery_tasks.generate_insights",
            "schedule": 900.0,
        },
    },
)
