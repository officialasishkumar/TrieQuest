# Secure VM Deployment

This repo is already containerized. The production path in [`compose.yaml`](./compose.yaml) is now:

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

Your frontend is build-time configured for the API base URL in [`frontend/src/lib/api.ts`](./frontend/src/lib/api.ts).

- If the deployed frontend was built with `VITE_API_BASE_URL=/api`, it expects the backend on the same public origin and path.
- If the frontend is deployed separately, rebuild and redeploy it with `VITE_API_BASE_URL=https://your-backend-hostname`.
- If the frontend is on Vercel, the current [`frontend/vercel.json`](./frontend/vercel.json) proxies `/api/*` to `https://triequest-api.duckdns.org/api/*` after you redeploy the frontend.
- An absolute backend URL is still valid, and the current [`frontend/.env.production`](./frontend/.env.production) is set to `https://triequest-api.duckdns.org`.

## Current deployment values

For the current TrieQuest deployment:

- Frontend origin: `https://trie-quest.vercel.app`
- Backend hostname: `triequest-api.duckdns.org`

Use these exact non-secret values:

```dotenv
TRIEQUEST_PUBLIC_HOSTNAME=triequest-api.duckdns.org
TRIEQUEST_CORS_ORIGINS=https://trie-quest.vercel.app
TRIEQUEST_ALLOWED_HOSTS=triequest-api.duckdns.org,127.0.0.1,localhost,backend
VITE_API_BASE_URL=https://triequest-api.duckdns.org
```

`TRIEQUEST_ACME_EMAIL` still needs to be set to a real email address on the VM before starting Caddy so Let's Encrypt notices go to you.

## Required environment variables

Copy [`.env.example`](./.env.example) to `.env` on the VM and replace every placeholder.

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
6. Create `.env` from [`.env.example`](./.env.example).
7. Start the stack:

```bash
docker compose up -d --build
```

8. Verify the backend:

```bash
curl https://YOUR_BACKEND_HOSTNAME/api/health
```

If your VM is on a private LAN address such as `192.168.x.x` or `10.x.x.x`, the DNS record will usually point to your router's public IP instead of the VM directly. In that case you must also forward `80/tcp` and `443/tcp` from the router to the VM's private IP before Let's Encrypt and browsers can reach Caddy.

## Shared VM mode with host Caddy

If this VM already runs other sites or you want one reverse proxy for multiple projects, keep the host Caddy service on `80/443` and run TrieQuest behind it on localhost only. This is the safer option for a shared development VM because TrieQuest does not need to own the machine's public ports directly.

In this repo, use [`compose.host-caddy.yaml`](./compose.host-caddy.yaml) with the main compose file:

```bash
docker compose -f compose.yaml -f compose.host-caddy.yaml up -d --build
```

That mode does two things:

- publishes the TrieQuest backend only on `127.0.0.1:${TRIEQUEST_BACKEND_BIND_PORT:-18000}`
- disables the repo's `caddy` service unless you explicitly opt into the `repo-caddy` profile

The matching host Caddy example is in [`deploy/Caddyfile.shared-vm`](./deploy/Caddyfile.shared-vm). For the current deployment values, the reverse proxy target should stay `127.0.0.1:18000` and the hostname should stay `triequest-api.duckdns.org`.

If the VM itself only has a private address on your LAN, the shared-VM mode still requires router port forwarding for `80/tcp` and `443/tcp` to that VM.

To persist the host Caddy config, install that file as `/etc/caddy/Caddyfile`, replace the placeholder email with your real ACME email, and reload the system Caddy service:

```bash
sudo cp deploy/Caddyfile.shared-vm /etc/caddy/Caddyfile
sudo sed -i 's/you@example.com/YOUR_REAL_EMAIL@example.com/' /etc/caddy/Caddyfile
sudo systemctl reload caddy
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

- Auth uses bearer JWTs stored in browser `localStorage` in [`frontend/src/lib/api.ts`](./frontend/src/lib/api.ts). That means an XSS bug in the frontend could expose tokens.
- Rate limiting is currently in-memory in the backend, so it resets when the backend restarts and is strongest when `TRIEQUEST_WEB_CONCURRENCY=1`.
- If you later need higher traffic or stronger abuse protection, move rate limiting to Redis before increasing worker count.
