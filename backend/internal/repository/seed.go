package repository

import (
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

func SeedDefaultPipeline(db *sqlx.DB) error {
	var count int
	if err := db.Get(&count, `SELECT COUNT(*) FROM pipelines`); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	pipID := uuid.New().String()
	if _, err := db.Exec(`
		INSERT INTO pipelines (id, name, description, is_default)
		VALUES ($1, $2, $3, $4)`,
		pipID, "Ticketon Sales", "Primary sales funnel — lead to closed deal", true,
	); err != nil {
		return err
	}

	type stage struct {
		name  string
		color string
		pos   int
		prob  int
		won   bool
		lost  bool
	}
	stages := []stage{
		{"New", "#6366f1", 0, 10, false, false},
		{"Qualified", "#8b5cf6", 1, 35, false, false},
		{"Proposal", "#f59e0b", 2, 60, false, false},
		{"Won", "#22c55e", 3, 100, true, false},
		{"Lost", "#94a3b8", 4, 0, false, true},
	}
	for _, s := range stages {
		if _, err := db.Exec(`
			INSERT INTO pipeline_stages (id, pipeline_id, name, color, position, probability, is_won, is_lost)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			uuid.New().String(), pipID, s.name, s.color, s.pos, s.prob, s.won, s.lost,
		); err != nil {
			return err
		}
	}
	return nil
}
