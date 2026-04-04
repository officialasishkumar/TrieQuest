package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Settings struct {
	AppName                          string
	Environment                      string
	DatabaseURL                      string
	DatabaseAutoMigrate              bool
	DatabasePoolSize                 int
	DatabaseMaxOverflow              int
	DatabasePoolRecycleSeconds       int
	DatabaseSSLCAPath                string
	DatabaseSSLVerifyCert            bool
	DatabaseSSLVerifyIdentity        bool
	SecretKey                        string
	Algorithm                        string
	TokenIssuer                      string
	AccessTokenExpireMinutes         int
	EnableDocs                       bool
	CORSOrigins                      []string
	AllowedHosts                     []string
	SeedDemoData                     bool
	RunStartupTasksOnAppStart        bool
	AuthRateLimitMaxAttempts         int
	AuthRateLimitWindowSeconds       int
	FriendLookupRateLimitMaxAttempts int
	FriendLookupRateLimitWindowSecs  int
	EnableAdmin                      bool
	AdminEmails                      []string
	AdminRateLimitMaxAttempts        int
	AdminRateLimitWindowSeconds      int
	GoogleClientID                   string
	GoogleClientSecret               string
	GoogleRedirectURI                string
}

const defaultSecretKey = "change-this-secret-key-before-production-please"

func Load() (*Settings, error) {
	_ = godotenv.Load()

	s := &Settings{
		AppName:                          envStr("TRIEQUEST_APP_NAME", "TrieQuest API"),
		Environment:                      envStr("TRIEQUEST_ENVIRONMENT", "development"),
		DatabaseURL:                      envStr("TRIEQUEST_DATABASE_URL", "sqlite:///./triequest.db"),
		DatabaseAutoMigrate:              envBool("TRIEQUEST_DATABASE_AUTO_MIGRATE", false),
		DatabasePoolSize:                 envInt("TRIEQUEST_DATABASE_POOL_SIZE", 10),
		DatabaseMaxOverflow:              envInt("TRIEQUEST_DATABASE_MAX_OVERFLOW", 20),
		DatabasePoolRecycleSeconds:       envInt("TRIEQUEST_DATABASE_POOL_RECYCLE_SECONDS", 1800),
		DatabaseSSLCAPath:                envStr("TRIEQUEST_DATABASE_SSL_CA_PATH", ""),
		DatabaseSSLVerifyCert:            envBool("TRIEQUEST_DATABASE_SSL_VERIFY_CERT", false),
		DatabaseSSLVerifyIdentity:        envBool("TRIEQUEST_DATABASE_SSL_VERIFY_IDENTITY", false),
		SecretKey:                        envStr("TRIEQUEST_SECRET_KEY", defaultSecretKey),
		Algorithm:                        envStr("TRIEQUEST_ALGORITHM", "HS256"),
		TokenIssuer:                      envStr("TRIEQUEST_TOKEN_ISSUER", "triequest-api"),
		AccessTokenExpireMinutes:         envInt("TRIEQUEST_ACCESS_TOKEN_EXPIRE_MINUTES", 1440),
		EnableDocs:                       envBool("TRIEQUEST_ENABLE_DOCS", true),
		CORSOrigins:                      envCSV("TRIEQUEST_CORS_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080"),
		AllowedHosts:                     envCSV("TRIEQUEST_ALLOWED_HOSTS", "localhost,127.0.0.1,triequest.local"),
		SeedDemoData:                     envBool("TRIEQUEST_SEED_DEMO_DATA", true),
		RunStartupTasksOnAppStart:        envBool("TRIEQUEST_RUN_STARTUP_TASKS_ON_APP_START", true),
		AuthRateLimitMaxAttempts:         envInt("TRIEQUEST_AUTH_RATE_LIMIT_MAX_ATTEMPTS", 5),
		AuthRateLimitWindowSeconds:       envInt("TRIEQUEST_AUTH_RATE_LIMIT_WINDOW_SECONDS", 300),
		FriendLookupRateLimitMaxAttempts: envInt("TRIEQUEST_FRIEND_LOOKUP_RATE_LIMIT_MAX_ATTEMPTS", 20),
		FriendLookupRateLimitWindowSecs:  envInt("TRIEQUEST_FRIEND_LOOKUP_RATE_LIMIT_WINDOW_SECONDS", 60),
		EnableAdmin:                      envBool("TRIEQUEST_ENABLE_ADMIN", false),
		AdminEmails:                      envCSV("TRIEQUEST_ADMIN_EMAILS", ""),
		AdminRateLimitMaxAttempts:        envInt("TRIEQUEST_ADMIN_RATE_LIMIT_MAX_ATTEMPTS", 5),
		AdminRateLimitWindowSeconds:      envInt("TRIEQUEST_ADMIN_RATE_LIMIT_WINDOW_SECONDS", 300),
		GoogleClientID:                   envStr("TRIEQUEST_GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret:               envStr("TRIEQUEST_GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURI:                envStr("TRIEQUEST_GOOGLE_REDIRECT_URI", "http://localhost:5173/auth/google/callback"),
	}

	if s.Environment == "production" {
		if err := s.validateProduction(); err != nil {
			return nil, err
		}
	}

	return s, nil
}

func (s *Settings) IsSQLite() bool {
	return strings.HasPrefix(s.DatabaseURL, "sqlite")
}

func (s *Settings) validateProduction() error {
	if s.SecretKey == defaultSecretKey {
		return fmt.Errorf("TRIEQUEST_SECRET_KEY must be set to a non-default value in production")
	}
	if len(s.SecretKey) < 32 {
		return fmt.Errorf("TRIEQUEST_SECRET_KEY must be at least 32 characters long in production")
	}
	if s.IsSQLite() {
		return fmt.Errorf("production deployments must use MySQL, not SQLite")
	}
	if s.SeedDemoData {
		return fmt.Errorf("production deployments must disable demo data seeding")
	}
	if s.EnableDocs {
		return fmt.Errorf("production deployments must disable API docs")
	}
	for _, origin := range s.CORSOrigins {
		if origin == "*" {
			return fmt.Errorf("production deployments must not allow wildcard CORS origins")
		}
		parsed, err := url.Parse(origin)
		if err == nil && parsed.Scheme != "https" {
			host := parsed.Hostname()
			if host != "localhost" && host != "127.0.0.1" {
				return fmt.Errorf("production CORS origins must use HTTPS unless they target localhost")
			}
		}
	}
	for _, h := range s.AllowedHosts {
		if h == "*" {
			return fmt.Errorf("production deployments must not allow wildcard hosts")
		}
	}
	return nil
}

func envStr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}

func envInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return i
}

func envCSV(key, fallback string) []string {
	v := os.Getenv(key)
	if v == "" {
		v = fallback
	}
	if v == "" {
		return nil
	}
	seen := make(map[string]struct{})
	var result []string
	for _, item := range strings.Split(v, ",") {
		cleaned := strings.TrimSpace(item)
		if cleaned == "" {
			continue
		}
		if _, exists := seen[cleaned]; !exists {
			seen[cleaned] = struct{}{}
			result = append(result, cleaned)
		}
	}
	return result
}
