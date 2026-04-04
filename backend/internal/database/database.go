package database

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	mysqldriver "github.com/go-sql-driver/mysql"
	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"triequest-backend/internal/config"
	"triequest-backend/internal/models"
)

func Connect(cfg *config.Settings) (*gorm.DB, error) {
	gormCfg := &gorm.Config{
		Logger:                 logger.Default.LogMode(logger.Warn),
		SkipDefaultTransaction: true,
	}

	var db *gorm.DB
	var err error

	if cfg.IsSQLite() {
		dsn := strings.TrimPrefix(cfg.DatabaseURL, "sqlite:///")
		db, err = gorm.Open(sqlite.Open(dsn), gormCfg)
	} else {
		dsn, dialErr := buildMySQLDSN(cfg)
		if dialErr != nil {
			return nil, dialErr
		}
		db, err = gorm.Open(mysql.Open(dsn), gormCfg)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	if !cfg.IsSQLite() {
		sqlDB.SetMaxOpenConns(cfg.DatabasePoolSize + cfg.DatabaseMaxOverflow)
		sqlDB.SetMaxIdleConns(cfg.DatabasePoolSize)
		sqlDB.SetConnMaxLifetime(time.Duration(cfg.DatabasePoolRecycleSeconds) * time.Second)
	}

	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.User{},
		&models.Friendship{},
		&models.Group{},
		&models.GroupMembership{},
		&models.ProblemShare{},
		&models.JoinRequest{},
		&models.Challenge{},
		&models.ChallengeParticipant{},
		&models.ChallengeProblem{},
	)
}

func buildMySQLDSN(cfg *config.Settings) (string, error) {
	raw := cfg.DatabaseURL
	raw = strings.TrimPrefix(raw, "mysql+pymysql://")
	raw = strings.TrimPrefix(raw, "mysql://")

	dsnConfig, err := mysqldriver.ParseDSN(reformatDSN(raw))
	if err != nil {
		return "", fmt.Errorf("failed to parse MySQL DSN: %w", err)
	}

	dsnConfig.ParseTime = true
	dsnConfig.Loc = time.UTC

	if cfg.DatabaseSSLCAPath != "" || cfg.DatabaseSSLVerifyCert || cfg.DatabaseSSLVerifyIdentity {
		tlsCfg := &tls.Config{}
		if cfg.DatabaseSSLCAPath != "" {
			caCert, readErr := os.ReadFile(cfg.DatabaseSSLCAPath)
			if readErr != nil {
				return "", fmt.Errorf("failed to read SSL CA file: %w", readErr)
			}
			pool := x509.NewCertPool()
			pool.AppendCertsFromPEM(caCert)
			tlsCfg.RootCAs = pool
		}
		if !cfg.DatabaseSSLVerifyCert {
			tlsCfg.InsecureSkipVerify = true
		}
		tlsName := "triequest-tls"
		if regErr := mysqldriver.RegisterTLSConfig(tlsName, tlsCfg); regErr != nil {
			return "", fmt.Errorf("failed to register TLS config: %w", regErr)
		}
		dsnConfig.TLSConfig = tlsName
	}

	return dsnConfig.FormatDSN(), nil
}

// reformatDSN converts user:pass@host:port/dbname?params to DSN format
// expected by go-sql-driver: user:pass@tcp(host:port)/dbname?params.
func reformatDSN(raw string) string {
	atIdx := strings.LastIndex(raw, "@")
	if atIdx < 0 {
		return raw
	}
	userPass := raw[:atIdx]
	rest := raw[atIdx+1:]

	slashIdx := strings.Index(rest, "/")
	if slashIdx < 0 {
		return raw
	}
	hostPort := rest[:slashIdx]
	dbAndParams := rest[slashIdx:]

	if !strings.HasPrefix(hostPort, "tcp(") {
		hostPort = "tcp(" + hostPort + ")"
	}

	return userPass + "@" + hostPort + dbAndParams
}

func HealthCheck(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	_, err = sqlDB.Exec("SELECT 1")
	if err != nil {
		log.Printf("Database health check failed: %v", err)
	}
	return err
}
