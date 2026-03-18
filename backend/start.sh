#!/bin/sh
set -eu

python -m app.bootstrap

set -- uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers "${TRIEQUEST_WEB_CONCURRENCY:-2}"

if [ -n "${TRIEQUEST_FORWARDED_ALLOW_IPS:-}" ]; then
  set -- "$@" --proxy-headers --forwarded-allow-ips="${TRIEQUEST_FORWARDED_ALLOW_IPS}"
fi

exec "$@"
