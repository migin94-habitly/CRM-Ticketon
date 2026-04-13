package handlers

import (
	"net/http"

	"github.com/crm-ticketon/backend/internal/api/middleware"
	"github.com/crm-ticketon/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type ActivitiesHandler struct {
	db *sqlx.DB
}

func NewActivitiesHandler(db *sqlx.DB) *ActivitiesHandler {
	return &ActivitiesHandler{db: db}
}

func (h *ActivitiesHandler) ListActivities(c *gin.Context) {
	userID := middleware.GetUserID(c)
	role := middleware.GetUserRole(c)

	query := `SELECT a.*, u.first_name || ' ' || u.last_name as user_name
	          FROM activities a
	          LEFT JOIN users u ON u.id = a.user_id WHERE 1=1`
	args := []interface{}{}

	if role == "sales" || role == "viewer" {
		query += ` AND a.user_id=$1`
		args = append(args, userID)
	}

	activityType := c.Query("type")
	if activityType != "" {
		n := len(args) + 1
		query += ` AND a.type=$` + string(rune('0'+n))
		args = append(args, activityType)
	}

	statusFilter := c.Query("status")
	if statusFilter != "" {
		n := len(args) + 1
		query += ` AND a.status=$` + string(rune('0'+n))
		args = append(args, statusFilter)
	}

	query += ` ORDER BY a.created_at DESC LIMIT 50`

	var activities []models.Activity
	if err := h.db.Select(&activities, query, args...); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: activities})
}

func (h *ActivitiesHandler) CreateActivity(c *gin.Context) {
	var req models.CreateActivityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	userID := middleware.GetUserID(c)
	id := uuid.New().String()
	_, err := h.db.Exec(`
		INSERT INTO activities (id, type, subject, description, deal_id, contact_id, user_id, due_date, duration)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		id, req.Type, req.Subject, req.Description,
		req.DealID, req.ContactID, userID, req.DueDate.Ptr(), req.Duration,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Data: gin.H{"id": id}})
}

func (h *ActivitiesHandler) GetActivity(c *gin.Context) {
	id := c.Param("id")
	var a models.Activity
	if err := h.db.Get(&a, `SELECT * FROM activities WHERE id=$1`, id); err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Error: "activity not found"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: a})
}

func (h *ActivitiesHandler) UpdateActivity(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Subject     string                `json:"subject"`
		Description string                `json:"description"`
		Status      models.ActivityStatus `json:"status"`
		DueDate     *string               `json:"due_date"`
		Duration    int                   `json:"duration"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	// Preserve subject/description if not provided in the request (partial update support)
	h.db.Exec(`
		UPDATE activities SET
			subject      = CASE WHEN $1 = '' THEN subject ELSE $1 END,
			description  = CASE WHEN $2 = '' THEN description ELSE $2 END,
			status       = CASE WHEN $3 = '' THEN status ELSE $3::activity_status END,
			due_date     = COALESCE($4::timestamptz, due_date),
			duration     = CASE WHEN $5 = 0 THEN duration ELSE $5 END,
			updated_at   = NOW()
		WHERE id=$6`,
		req.Subject, req.Description, string(req.Status), req.DueDate, req.Duration, id,
	)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "activity updated"})
}

func (h *ActivitiesHandler) DeleteActivity(c *gin.Context) {
	id := c.Param("id")
	h.db.Exec(`DELETE FROM activities WHERE id=$1`, id)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "activity deleted"})
}
