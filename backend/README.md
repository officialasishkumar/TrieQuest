# TrieQuest Backend

FastAPI backend for authentication, squads, friends, shared problem ingestion, and analytics.

## Run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload --port 8000
```

## Verify

```bash
./.venv/bin/pytest
./.venv/bin/python -m compileall app
```

## Key Settings

- Local development defaults to SQLite.
- Production requires MySQL, a non-default `TRIEQUEST_SECRET_KEY` that is at least 32 characters long, and demo seeding disabled.
- `TRIEQUEST_AUTH_RATE_LIMIT_MAX_ATTEMPTS` and `TRIEQUEST_AUTH_RATE_LIMIT_WINDOW_SECONDS` control login throttling.
- `TRIEQUEST_FRIEND_LOOKUP_RATE_LIMIT_MAX_ATTEMPTS` and `TRIEQUEST_FRIEND_LOOKUP_RATE_LIMIT_WINDOW_SECONDS` control friend-search throttling.
- `TRIEQUEST_ENABLE_ADMIN` stays `false` by default; only enable it together with `TRIEQUEST_ADMIN_EMAILS`.

## Problem Metadata

Problem URLs are resolved through a metadata service that normalizes platform links and returns a consistent problem snapshot. The current backend supports LeetCode, Codeforces, CodeChef, AtCoder, HackerRank, TopCoder, GeeksForGeeks, and Coder-style challenge links.

## Container Startup

The production image runs `python -m app.bootstrap` before starting Uvicorn so the database is initialized and demo data can be seeded when enabled.
