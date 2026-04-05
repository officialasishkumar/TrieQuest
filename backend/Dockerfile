FROM golang:1.26-alpine AS builder

WORKDIR /src

RUN apk add --no-cache ca-certificates git

ARG TARGETOS=linux
ARG TARGETARCH=amd64

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -ldflags="-s -w" -o /out/triequest ./cmd/triequest

FROM alpine:3.21

ENV TRIEQUEST_ENVIRONMENT=production \
    TRIEQUEST_DATABASE_AUTO_MIGRATE=false

WORKDIR /app

RUN apk add --no-cache ca-certificates && addgroup -S triequest && adduser -S triequest -G triequest

COPY --from=builder /out/triequest /app/triequest

USER triequest

EXPOSE 8000

CMD ["/app/triequest", "serve"]
