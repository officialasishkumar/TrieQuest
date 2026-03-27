# Render Deployment

Current recommended production shape:

- frontend on Vercel
- backend on Render
- MySQL-compatible database on TiDB Cloud Starter

This avoids self-hosting the API on a VM and removes the need to expose your company VM to the public internet.

## Why this setup

- Render provides the public HTTPS backend URL.
- TiDB Cloud Starter is MySQL-compatible and works with SQLAlchemy + PyMySQL.
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

For the Python + SQLAlchemy path, TiDB documents using a CA path plus:

- `ssl_verify_cert=True`
- `ssl_verify_identity=True`

It also documents configuring a public connection and an IP access list before the first connection.

## Render env values

Set these on the Render backend service:

```dotenv
TRIEQUEST_ENVIRONMENT=production
TRIEQUEST_SECRET_KEY=<generate a long random secret>
TRIEQUEST_DATABASE_URL=mysql+pymysql://USER:PASSWORD@HOST:4000/triequest
TRIEQUEST_DATABASE_SSL_CA_PATH=/etc/ssl/certs/ca-certificates.crt
TRIEQUEST_DATABASE_SSL_VERIFY_CERT=true
TRIEQUEST_DATABASE_SSL_VERIFY_IDENTITY=true
TRIEQUEST_CORS_ORIGINS=https://trie-quest.vercel.app
TRIEQUEST_ALLOWED_HOSTS=triequest-api.onrender.com,127.0.0.1,localhost
TRIEQUEST_DATABASE_AUTO_MIGRATE=true
TRIEQUEST_SEED_DEMO_DATA=false
TRIEQUEST_ENABLE_DOCS=false
TRIEQUEST_WEB_CONCURRENCY=1
TRIEQUEST_DATABASE_POOL_RECYCLE_SECONDS=300
TRIEQUEST_FORWARDED_ALLOW_IPS=*
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
- [`backend/start.sh`](./backend/start.sh): now respects Render's `PORT`

## Security notes

- The VM-specific reverse proxy path has been removed from the repo.
- Do not commit TiDB credentials or Render secrets.
- Keep `TRIEQUEST_ENABLE_DOCS=false` in production.
- Keep `TRIEQUEST_SEED_DEMO_DATA=false` in production.
- Auth tokens are still stored in browser `localStorage`, so frontend XSS remains a meaningful risk.
- Rate limiting is still in-memory, so it resets on restarts and is strongest with `TRIEQUEST_WEB_CONCURRENCY=1`.
