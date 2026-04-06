package main

// @title           CRM Ticketon API
// @version         1.0
// @description     Sales CRM system with telephony, WhatsApp, and AI analytics

// @contact.name   CRM Support
// @contact.email  support@crm-ticketon.local

// @host      localhost:8080
// @BasePath  /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description JWT Bearer token. Format: "Bearer {token}"

import (
	"fmt"
	"log"

	crm "github.com/crm-ticketon/backend/internal/api"
	"github.com/crm-ticketon/backend/internal/api/handlers"
	"github.com/crm-ticketon/backend/internal/config"
	"github.com/crm-ticketon/backend/internal/repository"
	_ "github.com/crm-ticketon/backend/docs"
	"go.uber.org/zap"
)

func main() {
	cfg := config.Load()

	// Logger
	var logger *zap.Logger
	var err error
	if cfg.Server.Mode == "production" {
		logger, err = zap.NewProduction()
	} else {
		logger, err = zap.NewDevelopment()
	}
	if err != nil {
		log.Fatalf("failed to init logger: %v", err)
	}
	defer logger.Sync()

	// Database
	db, err := repository.NewPostgres(&cfg.Database)
	if err != nil {
		logger.Fatal("failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	// Run migrations
	if err := repository.RunMigrations(db); err != nil {
		logger.Fatal("migration failed", zap.Error(err))
	}
	logger.Info("database migrations completed")

	// Seed admin user
	if err := handlers.SeedAdmin(db); err != nil {
		logger.Warn("seed admin failed", zap.Error(err))
	}

	// Router
	router := crm.NewRouter(db, cfg, logger)

	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	logger.Info("starting CRM server", zap.String("addr", addr))
	if err := router.Run(addr); err != nil {
		logger.Fatal("server failed", zap.Error(err))
	}
}
