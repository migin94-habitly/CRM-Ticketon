package main

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

	db, err := repository.NewPostgres(&cfg.Database)
	if err != nil {
		logger.Fatal("failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	if err := repository.RunMigrations(db); err != nil {
		logger.Fatal("migration failed", zap.Error(err))
	}
	logger.Info("database migrations completed")

	if err := handlers.SeedAdmin(db); err != nil {
		logger.Warn("seed admin failed", zap.Error(err))
	}

	if err := repository.SeedDefaultPipeline(db); err != nil {
		logger.Warn("seed default pipeline failed", zap.Error(err))
	}

	router := crm.NewRouter(db, cfg, logger)

	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	logger.Info("starting CRM server", zap.String("addr", addr))
	if err := router.Run(addr); err != nil {
		logger.Fatal("server failed", zap.Error(err))
	}
}
