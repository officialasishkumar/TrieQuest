package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"gorm.io/gorm"

	"triequest-backend/internal/config"
	"triequest-backend/internal/database"
	"triequest-backend/internal/models"
	"triequest-backend/internal/router"
	"triequest-backend/internal/services"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	if cfg.RunStartupTasksOnAppStart {
		runStartupTasks(cfg, db)
	}

	r := router.New(db, cfg)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	log.Printf("Starting %s on :%s (environment=%s)", cfg.AppName, port, cfg.Environment)
	if err := http.ListenAndServe(fmt.Sprintf(":%s", port), r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func runStartupTasks(cfg *config.Settings, db *gorm.DB) {
	if cfg.DatabaseAutoMigrate {
		log.Println("Running database auto-migration...")
		if err := database.AutoMigrate(db); err != nil {
			log.Fatalf("Auto-migration failed: %v", err)
		}
	}

	if cfg.SeedDemoData {
		services.SeedDatabase(db)
	}

	// Load username trie and bloom filter
	var usernames []string
	db.Model(&models.User{}).Pluck("username", &usernames)
	services.LoadUsernames(usernames)
	services.LoadUsernameTrie(usernames)

	// Load problem title trie
	var titles []string
	db.Model(&models.ProblemShare{}).Distinct("title").Pluck("title", &titles)
	services.LoadProblemTrie(titles)

	log.Printf("Startup complete: loaded %d usernames, %d problem titles", len(usernames), len(titles))
}
