package config

import "testing"

func TestProductionSettingsRequireNonDefaultSecretKey(t *testing.T) {
	t.Setenv("TRIEQUEST_ENVIRONMENT", "production")
	t.Setenv("TRIEQUEST_DATABASE_URL", "mysql+pymysql://user:pass@db:3306/triequest")
	t.Setenv("TRIEQUEST_SEED_DEMO_DATA", "false")
	t.Setenv("TRIEQUEST_ENABLE_DOCS", "false")
	t.Setenv("TRIEQUEST_DATABASE_AUTO_MIGRATE", "false")
	t.Setenv("TRIEQUEST_SECRET_KEY", DefaultSecretKey)

	if _, err := Load(); err == nil {
		t.Fatalf("expected production config validation to fail for default secret key")
	}
}

func TestProductionSettingsRejectAutoMigrate(t *testing.T) {
	t.Setenv("TRIEQUEST_ENVIRONMENT", "production")
	t.Setenv("TRIEQUEST_DATABASE_URL", "mysql+pymysql://user:pass@db:3306/triequest")
	t.Setenv("TRIEQUEST_SEED_DEMO_DATA", "false")
	t.Setenv("TRIEQUEST_ENABLE_DOCS", "false")
	t.Setenv("TRIEQUEST_SECRET_KEY", "this-is-a-long-enough-secret-for-production")
	t.Setenv("TRIEQUEST_DATABASE_AUTO_MIGRATE", "true")

	if _, err := Load(); err == nil {
		t.Fatalf("expected production config validation to fail when auto-migrate is enabled")
	}
}
