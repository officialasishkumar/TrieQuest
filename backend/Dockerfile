FROM golang:1.23-bookworm AS builder

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-s -w" -o /build/server ./cmd/server

FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN addgroup --system triequest && adduser --system --ingroup triequest triequest

COPY --from=builder /build/server /app/server

RUN chown -R triequest:triequest /app

USER triequest

ENV TRIEQUEST_ENVIRONMENT=production \
    TRIEQUEST_RUN_STARTUP_TASKS_ON_APP_START=false

EXPOSE 8000

CMD ["/app/server"]
