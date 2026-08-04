from pathlib import Path

from fastapi import APIRouter, Depends

from app.api.schemas.requests import PipelineSettingsUpdate, ProviderSettingsUpdate
from app.config import settings
from app.dependencies import get_current_admin

router = APIRouter(dependencies=[Depends(get_current_admin)])

ENV_PATH = Path(".env")

PROVIDER_FIELDS = [
    ("llm", "llm_api_key", "OpenAI LLM"),
    ("google_places", "google_places_api_key", "Google Places"),
    ("brave_search", "brave_search_api_key", "Brave Search"),
    ("hunter", "hunter_api_key", "Hunter.io"),
]

PIPELINE_FIELDS = [
    ("max_leads", "Max Leads"),
    ("minimum_lead_score", "Minimum Lead Score"),
    ("default_candidate_target", "Default Candidate Target"),
    ("max_website_pages", "Max Website Pages"),
    ("website_concurrency", "Website Concurrency"),
    ("provider_concurrency", "Provider Concurrency"),
]


def _mask(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 8:
        return "*" * len(key)
    return f"{key[:4]}...{key[-4:]}"


def _is_placeholder(value: str) -> bool:
    lowered = value.lower()
    return "your-" in lowered or "your_" in lowered or "placeholder" in lowered or "xxxx" in lowered


def _update_env(updates: dict[str, str]) -> None:
    if not ENV_PATH.exists():
        ENV_PATH.touch()

    lines = ENV_PATH.read_text(encoding="utf-8").splitlines()
    existing = {
        line.split("=", 1)[0].strip().upper(): line
        for line in lines
        if "=" in line and not line.strip().startswith("#")
    }

    for key, value in updates.items():
        line = f"{key}={value}"
        if key.upper() in existing:
            lines = [line if l == existing[key.upper()] else l for l in lines]
        else:
            lines.append(line)

    ENV_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


@router.get("/settings")
async def get_settings() -> dict:
    providers = []
    for key, attr, name in PROVIDER_FIELDS:
        value = getattr(settings, attr)
        providers.append({
            "key": key,
            "name": name,
            "configured": bool(value) and not _is_placeholder(value),
            "masked_key": _mask(value),
        })

    pipeline = {field: getattr(settings, field) for field, _ in PIPELINE_FIELDS}
    pipeline["llm_model"] = settings.llm_model

    return {
        "providers": providers,
        "pipeline": pipeline,
        "app": {
            "version": "0.1.0",
            "environment": settings.app_env,
            "database": settings.database_url.split("://")[0],
        },
    }


@router.patch("/settings/providers")
async def update_providers(body: ProviderSettingsUpdate) -> dict:
    updates = {}
    for key, attr, _ in PROVIDER_FIELDS:
        if body.model_dump().get(attr) is not None:
            updates[attr] = body.model_dump()[attr].strip()

    if body.llm_model is not None:
        updates["llm_model"] = body.llm_model.strip()

    if updates:
        _update_env(updates)
        for attr, value in updates.items():
            setattr(settings, attr, value)

    return await get_settings()


@router.patch("/settings/pipeline")
async def update_pipeline(body: PipelineSettingsUpdate) -> dict:
    updates = {k: str(v) for k, v in body.model_dump().items() if v is not None}
    if updates:
        _update_env(updates)
        for attr, value in updates.items():
            setattr(settings, attr, int(value))

    return await get_settings()
