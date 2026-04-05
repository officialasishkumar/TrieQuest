#!/bin/sh
set -eu

if [ "$#" -eq 0 ]; then
  set -- serve
fi

if [ -x "./triequest" ]; then
  exec ./triequest "$@"
fi

exec go run ./cmd/triequest "$@"
