from __future__ import annotations

from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.main as main_module
from app.config import get_settings
from app.db import get_db
from app.models import Base, User
from app.security import hash_password
from app.services.rate_limit import FixedWindowRateLimiter


def test_login_rate_limiting_and_security_headers(monkeypatch) -> None:
    monkeypatch.setenv("TRIEQUEST_RUN_STARTUP_TASKS_ON_APP_START", "false")
    monkeypatch.setenv("TRIEQUEST_ALLOWED_HOSTS", "testserver,localhost,127.0.0.1")
    get_settings.cache_clear()

    engine = create_engine(
        "sqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)

    with Session(engine) as db:
        db.add(
            User(
                email="alex@example.com",
                username="alex",
                display_name="Alex Rivera",
                bio="",
                favorite_topic=None,
                favorite_platform=None,
                avatar_url=None,
                password_hash=hash_password("TrieQuest!123"),
            )
        )
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        db = session_local()
        try:
            yield db
        finally:
            db.close()

    limiter = FixedWindowRateLimiter(max_attempts=2, window_seconds=300)
    monkeypatch.setattr(main_module, "get_auth_rate_limiter", lambda: limiter)

    app = main_module.create_app()
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        for _ in range(2):
            response = client.post(
                "/api/auth/login",
                json={"identifier": "alex", "password": "wrong-password"},
            )
            assert response.status_code == 401
            assert response.headers["cache-control"] == "no-store"
            assert response.headers["x-content-type-options"] == "nosniff"

        blocked_response = client.post(
            "/api/auth/login",
            json={"identifier": "alex", "password": "wrong-password"},
        )

    assert blocked_response.status_code == 429
    retry_after = int(blocked_response.headers["retry-after"])
    assert 1 <= retry_after <= 300


def test_docs_can_be_disabled(monkeypatch) -> None:
    monkeypatch.setenv("TRIEQUEST_RUN_STARTUP_TASKS_ON_APP_START", "false")
    monkeypatch.setenv("TRIEQUEST_ALLOWED_HOSTS", "testserver,localhost,127.0.0.1")
    monkeypatch.setenv("TRIEQUEST_ENABLE_DOCS", "false")
    get_settings.cache_clear()

    try:
        app = main_module.create_app()

        with TestClient(app) as client:
            response = client.get("/docs")

        assert response.status_code == 404
    finally:
        get_settings.cache_clear()


def test_google_auth_rejects_unverified_google_email(monkeypatch) -> None:
    monkeypatch.setenv("TRIEQUEST_RUN_STARTUP_TASKS_ON_APP_START", "false")
    monkeypatch.setenv("TRIEQUEST_ALLOWED_HOSTS", "testserver,localhost,127.0.0.1")
    get_settings.cache_clear()

    engine = create_engine(
        "sqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)

    def override_get_db() -> Generator[Session, None, None]:
        db = session_local()
        try:
            yield db
        finally:
            db.close()

    async def fake_exchange_code_for_user(_code: str):
        from app.services.google_oauth import GoogleUser

        return GoogleUser(
            google_id="gid-123",
            email="alex@example.com",
            name="Alex Rivera",
            picture=None,
            email_verified=False,
        )

    app = main_module.create_app()
    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr("app.services.google_oauth.exchange_code_for_user", fake_exchange_code_for_user)

    try:
        with TestClient(app) as client:
            response = client.post("/api/auth/google", json={"code": "test-code"})

        assert response.status_code == 401
        assert response.json()["detail"] == "Google account email must be verified before sign-in."
    finally:
        get_settings.cache_clear()
