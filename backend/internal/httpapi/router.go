package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"gorm.io/gorm"

	"triequest/backend/internal/config"
	"triequest/backend/internal/database"
)

type Dependencies struct {
	Settings config.Settings
	DB       *gorm.DB
}

func NewRouter(deps Dependencies) http.Handler {
	router := chi.NewRouter()
	router.Use(middleware.RequestID)
	router.Use(middleware.RealIP)
	router.Use(middleware.Recoverer)
	router.Use(withSecurityHeaders(deps.Settings.Environment))
	router.Use(withHostValidation(deps.Settings.AllowedHosts))
	router.Use(withCORS(deps.Settings.CORSOrigins))

	router.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		if err := database.Ping(ctx, deps.DB); err != nil {
			writeError(w, http.StatusServiceUnavailable, "Database unavailable.")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{
			"status":   "ok",
			"database": "ok",
		})
	})

	return router
}

func withSecurityHeaders(environment string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, "/api/") {
				w.Header().Set("Cache-Control", "no-store")
				w.Header().Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
			}
			w.Header().Set("Permissions-Policy", "camera=(), geolocation=(), microphone=()")
			w.Header().Set("Referrer-Policy", "no-referrer")
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "DENY")
			if environment == "production" {
				w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
			}
			next.ServeHTTP(w, r)
		})
	}
}

func withHostValidation(allowedHosts []string) func(http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(allowedHosts))
	for _, host := range allowedHosts {
		allowed[strings.ToLower(host)] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			host := r.Host
			if strings.Contains(host, ":") {
				host = strings.Split(host, ":")[0]
			}
			if len(allowed) > 0 {
				if _, ok := allowed[strings.ToLower(host)]; !ok {
					writeError(w, http.StatusBadRequest, "Host is not allowed.")
					return
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

func withCORS(origins []string) func(http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(origins))
	for _, origin := range origins {
		allowed[origin] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" {
				if _, ok := allowed[origin]; ok {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Set("Vary", "Origin")
				}
				w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type")
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

type errorEnvelope struct {
	Detail string `json:"detail"`
}

func decodeJSON(r *http.Request, dest any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(dest); err != nil {
		return fmt.Errorf("decode json body: %w", err)
	}
	if err := decoder.Decode(&struct{}{}); err != nil && !errors.Is(err, io.EOF) {
		return fmt.Errorf("request body must contain a single JSON object: %w", err)
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, detail string) {
	writeJSON(w, status, errorEnvelope{Detail: detail})
}
