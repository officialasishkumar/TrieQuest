import pytest
from pydantic import ValidationError

from app.config import DEFAULT_SECRET_KEY, Settings


def test_production_settings_require_non_default_secret_key() -> None:
    with pytest.raises(ValidationError, match="non-default value"):
        Settings(
            environment="production",
            database_url="mysql+pymysql://user:pass@db:3306/triequest",
            secret_key=DEFAULT_SECRET_KEY,
            seed_demo_data=False,
        )


def test_settings_accept_comma_separated_env_lists(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TRIEQUEST_ALLOWED_HOSTS", "testserver,localhost,127.0.0.1")
    monkeypatch.setenv("TRIEQUEST_CORS_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080")

    settings = Settings()

    assert settings.allowed_hosts == ["testserver", "localhost", "127.0.0.1"]
    assert settings.cors_origins == ["http://localhost:8080", "http://127.0.0.1:8080"]


def test_production_settings_require_non_sqlite_database() -> None:
    with pytest.raises(ValidationError, match="must use MySQL"):
        Settings(
            environment="production",
            database_url="sqlite:///./triequest.db",
            secret_key="this-is-a-long-enough-secret-for-production",
            seed_demo_data=False,
        )


def test_production_settings_require_long_secret_key() -> None:
    with pytest.raises(ValidationError, match="at least 32 characters"):
        Settings(
            environment="production",
            database_url="mysql+pymysql://user:pass@db:3306/triequest",
            secret_key="short-secret-key",
            seed_demo_data=False,
        )


def test_production_settings_require_demo_seeding_to_be_disabled() -> None:
    with pytest.raises(ValidationError, match="disable demo data seeding"):
        Settings(
            environment="production",
            database_url="mysql+pymysql://user:pass@db:3306/triequest",
            secret_key="this-is-a-long-enough-secret-for-production",
            seed_demo_data=True,
        )


def test_settings_accept_database_ssl_configuration() -> None:
    settings = Settings(
        database_ssl_ca_path="/etc/ssl/certs/ca-certificates.crt",
        database_ssl_verify_cert=True,
        database_ssl_verify_identity=True,
    )

    assert settings.database_ssl_ca_path == "/etc/ssl/certs/ca-certificates.crt"
    assert settings.database_ssl_verify_cert is True
    assert settings.database_ssl_verify_identity is True


def test_settings_accept_and_normalize_admin_emails_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TRIEQUEST_ADMIN_EMAILS", " Admin@Example.com,admin@example.com,ops@example.com ")

    settings = Settings()

    assert settings.admin_emails == ["admin@example.com", "ops@example.com"]


def test_production_settings_reject_wildcard_cors_origins() -> None:
    with pytest.raises(ValidationError, match="wildcard CORS origins"):
        Settings(
            environment="production",
            database_url="mysql+pymysql://user:pass@db:3306/triequest",
            secret_key="this-is-a-long-enough-secret-for-production",
            seed_demo_data=False,
            enable_docs=False,
            cors_origins=["*"],
        )


def test_production_settings_require_docs_to_be_disabled() -> None:
    with pytest.raises(ValidationError, match="disable API docs"):
        Settings(
            environment="production",
            database_url="mysql+pymysql://user:pass@db:3306/triequest",
            secret_key="this-is-a-long-enough-secret-for-production",
            seed_demo_data=False,
            enable_docs=True,
        )


def test_production_settings_require_https_cors_origins() -> None:
    with pytest.raises(ValidationError, match="must use HTTPS"):
        Settings(
            environment="production",
            database_url="mysql+pymysql://user:pass@db:3306/triequest",
            secret_key="this-is-a-long-enough-secret-for-production",
            seed_demo_data=False,
            enable_docs=False,
            cors_origins=["http://frontend.example.com"],
        )


def test_production_settings_require_admin_emails_when_admin_is_enabled() -> None:
    with pytest.raises(ValidationError, match="TRIEQUEST_ADMIN_EMAILS"):
        Settings(
            environment="production",
            database_url="mysql+pymysql://user:pass@db:3306/triequest",
            secret_key="this-is-a-long-enough-secret-for-production",
            seed_demo_data=False,
            enable_docs=False,
            enable_admin=True,
        )
