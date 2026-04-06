package handlers

import (
	"net/http"

	"github.com/crm-ticketon/backend/internal/api/middleware"
	"github.com/crm-ticketon/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type PipelineHandler struct {
	db *sqlx.DB
}

func NewPipelineHandler(db *sqlx.DB) *PipelineHandler {
	return &PipelineHandler{db: db}
}

// ListPipelines godoc
// @Summary      List pipelines
// @Tags         pipeline
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  models.APIResponse
// @Router       /pipelines [get]
func (h *PipelineHandler) ListPipelines(c *gin.Context) {
	var pipelines []models.Pipeline
	if err := h.db.Select(&pipelines, `SELECT * FROM pipelines ORDER BY created_at ASC`); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	for i := range pipelines {
		var stages []models.PipelineStage
		h.db.Select(&stages, `SELECT * FROM pipeline_stages WHERE pipeline_id=$1 ORDER BY position ASC`, pipelines[i].ID)
		pipelines[i].Stages = stages
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: pipelines})
}

// GetPipeline godoc
// @Summary      Get pipeline with stages
// @Tags         pipeline
// @Security     BearerAuth
// @Param        id  path  string  true  "Pipeline ID"
// @Produce      json
// @Success      200  {object}  models.Pipeline
// @Router       /pipelines/{id} [get]
func (h *PipelineHandler) GetPipeline(c *gin.Context) {
	id := c.Param("id")
	var p models.Pipeline
	if err := h.db.Get(&p, `SELECT * FROM pipelines WHERE id=$1`, id); err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Error: "pipeline not found"})
		return
	}
	h.db.Select(&p.Stages, `SELECT * FROM pipeline_stages WHERE pipeline_id=$1 ORDER BY position ASC`, id)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: p})
}

// CreatePipeline godoc
// @Summary      Create pipeline
// @Tags         pipeline
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body  models.CreatePipelineRequest  true  "Pipeline data"
// @Success      201   {object}  models.APIResponse
// @Router       /pipelines [post]
func (h *PipelineHandler) CreatePipeline(c *gin.Context) {
	var req models.CreatePipelineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}

	createdBy := middleware.GetUserID(c)
	pipelineID := uuid.New().String()

	_, err := h.db.Exec(`
		INSERT INTO pipelines (id, name, description, is_default, created_by)
		VALUES ($1,$2,$3,$4,$5)`,
		pipelineID, req.Name, req.Description, req.IsDefault, createdBy,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	// Create default stages if none provided
	stages := req.Stages
	if len(stages) == 0 {
		stages = []models.CreateStageRequest{
			{Name: "New Lead", Color: "#6366f1", Position: 0, Probability: 10},
			{Name: "Qualification", Color: "#8b5cf6", Position: 1, Probability: 20},
			{Name: "Proposal", Color: "#ec4899", Position: 2, Probability: 40},
			{Name: "Negotiation", Color: "#f59e0b", Position: 3, Probability: 60},
			{Name: "Won", Color: "#10b981", Position: 4, Probability: 100, IsWon: true},
			{Name: "Lost", Color: "#ef4444", Position: 5, Probability: 0, IsLost: true},
		}
	}

	for _, s := range stages {
		if s.Color == "" { s.Color = "#6366f1" }
		h.db.Exec(`
			INSERT INTO pipeline_stages (id, pipeline_id, name, color, position, probability, is_won, is_lost)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
			uuid.New().String(), pipelineID, s.Name, s.Color, s.Position, s.Probability, s.IsWon, s.IsLost,
		)
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true, Message: "pipeline created",
		Data: gin.H{"id": pipelineID},
	})
}

// UpdatePipeline godoc
// @Summary      Update pipeline
// @Tags         pipeline
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id    path  string  true  "Pipeline ID"
// @Success      200   {object}  models.APIResponse
// @Router       /pipelines/{id} [put]
func (h *PipelineHandler) UpdatePipeline(c *gin.Context) {
	id := c.Param("id")
	var req models.CreatePipelineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	h.db.Exec(`UPDATE pipelines SET name=$1, description=$2, is_default=$3, updated_at=NOW() WHERE id=$4`,
		req.Name, req.Description, req.IsDefault, id)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "pipeline updated"})
}

// DeletePipeline godoc
// @Summary      Delete pipeline
// @Tags         pipeline
// @Security     BearerAuth
// @Param        id  path  string  true  "Pipeline ID"
// @Success      200  {object}  models.APIResponse
// @Router       /pipelines/{id} [delete]
func (h *PipelineHandler) DeletePipeline(c *gin.Context) {
	id := c.Param("id")
	h.db.Exec(`DELETE FROM pipelines WHERE id=$1`, id)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "pipeline deleted"})
}

// AddStage godoc
// @Summary      Add stage to pipeline
// @Tags         pipeline
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id    path  string  true  "Pipeline ID"
// @Success      201   {object}  models.APIResponse
// @Router       /pipelines/{id}/stages [post]
func (h *PipelineHandler) AddStage(c *gin.Context) {
	pipelineID := c.Param("id")
	var req models.CreateStageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	if req.Color == "" { req.Color = "#6366f1" }
	stageID := uuid.New().String()
	h.db.Exec(`
		INSERT INTO pipeline_stages (id, pipeline_id, name, color, position, probability, is_won, is_lost)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		stageID, pipelineID, req.Name, req.Color, req.Position, req.Probability, req.IsWon, req.IsLost,
	)
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Data: gin.H{"id": stageID}})
}

// UpdateStage godoc
// @Summary      Update pipeline stage
// @Tags         pipeline
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id        path  string  true  "Pipeline ID"
// @Param        stage_id  path  string  true  "Stage ID"
// @Success      200       {object}  models.APIResponse
// @Router       /pipelines/{id}/stages/{stage_id} [put]
func (h *PipelineHandler) UpdateStage(c *gin.Context) {
	stageID := c.Param("stage_id")
	var req models.CreateStageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	h.db.Exec(`
		UPDATE pipeline_stages SET name=$1, color=$2, position=$3, probability=$4, is_won=$5, is_lost=$6
		WHERE id=$7`,
		req.Name, req.Color, req.Position, req.Probability, req.IsWon, req.IsLost, stageID,
	)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "stage updated"})
}

// DeleteStage godoc
// @Summary      Delete pipeline stage
// @Tags         pipeline
// @Security     BearerAuth
// @Param        id        path  string  true  "Pipeline ID"
// @Param        stage_id  path  string  true  "Stage ID"
// @Success      200       {object}  models.APIResponse
// @Router       /pipelines/{id}/stages/{stage_id} [delete]
func (h *PipelineHandler) DeleteStage(c *gin.Context) {
	stageID := c.Param("stage_id")
	h.db.Exec(`DELETE FROM pipeline_stages WHERE id=$1`, stageID)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "stage deleted"})
}
