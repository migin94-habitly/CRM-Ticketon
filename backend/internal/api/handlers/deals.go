package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/crm-ticketon/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type DealsHandler struct {
	db *sqlx.DB
}

func NewDealsHandler(db *sqlx.DB) *DealsHandler {
	return &DealsHandler{db: db}
}

// ListDeals godoc
// @Summary      List deals
// @Tags         deals
// @Security     BearerAuth
// @Produce      json
// @Param        page         query  int     false  "Page"
// @Param        limit        query  int     false  "Limit"
// @Param        pipeline_id  query  string  false  "Filter by pipeline"
// @Param        stage_id     query  string  false  "Filter by stage"
// @Param        assigned_to  query  string  false  "Filter by assignee"
// @Success      200  {object}  models.PaginatedResponse
// @Router       /deals [get]
func (h *DealsHandler) ListDeals(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	pipelineID := c.Query("pipeline_id")
	stageID := c.Query("stage_id")
	assignedTo := c.Query("assigned_to")
	search := c.Query("search")

	if page < 1 { page = 1 }
	if limit < 1 || limit > 100 { limit = 20 }
	offset := (page - 1) * limit

	where := "WHERE 1=1"
	args := []interface{}{}
	n := 1

	if pipelineID != "" {
		where += fmt.Sprintf(` AND d.pipeline_id=$%d`, n); args = append(args, pipelineID); n++
	}
	if stageID != "" {
		where += fmt.Sprintf(` AND d.stage_id=$%d`, n); args = append(args, stageID); n++
	}
	if assignedTo != "" {
		where += fmt.Sprintf(` AND d.assigned_to=$%d`, n); args = append(args, assignedTo); n++
	}
	if search != "" {
		where += fmt.Sprintf(` AND d.title ILIKE $%d`, n); args = append(args, "%"+search+"%"); n++
	}

	var total int64
	h.db.QueryRow(fmt.Sprintf(`SELECT COUNT(*) FROM deals d %s`, where), args...).Scan(&total)

	args = append(args, limit, offset)
	query := fmt.Sprintf(`
		SELECT d.*, ps.name as stage_name, ps.color as stage_color
		FROM deals d
		LEFT JOIN pipeline_stages ps ON ps.id = d.stage_id
		%s ORDER BY d.updated_at DESC LIMIT $%d OFFSET $%d`,
		where, n, n+1)

	rows, err := h.db.Queryx(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	defer rows.Close()

	type DealRow struct {
		models.Deal
		StageName  string `db:"stage_name"`
		StageColor string `db:"stage_color"`
	}

	deals := []map[string]interface{}{}
	for rows.Next() {
		var row DealRow
		if err := rows.StructScan(&row); err != nil { continue }
		d := map[string]interface{}{
			"id": row.ID, "title": row.Title, "value": row.Value,
			"currency": row.Currency, "pipeline_id": row.PipelineID,
			"stage_id": row.StageID, "contact_id": row.ContactID,
			"assigned_to": row.AssignedTo, "priority": row.Priority,
			"close_date": row.CloseDate, "notes": row.Notes,
			"lost_reason": row.LostReason,
			"created_at": row.CreatedAt, "updated_at": row.UpdatedAt,
			"stage": map[string]string{"name": row.StageName, "color": row.StageColor},
		}
		// Load contact summary
		if row.ContactID != nil {
			var ct models.Contact
			if h.db.Get(&ct, `SELECT id, first_name, last_name, email, phone, company FROM contacts WHERE id=$1`, *row.ContactID) == nil {
				d["contact"] = ct
			}
		}
		// Load assignee
		if row.AssignedTo != nil {
			var u models.User
			if h.db.Get(&u, `SELECT id, first_name, last_name, email, avatar FROM users WHERE id=$1`, *row.AssignedTo) == nil {
				d["assigned_user"] = u
			}
		}
		deals = append(deals, d)
	}

	totalPages := int(total) / limit
	if int(total)%limit != 0 { totalPages++ }

	c.JSON(http.StatusOK, models.PaginatedResponse{
		Data: deals, Total: total, Page: page, Limit: limit, TotalPages: totalPages,
	})
}

// GetDeal godoc
// @Summary      Get deal by ID
// @Tags         deals
// @Security     BearerAuth
// @Param        id  path  string  true  "Deal ID"
// @Produce      json
// @Success      200  {object}  models.Deal
// @Router       /deals/{id} [get]
func (h *DealsHandler) GetDeal(c *gin.Context) {
	id := c.Param("id")
	var deal models.Deal
	if err := h.db.Get(&deal, `SELECT * FROM deals WHERE id=$1`, id); err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Error: "deal not found"})
		return
	}
	// Load stage
	var stage models.PipelineStage
	if h.db.Get(&stage, `SELECT * FROM pipeline_stages WHERE id=$1`, deal.StageID) == nil {
		deal.Stage = &stage
	}
	// Load contact
	if deal.ContactID != nil {
		var ct models.Contact
		if h.db.Get(&ct, `SELECT * FROM contacts WHERE id=$1`, *deal.ContactID) == nil {
			deal.Contact = &ct
		}
	}
	// Load activities
	h.db.Select(&deal.Activities, `SELECT * FROM activities WHERE deal_id=$1 ORDER BY created_at DESC LIMIT 20`, id)
	// Load AI score
	var score models.AIScore
	if h.db.Get(&score, `SELECT * FROM ai_scores WHERE entity_type='deal' AND entity_id=$1 ORDER BY generated_at DESC LIMIT 1`, id) == nil {
		deal.AIScore = &score
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: deal})
}

// CreateDeal godoc
// @Summary      Create deal
// @Tags         deals
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      models.CreateDealRequest  true  "Deal data"
// @Success      201   {object}  models.APIResponse
// @Router       /deals [post]
func (h *DealsHandler) CreateDeal(c *gin.Context) {
	var req models.CreateDealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	if req.Currency == "" { req.Currency = "USD" }
	if req.Priority == "" { req.Priority = models.PriorityMedium }

	id := uuid.New().String()
	_, err := h.db.Exec(`
		INSERT INTO deals (id, title, value, currency, pipeline_id, stage_id, contact_id, assigned_to, priority, close_date, notes)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		id, req.Title, req.Value, req.Currency, req.PipelineID, req.StageID,
		req.ContactID, req.AssignedTo, req.Priority, req.CloseDate, req.Notes,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Message: "deal created", Data: gin.H{"id": id}})
}

// UpdateDeal godoc
// @Summary      Update deal
// @Tags         deals
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id    path  string  true  "Deal ID"
// @Success      200   {object}  models.APIResponse
// @Router       /deals/{id} [put]
func (h *DealsHandler) UpdateDeal(c *gin.Context) {
	id := c.Param("id")
	var req models.CreateDealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	_, err := h.db.Exec(`
		UPDATE deals SET title=$1, value=$2, currency=$3, pipeline_id=$4, stage_id=$5,
		contact_id=$6, assigned_to=$7, priority=$8, close_date=$9, notes=$10, updated_at=NOW()
		WHERE id=$11`,
		req.Title, req.Value, req.Currency, req.PipelineID, req.StageID,
		req.ContactID, req.AssignedTo, req.Priority, req.CloseDate, req.Notes, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "deal updated"})
}

// MoveDeal godoc
// @Summary      Move deal to another stage
// @Tags         deals
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id    path  string               true  "Deal ID"
// @Param        body  body  models.MoveDealRequest  true  "Stage data"
// @Success      200   {object}  models.APIResponse
// @Router       /deals/{id}/move [patch]
func (h *DealsHandler) MoveDeal(c *gin.Context) {
	id := c.Param("id")
	var req models.MoveDealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	_, err := h.db.Exec(`UPDATE deals SET stage_id=$1, updated_at=NOW() WHERE id=$2`, req.StageID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "deal moved"})
}

// DeleteDeal godoc
// @Summary      Delete deal
// @Tags         deals
// @Security     BearerAuth
// @Param        id  path  string  true  "Deal ID"
// @Success      200  {object}  models.APIResponse
// @Router       /deals/{id} [delete]
func (h *DealsHandler) DeleteDeal(c *gin.Context) {
	id := c.Param("id")
	h.db.Exec(`DELETE FROM deals WHERE id=$1`, id)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "deal deleted"})
}

// GetDealActivities returns activities for a deal
func (h *DealsHandler) GetDealActivities(c *gin.Context) {
	id := c.Param("id")
	var activities []models.Activity
	h.db.Select(&activities, `SELECT * FROM activities WHERE deal_id=$1 ORDER BY created_at DESC`, id)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: activities})
}

// CreateDealActivity creates an activity for a deal
func (h *DealsHandler) CreateDealActivity(c *gin.Context) {
	dealID := c.Param("id")
	var req models.CreateActivityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	req.DealID = &dealID
	userID := c.GetString("user_id")
	id := uuid.New().String()
	h.db.Exec(`
		INSERT INTO activities (id, type, subject, description, deal_id, contact_id, user_id, due_date, duration)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		id, req.Type, req.Subject, req.Description, req.DealID, req.ContactID, userID, req.DueDate, req.Duration,
	)
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Data: gin.H{"id": id}})
}
