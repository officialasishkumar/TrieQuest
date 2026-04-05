# TrieQuest Backend

Go backend for authentication, squads, friends, shared problem ingestion, analytics, and challenges.

## Run

```bash
go run ./cmd/triequest migrate up
go run ./cmd/triequest serve
```

## Migrations

Run schema updates explicitly before a production rollout:

```bash
go run ./cmd/triequest migrate up
```

## Verify

```bash
go test ./...
go build ./cmd/triequest
```

## Key Settings

- Local development can use SQLite or MySQL-compatible databases.
- Production requires MySQL-compatible storage, a non-default `TRIEQUEST_SECRET_KEY` that is at least 32 characters long, docs disabled, and demo seeding disabled.
- Keep `TRIEQUEST_DATABASE_AUTO_MIGRATE=false` in production and run `go run ./cmd/triequest migrate up` separately before the service starts.
- Startup schema checks are read-only when `TRIEQUEST_DATABASE_AUTO_MIGRATE=false`; the API will tell you to run `triequest migrate up` instead of mutating production schema state on boot.
- `TRIEQUEST_RUN_STARTUP_TASKS_ON_APP_START` controls whether demo seeding and in-memory search-index warmup run during API startup.
- `TRIEQUEST_AUTH_RATE_LIMIT_MAX_ATTEMPTS` and `TRIEQUEST_AUTH_RATE_LIMIT_WINDOW_SECONDS` control login throttling.
- `TRIEQUEST_ADMIN_RATE_LIMIT_MAX_ATTEMPTS` and `TRIEQUEST_ADMIN_RATE_LIMIT_WINDOW_SECONDS` control admin login throttling.
- `TRIEQUEST_FRIEND_LOOKUP_RATE_LIMIT_MAX_ATTEMPTS` and `TRIEQUEST_FRIEND_LOOKUP_RATE_LIMIT_WINDOW_SECONDS` control friend-search throttling.
- `TRIEQUEST_ENABLE_ADMIN` stays `false` by default; only enable it together with `TRIEQUEST_ADMIN_EMAILS`.

## Problem Metadata

Problem URLs are resolved through a metadata service that normalizes platform links and returns a consistent problem snapshot. The backend supports LeetCode, Codeforces, CodeChef, AtCoder, HackerRank, TopCoder, GeeksForGeeks, and Coder-style challenge links.

## Container Startup

The production image now starts the Go binary directly on port `8000`. Database migrations are intentionally not run at boot in production, and the API does not create migration-tracking tables during a production readiness check.
