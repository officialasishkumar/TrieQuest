from functools import lru_cache
from typing import Annotated, Any, Literal
from urllib.parse import urlparse

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


DEFAULT_SECRET_KEY = "change-this-secret-key-before-production-please"
LOCAL_HTTP_HOSTS = {"localhost", "127.0.0.1"}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="TRIEQUEST_",
        extra="ignore",
    )

    app_name: str = "TrieQuest API"
    environment: Literal["development", "production", "test"] = "development"
    database_url: str = "sqlite:///./triequest.db"
    database_auto_migrate: bool = False
    database_pool_size: int = 10
    database_max_overflow: int = 20
    database_pool_recycle_seconds: int = 1800
    database_ssl_ca_path: str | None = None
    database_ssl_verify_cert: bool = False
    database_ssl_verify_identity: bool = False
    secret_key: str = DEFAULT_SECRET_KEY
    algorithm: str = "HS256"
    token_issuer: str = "triequest-api"
    access_token_expire_minutes: int = 1440
    enable_docs: bool = True
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:8080", "http://127.0.0.1:8080"]
    )
    allowed_hosts: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["localhost", "127.0.0.1", "triequest.local"]
    )
    seed_demo_data: bool = True
    run_startup_tasks_on_app_start: bool = True
    auth_rate_limit_max_attempts: int = 5
    auth_rate_limit_window_seconds: int = 300
    friend_lookup_rate_limit_max_attempts: int = 20
    friend_lookup_rate_limit_window_seconds: int = 60
    enable_admin: bool = False
    admin_emails: Annotated[list[str], NoDecode] = Field(default_factory=list)
    admin_rate_limit_max_attempts: int = 5
    admin_rate_limit_window_seconds: int = 300
    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str = "http://localhost:5173/auth/google/callback"

    @field_validator("cors_origins", "allowed_hosts", "admin_emails", mode="before")
    @classmethod
    def split_comma_separated_values(cls, value: Any) -> Any:
        if isinstance(value, str):
            seen: set[str] = set()
            items: list[str] = []
            for item in value.split(","):
                cleaned = item.strip()
                if cleaned and cleaned not in seen:
                    seen.add(cleaned)
                    items.append(cleaned)
            return items
        return value

    @field_validator("admin_emails", mode="after")
    @classmethod
    def normalize_admin_emails(cls, value: list[str]) -> list[str]:
        seen: set[str] = set()
        normalized: list[str] = []
        for item in value:
            cleaned = item.strip().lower()
            if cleaned and cleaned not in seen:
                seen.add(cleaned)
                normalized.append(cleaned)
        return normalized

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.environment != "production":
            return self

        if self.secret_key == DEFAULT_SECRET_KEY:
            raise ValueError("TRIEQUEST_SECRET_KEY must be set to a non-default value in production.")
        if len(self.secret_key) < 32:
            raise ValueError("TRIEQUEST_SECRET_KEY must be at least 32 characters long in production.")
        if self.database_url.startswith("sqlite"):
            raise ValueError("Production deployments must use MySQL, not SQLite.")
        if self.seed_demo_data:
            raise ValueError("Production deployments must disable demo data seeding.")
        if self.enable_docs:
            raise ValueError("Production deployments must disable API docs.")
        if "*" in self.cors_origins:
            raise ValueError("Production deployments must not allow wildcard CORS origins.")
        if "*" in self.allowed_hosts:
            raise ValueError("Production deployments must not allow wildcard hosts.")
        for origin in self.cors_origins:
            parsed_origin = urlparse(origin)
            if parsed_origin.scheme != "https" and parsed_origin.hostname not in LOCAL_HTTP_HOSTS:
                raise ValueError("Production CORS origins must use HTTPS unless they target localhost.")
        if self.enable_admin and not self.admin_emails:
            raise ValueError("TRIEQUEST_ADMIN_EMAILS must be set when TRIEQUEST_ENABLE_ADMIN=true.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
