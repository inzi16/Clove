from __future__ import annotations

from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables or ``.env``."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    app_name: str = "Clove API"
    environment: str = Field(
        default="development",
        validation_alias=AliasChoices("ENVIRONMENT", "APP_ENV"),
    )
    debug: bool = False
    api_prefix: str = "/api"
    database_url: str = "sqlite+aiosqlite:///./recruitment.db"
    dev_user_id: str = "demo-user"
    seed_demo_data: bool = True
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    embedding_dimensions: int = Field(default=96, ge=16, le=2048)
    embedding_provider: str = "local_feature_hash"
    embedding_model: str = "feature-hash-v1"
    milvus_enabled: bool = False
    milvus_uri: str = "http://localhost:19530"
    milvus_token: str | None = None
    milvus_collection: str = "candidate_embeddings"

    google_client_id: str | None = None
    google_client_secret: str | None = None
    azure_client_id: str | None = None
    azure_client_secret: str | None = None
    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
