from sqlalchemy import select

from app.config import get_settings
from app.db import SessionLocal, init_db
from app.models import User
from app.services.seed import seed_database
from app.services.username_bloom import load_usernames


def run_startup_tasks() -> None:
    settings = get_settings()
    init_db()
    if settings.seed_demo_data:
        with SessionLocal() as db:
            seed_database(db)
    with SessionLocal() as db:
        usernames = list(db.scalars(select(User.username)).all())
        load_usernames(usernames)


def main() -> None:
    run_startup_tasks()


if __name__ == "__main__":
    main()
