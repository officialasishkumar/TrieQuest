# TrieQuest

TrieQuest is a two-part workspace:

- `frontend/`: React + Vite client
- `backend/`: FastAPI API for auth, friends, squads, shared problems, platform metadata resolution, and analytics

## Quick Start

Frontend:

```bash
npm --prefix frontend ci
npm run dev:frontend
```

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn app.main:app --reload --port 8000
```

The frontend proxies `/api` to `http://127.0.0.1:8000` in development.
The backend uses SQLite by default for local work.
The production baseline in this repo is MySQL 8.4 via `compose.yaml`.

Supported problem links currently include LeetCode, Codeforces, CodeChef, AtCoder, HackerRank, TopCoder, GeeksForGeeks, and Coder-style challenge links. The backend resolves problem metadata through a provider-style service and seeds the app with demo squads and shared problems.

## Verification

Frontend:

```bash
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend test -- --run
npm --prefix frontend run build
```

Backend:

```bash
cd backend
./.venv/bin/pytest
./.venv/bin/python -m compileall app
```

## Security And Production

- Set `TRIEQUEST_SECRET_KEY` to a strong secret that is at least 32 characters long.
- Set `TRIEQUEST_ALLOWED_HOSTS` and `TRIEQUEST_CORS_ORIGINS` for the domains you actually serve.
- Keep `TRIEQUEST_SEED_DEMO_DATA=false` in production.
- Login attempts are rate-limited, JWTs carry issuer and token-type claims, and API responses send defensive security headers.

To run the container stack:

```bash
docker compose up --build
```

Copy `.env.example` to `.env` first and replace the placeholder secrets.

## Demo Account

If demo seeding is enabled, sign in with:

- Email: `alex@example.com`
- Password: `TrieQuest!123`
