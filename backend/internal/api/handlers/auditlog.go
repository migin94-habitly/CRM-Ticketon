package handlers

import (
	"net/http"

	"github.com/crm-ticketon/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type AuditLogHandler struct {
	db *sqlx.DB
}

func NewAuditLogHandler(db *sqlx.DB) *AuditLogHandler {
	return &AuditLogHandler{db: db}
}

func (h *AuditLogHandler) List(c *gin.Context) {
	var logs []models.UserActivityLog
	err := h.db.Select(&logs, `
		SELECT
			al.id,
			al.user_id,
			al.user_email,
			COALESCE(u.first_name, '') AS user_first_name,
			COALESCE(u.last_name, '') AS user_last_name,
			al.action,
			al.entity_type,
			al.entity_id,
			al.description,
			al.ip_address,
			al.created_at
		FROM user_activity_logs al
		LEFT JOIN users u ON al.user_id = u.id
		ORDER BY al.created_at DESC
		LIMIT 500
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	if logs == nil {
		logs = []models.UserActivityLog{}
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: logs})
}
