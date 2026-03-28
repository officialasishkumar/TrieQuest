from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.db as db_module
import app.main as main_module
from app.config import get_settings
from app.models import Base, User
from app.security import hash_password


def test_admin_login_uses_email_label_and_accepts_email_field(monkeypatch) -> None:
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
                email="officialasishkumar@gmail.com",
                username="asish",
                display_name="Asish Kumar",
                bio="",
                favorite_topic=None,
                favorite_platform=None,
                avatar_url=None,
                password_hash=hash_password("TrieQuest!123"),
            )
        )
        db.commit()

    monkeypatch.setattr(main_module, "engine", engine)
    monkeypatch.setattr(db_module, "SessionLocal", session_local)

    try:
        app = main_module.create_app()

        with TestClient(app) as client:
            login_page = client.get("/admin/login")
            assert login_page.status_code == 200
            assert "Email" in login_page.text
            assert "Username" not in login_page.text

            login_response = client.post(
                "/admin/login",
                data={"email": "officialasishkumar@gmail.com", "password": "TrieQuest!123"},
                follow_redirects=False,
            )

            assert login_response.status_code == 302
            assert login_response.headers["location"].endswith("/admin/")

            admin_home = client.get("/admin/")
            assert admin_home.status_code == 200
    finally:
        get_settings.cache_clear()
