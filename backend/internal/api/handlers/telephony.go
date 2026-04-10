package handlers

import (
	"net/http"
	"strconv"

	"github.com/crm-ticketon/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type TelephonyHandler struct {
	db *sqlx.DB
}

func NewTelephonyHandler(db *sqlx.DB) *TelephonyHandler {
	return &TelephonyHandler{db: db}
}

func (h *TelephonyHandler) InitiateCall(c *gin.Context) {
	var req struct {
		ToNumber  string  `json:"to_number" binding:"required"`
		ContactID *string `json:"contact_id,omitempty"`
		DealID    *string `json:"deal_id,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}

	userID := c.GetString("user_id")
	var fromNumber string
	h.db.QueryRow(`SELECT phone_number FROM users WHERE id=$1`, userID).Scan(&fromNumber)
	if fromNumber == "" {
		fromNumber = "+10000000000"
	}

	callID := uuid.New().String()
	_, err := h.db.Exec(`
		INSERT INTO call_records (id, direction, status, from_number, to_number, contact_id, deal_id, user_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		callID, models.CallOutbound, models.CallStatusInitiated,
		fromNumber, req.ToNumber, req.ContactID, req.DealID, userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "call initiated",
		Data: gin.H{
			"call_id":     callID,
			"from_number": fromNumber,
			"to_number":   req.ToNumber,
			"status":      "initiated",
		},
	})
}

func (h *TelephonyHandler) ListCalls(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	contactID := c.Query("contact_id")
	dealID := c.Query("deal_id")

	if page < 1 { page = 1 }
	if limit > 100 { limit = 20 }
	offset := (page - 1) * limit

	var calls []models.CallRecord
	query := `SELECT * FROM call_records WHERE 1=1`
	args := []interface{}{}
	n := 1

	if contactID != "" {
		query += ` AND contact_id=$` + strconv.Itoa(n)
		args = append(args, contactID)
		n++
	}
	if dealID != "" {
		query += ` AND deal_id=$` + strconv.Itoa(n)
		args = append(args, dealID)
		n++
	}

	var total int64
	h.db.QueryRow("SELECT COUNT(*) FROM call_records WHERE 1=1"+
		func() string {
			if contactID != "" { return " AND contact_id='" + contactID + "'" }
			return ""
		}(), ).Scan(&total)

	args = append(args, limit, offset)
	query += ` ORDER BY created_at DESC LIMIT $` + strconv.Itoa(n) + ` OFFSET $` + strconv.Itoa(n+1)

	h.db.Select(&calls, query, args...)

	c.JSON(http.StatusOK, models.PaginatedResponse{
		Data: calls, Total: total, Page: page, Limit: limit,
		TotalPages: func() int {
			tp := int(total) / limit
			if int(total)%limit != 0 { tp++ }
			return tp
		}(),
	})
}

func (h *TelephonyHandler) GetCall(c *gin.Context) {
	id := c.Param("id")
	var call models.CallRecord
	if err := h.db.Get(&call, `SELECT * FROM call_records WHERE id=$1`, id); err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Error: "call not found"})
		return
	}
	if call.ContactID != nil {
		var ct models.Contact
		if h.db.Get(&ct, `SELECT id, first_name, last_name, phone FROM contacts WHERE id=$1`, *call.ContactID) == nil {
			call.Contact = &ct
		}
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: call})
}

func (h *TelephonyHandler) GetRecordingURL(c *gin.Context) {
	id := c.Param("id")
	var call models.CallRecord
	if err := h.db.Get(&call, `SELECT id, recording_url, recording_key FROM call_records WHERE id=$1`, id); err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Error: "call not found"})
		return
	}
	if call.RecordingURL == nil || *call.RecordingURL == "" {
		c.JSON(http.StatusNotFound, models.APIResponse{Error: "no recording available"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: gin.H{
			"url":       *call.RecordingURL,
			"expires_in": 3600,
		},
	})
}

func (h *TelephonyHandler) WebhookHandler(c *gin.Context) {
	var payload struct {
		Event      string `json:"event"`
		ExternalID string `json:"call_id"`
		From       string `json:"from"`
		To         string `json:"to"`
		Status     string `json:"status"`
		Duration   int    `json:"duration"`
		RecordURL  string `json:"recording_url"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	switch payload.Event {
	case "call.started":
		var callID string
		h.db.QueryRow(`SELECT id FROM call_records WHERE external_id=$1`, payload.ExternalID).Scan(&callID)
		if callID == "" {
			callID = uuid.New().String()
			h.db.Exec(`
				INSERT INTO call_records (id, external_id, direction, status, from_number, to_number)
				VALUES ($1,$2,$3,$4,$5,$6)`,
				callID, payload.ExternalID, models.CallInbound, models.CallStatusAnswered,
				payload.From, payload.To,
			)
		} else {
			h.db.Exec(`UPDATE call_records SET status=$1 WHERE id=$2`, models.CallStatusAnswered, callID)
		}

	case "call.completed":
		status := models.CallStatusCompleted
		if payload.Duration == 0 { status = models.CallStatusMissed }
		h.db.Exec(`
			UPDATE call_records SET status=$1, duration=$2, recording_url=$3, ended_at=NOW()
			WHERE external_id=$4`,
			status, payload.Duration, payload.RecordURL, payload.ExternalID,
		)
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}

func (h *TelephonyHandler) UpdateCallRecord(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		ContactID  *string `json:"contact_id"`
		DealID     *string `json:"deal_id"`
		Notes      string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	h.db.Exec(`UPDATE call_records SET contact_id=$1, deal_id=$2 WHERE id=$3`,
		req.ContactID, req.DealID, id)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "call updated"})
}
