# Render Deployment

Current recommended production shape:

- frontend on Vercel
- backend on Render
- MySQL-compatible database on TiDB Cloud Starter

This avoids self-hosting the API on a VM and removes the need to expose your company VM to the public internet.

## Why this setup

- Render provides the public HTTPS backend URL.
- TiDB Cloud Starter is MySQL-compatible and works with the Go MySQL driver.
- Vercel continues to host the frontend separately with `VITE_API_BASE_URL` pointed at the Render backend.

Render free web services spin down after 15 minutes without traffic, so the first request after idle can be slow. If you need consistent uptime, move the backend to a paid Render plan.

## Backend target

Use a Render web service named `triequest-api`.

- Expected backend URL: `https://triequest-api.onrender.com`
- Health check: `https://triequest-api.onrender.com/api/health`

This repo includes [`render.yaml`](./render.yaml) for that backend service.

## Database target

Use TiDB Cloud Starter.

- TiDB is MySQL-compatible.
- TiDB Cloud Starter requires TLS.
- TiDB Cloud Starter closes idle connections after 5 minutes, so this repo sets `TRIEQUEST_DATABASE_POOL_RECYCLE_SECONDS=300` for Render.

TiDB documents configuring a public connection and an IP access list before the first connection.

## Render env values

Set these on the Render backend service:

```dotenv
TRIEQUEST_ENVIRONMENT=production
TRIEQUEST_SECRET_KEY=<generate a long random secret>
TRIEQUEST_DATABASE_URL=mysql://USER:PASSWORD@HOST:4000/triequest?parseTime=true&charset=utf8mb4
TRIEQUEST_DATABASE_SSL_CA_PATH=/etc/ssl/certs/ca-certificates.crt
TRIEQUEST_DATABASE_SSL_VERIFY_CERT=true
TRIEQUEST_DATABASE_SSL_VERIFY_IDENTITY=true
TRIEQUEST_CORS_ORIGINS=https://trie-quest.vercel.app
TRIEQUEST_ALLOWED_HOSTS=triequest-api.onrender.com,127.0.0.1,localhost
TRIEQUEST_DATABASE_AUTO_MIGRATE=false
TRIEQUEST_SEED_DEMO_DATA=false
TRIEQUEST_ENABLE_ADMIN=false
TRIEQUEST_ADMIN_EMAILS=
TRIEQUEST_ENABLE_DOCS=false
TRIEQUEST_DATABASE_POOL_RECYCLE_SECONDS=300
```

If Render gives you a different service hostname, update `TRIEQUEST_ALLOWED_HOSTS` to match it exactly.

## TiDB setup

1. Create a TiDB Cloud Starter cluster.
2. Open the cluster's connect dialog.
3. Choose a public connection.
4. Generate a password.
5. Copy the host, port, username, password, and database name.
6. Add Render's outbound IP ranges to TiDB's IP access list.
7. Build the `TRIEQUEST_DATABASE_URL` from those values.
8. Run `go run ./cmd/triequest migrate up` against the target database before starting the web service.

The Go API only performs a read-only schema version check during `serve` when `TRIEQUEST_DATABASE_AUTO_MIGRATE=false`. It will not create `schema_migrations` or adopt Alembic state on production boot; explicit `migrate up` is the only path that mutates migration metadata.

Render documents where to find outbound IP ranges:

- open the service page
- click `Connect`
- open the `Outbound` tab

## Frontend setup

Your Vercel frontend should use:

```dotenv
VITE_API_BASE_URL=https://triequest-api.onrender.com
```

The frontend is already build-time configured for an absolute API base URL in [`frontend/src/lib/api.ts`](./frontend/src/lib/api.ts).

## Repo files involved

- [`render.yaml`](./render.yaml): Render Blueprint for the backend
- [`.env.example`](./.env.example): example production env values for Render + TiDB
- [`backend/Dockerfile`](./backend/Dockerfile): builds and runs the Go backend image
- [`backend/cmd/triequest`](./backend/cmd/triequest): Go entrypoint for `serve` and `migrate up`

## Security notes

- The VM-specific reverse proxy path has been removed from the repo.
- Do not commit TiDB credentials or Render secrets.
- Keep `TRIEQUEST_ENABLE_DOCS=false` in production.
- Keep `TRIEQUEST_SEED_DEMO_DATA=false` in production.
- Keep `TRIEQUEST_DATABASE_AUTO_MIGRATE=false` in production and run schema migration explicitly before rollout.
- The `serve` path performs read-only schema verification only; it does not create or backfill migration tracking state on startup.
- Keep `TRIEQUEST_ENABLE_ADMIN=false` unless you explicitly configure `TRIEQUEST_ADMIN_EMAILS`.
- Auth tokens are still stored in browser `localStorage`, so frontend XSS remains a meaningful risk.
- Rate limiting is still in-memory and process-local, so it resets on restarts and is strongest with a single backend instance.
