# Secure VM Deployment

This repo is already containerized. The production path in [`compose.yaml`](/Users/asish/coding/projects/TrieQuest/compose.yaml) is now:

- `mysql`: persistent MySQL 8.4 volume for all application data
- `backend`: FastAPI API, internal-only on the Docker network
- `caddy`: public reverse proxy on ports `80` and `443` with automatic HTTPS

The optional `frontend` service is still available behind the `frontend` profile, but it is not started by default because your main production need is the backend.

## Recommended hosting shape

Host the backend on your existing VM.

- Keep MySQL and the backend on the same VM inside Docker.
- Publish only `80` and `443` from the VM.
- Do not publish MySQL or the FastAPI container directly to the internet.
- Put a reverse proxy in front of the backend so the public URL is HTTPS.

## Do you need a URL or domain?

Yes, in practice you should use a public HTTPS URL for the backend.

- If your frontend is already deployed on an HTTPS site, browsers will block calls from that frontend to an insecure `http://` backend.
- The clean setup is a backend hostname such as `https://api.example.com`.
- If you already own a domain, create a subdomain like `api.yourdomain.com`.
- If you want a free option, use a free DNS provider that gives you a stable subdomain and point it to the VM. A simple option is a DuckDNS subdomain, then use that hostname in `TRIEQUEST_PUBLIC_HOSTNAME`.

## Important frontend note

Your frontend is build-time configured for the API base URL in [`frontend/src/lib/api.ts`](/Users/asish/coding/projects/TrieQuest/frontend/src/lib/api.ts#L14).

- If the deployed frontend was built with `VITE_API_BASE_URL=/api`, it expects the backend on the same public origin and path.
- If the frontend is deployed separately, rebuild and redeploy it with `VITE_API_BASE_URL=https://your-backend-hostname`.
- If the frontend is on Vercel, the current [`frontend/vercel.json`](/Users/asish/coding/projects/TrieQuest/frontend/vercel.json#L1) does not proxy `/api` to your VM, so an absolute backend URL is the correct setup.

## Required environment variables

Copy [`.env.example`](/Users/asish/coding/projects/TrieQuest/.env.example) to `.env` on the VM and replace every placeholder.

Required:

- `MYSQL_PASSWORD`: app database password
- `MYSQL_ROOT_PASSWORD`: separate MySQL root password
- `TRIEQUEST_PUBLIC_HOSTNAME`: public backend hostname, for example `api.example.com`
- `TRIEQUEST_ACME_EMAIL`: email used by Caddy for TLS certificate registration
- `TRIEQUEST_SECRET_KEY`: at least 32 random characters
- `TRIEQUEST_CORS_ORIGINS`: your real frontend origin, for example `https://your-frontend.vercel.app`
- `TRIEQUEST_ALLOWED_HOSTS`: backend hostname plus `127.0.0.1,localhost,backend`

Usually leave these as-is unless you know you need different values:

- `TRIEQUEST_DATABASE_AUTO_MIGRATE=true`
- `TRIEQUEST_SEED_DEMO_DATA=false`
- `TRIEQUEST_ENABLE_DOCS=false`
- `TRIEQUEST_WEB_CONCURRENCY=1`
- `TRIEQUEST_FORWARDED_ALLOW_IPS=*`
- `TRIEQUEST_AUTH_RATE_LIMIT_MAX_ATTEMPTS=5`
- `TRIEQUEST_AUTH_RATE_LIMIT_WINDOW_SECONDS=300`
- `TRIEQUEST_FRIEND_LOOKUP_RATE_LIMIT_MAX_ATTEMPTS=20`
- `TRIEQUEST_FRIEND_LOOKUP_RATE_LIMIT_WINDOW_SECONDS=60`

## VM setup

1. Install Docker Engine and the Docker Compose plugin.
2. Open only the ports you need:
   - `22/tcp` for SSH
   - `80/tcp` for HTTP to HTTPS certificate/bootstrap traffic
   - `443/tcp` for HTTPS
3. Block public access to `3306` and `8000`.
4. Point your backend DNS name to the VM's public IP.
5. Put the repo on the VM.
6. Create `.env` from [`.env.example`](/Users/asish/coding/projects/TrieQuest/.env.example).
7. Start the stack:

```bash
docker compose up -d --build
```

8. Verify the backend:

```bash
curl https://YOUR_BACKEND_HOSTNAME/api/health
```

## Secret generation

Generate strong secrets on the VM:

```bash
openssl rand -hex 32
openssl rand -hex 24
openssl rand -hex 24
```

Use one value for `TRIEQUEST_SECRET_KEY`, one for `MYSQL_PASSWORD`, and one different value for `MYSQL_ROOT_PASSWORD`.

## Persistence and restarts

Data persists in the named Docker volume `mysql_data`.

- VM reboot: Docker restart policies bring the containers back.
- Container restart: the API and MySQL come back automatically.
- Database data remains because it is stored in the Docker volume, not inside the container filesystem.

For Linux VMs, also make sure Docker itself starts on boot:

```bash
sudo systemctl enable docker
sudo systemctl restart docker
```

## Security baseline in this repo

- The backend only listens on the internal Docker network in production compose.
- Caddy is the only public-facing container.
- The backend uses Trusted Host validation and explicit CORS allowlists.
- API docs are disabled by default in the production compose path.
- The backend container runs database initialization at startup and now uses Alembic migrations by default in production compose.
- MySQL data is persisted in a named volume.

## Current limitations you should know

- Auth uses bearer JWTs stored in browser `localStorage` in [`frontend/src/lib/api.ts`](/Users/asish/coding/projects/TrieQuest/frontend/src/lib/api.ts#L79). That means an XSS bug in the frontend could expose tokens.
- Rate limiting is currently in-memory in the backend, so it resets when the backend restarts and is strongest when `TRIEQUEST_WEB_CONCURRENCY=1`.
- If you later need higher traffic or stronger abuse protection, move rate limiting to Redis before increasing worker count.
