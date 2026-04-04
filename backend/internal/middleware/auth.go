package middleware

import (
	"context"
	"net/http"
	"strconv"
	"strings"

	"gorm.io/gorm"

	"triequest-backend/internal/config"
	"triequest-backend/internal/models"
	"triequest-backend/internal/security"
)

type contextKey string

const UserContextKey contextKey = "currentUser"

func Auth(db *gorm.DB, cfg *config.Settings) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				writeError(w, http.StatusUnauthorized, "Authentication credentials were not provided.")
				return
			}

			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			claims, err := security.DecodeAccessToken(tokenStr, cfg)
			if err != nil {
				writeError(w, http.StatusUnauthorized, "Invalid or expired authentication token.")
				return
			}

			tokenType, _ := claims["type"].(string)
			if tokenType != "access" {
				writeError(w, http.StatusUnauthorized, "Invalid authentication token.")
				return
			}

			subStr, _ := claims["sub"].(string)
			if subStr == "" {
				writeError(w, http.StatusUnauthorized, "Invalid authentication token.")
				return
			}

			userID, err := strconv.Atoi(subStr)
			if err != nil {
				writeError(w, http.StatusUnauthorized, "Invalid authentication token.")
				return
			}

			var user models.User
			if err := db.First(&user, userID).Error; err != nil {
				writeError(w, http.StatusUnauthorized, "Authenticated user no longer exists.")
				return
			}

			ctx := context.WithValue(r.Context(), UserContextKey, &user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetCurrentUser(r *http.Request) *models.User {
	user, _ := r.Context().Value(UserContextKey).(*models.User)
	return user
}

func writeError(w http.ResponseWriter, status int, detail string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write([]byte(`{"detail":"` + detail + `"}`))
}
