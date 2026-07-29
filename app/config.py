from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_env: str = "development"
    app_debug: bool = False
    log_level: str = "INFO"

    # Database
    database_url: str = "postgresql+asyncpg://leadgen:leadgen_dev@localhost:5432/leadgen"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # LLM (OpenAI)
    llm_api_key: str = ""
    llm_model: str = "gpt-4o"

    # Google Places API
    google_places_api_key: str = ""

    # Brave Search API
    brave_search_api_key: str = ""

    # Hunter.io API
    hunter_api_key: str = ""

    # Sentry
    sentry_dsn: str = ""

    # Pipeline settings
    default_candidate_target: int = 50
    max_candidate_target: int = 60
    max_leads: int = 15
    minimum_lead_score: int = 50
    max_website_pages: int = 5
    website_concurrency: int = 5
    provider_concurrency: int = 5

    # Deduplication thresholds
    name_similarity_threshold: float = 0.90
    address_similarity_threshold: float = 0.85


settings = Settings()
