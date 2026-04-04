package middleware

import (
	"net/http"
	"strings"
)

func SecurityHeaders(environment string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, "/api/") {
				setDefault(w, "Cache-Control", "no-store")
				setDefault(w, "Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
			}

			setDefault(w, "Permissions-Policy", "camera=(), geolocation=(), microphone=()")
			setDefault(w, "Referrer-Policy", "no-referrer")
			setDefault(w, "X-Content-Type-Options", "nosniff")
			setDefault(w, "X-Frame-Options", "DENY")

			if environment == "production" {
				setDefault(w, "Strict-Transport-Security", "max-age=31536000; includeSubDomains")
			}

			next.ServeHTTP(w, r)
		})
	}
}

func setDefault(w http.ResponseWriter, key, value string) {
	if w.Header().Get(key) == "" {
		w.Header().Set(key, value)
	}
}
