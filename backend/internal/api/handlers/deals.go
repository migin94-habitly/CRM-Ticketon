package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

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
			"stage":        map[string]string{"name": row.StageName, "color": row.StageColor},
			"partner_id":   row.PartnerID,
			"venue_id":     row.VenueID,
			"event_name":   row.EventName,
			"event_date":   row.EventDate,
			"ticket_count": row.TicketCount,
		}
		if row.ContactID != nil {
			var ct models.Contact
			if h.db.Get(&ct, `SELECT id, first_name, last_name, email, phone, company FROM contacts WHERE id=$1`, *row.ContactID) == nil {
				d["contact"] = ct
			}
		}
		if row.PartnerID != nil {
			var pt models.Partner
			if h.db.Get(&pt, `SELECT id, name, contact_person, email, phone, status FROM partners WHERE id=$1`, *row.PartnerID) == nil {
				d["partner"] = pt
			}
		}
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

func (h *DealsHandler) GetDeal(c *gin.Context) {
	id := c.Param("id")
	var deal models.Deal
	if err := h.db.Get(&deal, `SELECT * FROM deals WHERE id=$1`, id); err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Error: "deal not found"})
		return
	}
	var stage models.PipelineStage
	if h.db.Get(&stage, `SELECT * FROM pipeline_stages WHERE id=$1`, deal.StageID) == nil {
		deal.Stage = &stage
	}
	if deal.ContactID != nil {
		var ct models.Contact
		if h.db.Get(&ct, `SELECT * FROM contacts WHERE id=$1`, *deal.ContactID) == nil {
			deal.Contact = &ct
		}
	}
	h.db.Select(&deal.Activities, `SELECT * FROM activities WHERE deal_id=$1 ORDER BY created_at DESC LIMIT 20`, id)
	var score models.AIScore
	if h.db.Get(&score, `SELECT * FROM ai_scores WHERE entity_type='deal' AND entity_id=$1 ORDER BY generated_at DESC LIMIT 1`, id) == nil {
		deal.AIScore = &score
	}
	if deal.PartnerID != nil {
		var partner models.Partner
		if h.db.Get(&partner, `SELECT * FROM partners WHERE id=$1`, *deal.PartnerID) == nil {
			deal.Partner = &partner
		}
	}
	if deal.VenueID != nil {
		var venue models.Venue
		if h.db.Get(&venue, `SELECT * FROM venues WHERE id=$1`, *deal.VenueID) == nil {
			deal.Venue = &venue
		}
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: deal})
}

func (h *DealsHandler) CreateDeal(c *gin.Context) {
	var req models.CreateDealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	if req.Currency == "" { req.Currency = "USD" }
	if req.Priority == "" { req.Priority = models.PriorityMedium }

	closeDate, err := models.ParseCloseDate(req.CloseDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	contactID := models.NilIfEmptyUUIDPtr(req.ContactID)
	assignedTo := models.NilIfEmptyUUIDPtr(req.AssignedTo)

	partnerID := models.NilIfEmptyUUIDPtr(req.PartnerID)
	venueID := models.NilIfEmptyUUIDPtr(req.VenueID)
	var eventDate *time.Time
	if req.EventDate != nil && *req.EventDate != "" {
		t, parseErr := time.Parse(time.RFC3339, *req.EventDate)
		if parseErr != nil {
			t, parseErr = time.Parse("2006-01-02", *req.EventDate)
		}
		if parseErr == nil { eventDate = &t }
	}
	id := uuid.New().String()
	_, err = h.db.Exec(`
		INSERT INTO deals (id, title, value, currency, pipeline_id, stage_id, contact_id, assigned_to, priority, close_date, notes, partner_id, venue_id, event_name, event_date, ticket_count)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
		id, req.Title, float64(req.Value), req.Currency, req.PipelineID, req.StageID,
		contactID, assignedTo, req.Priority, closeDate, req.Notes,
		partnerID, venueID, nilIfEmptyStr(req.EventName), eventDate, req.TicketCount,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Message: "deal created", Data: gin.H{"id": id}})
}

func (h *DealsHandler) UpdateDeal(c *gin.Context) {
	id := c.Param("id")
	var req models.CreateDealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	closeDate, err := models.ParseCloseDate(req.CloseDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	contactID := models.NilIfEmptyUUIDPtr(req.ContactID)
	assignedTo := models.NilIfEmptyUUIDPtr(req.AssignedTo)

	partnerID := models.NilIfEmptyUUIDPtr(req.PartnerID)
	venueID := models.NilIfEmptyUUIDPtr(req.VenueID)
	var eventDate *time.Time
	if req.EventDate != nil && *req.EventDate != "" {
		t, parseErr := time.Parse(time.RFC3339, *req.EventDate)
		if parseErr != nil {
			t, parseErr = time.Parse("2006-01-02", *req.EventDate)
		}
		if parseErr == nil { eventDate = &t }
	}
	_, err = h.db.Exec(`
		UPDATE deals SET title=$1, value=$2, currency=$3, pipeline_id=$4, stage_id=$5,
		contact_id=$6, assigned_to=$7, priority=$8, close_date=$9, notes=$10,
		partner_id=$11, venue_id=$12, event_name=$13, event_date=$14, ticket_count=$15,
		updated_at=NOW()
		WHERE id=$16`,
		req.Title, float64(req.Value), req.Currency, req.PipelineID, req.StageID,
		contactID, assignedTo, req.Priority, closeDate, req.Notes,
		partnerID, venueID, nilIfEmptyStr(req.EventName), eventDate, req.TicketCount, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "deal updated"})
}

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

func (h *DealsHandler) DeleteDeal(c *gin.Context) {
	id := c.Param("id")
	h.db.Exec(`DELETE FROM deals WHERE id=$1`, id)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "deal deleted"})
}

func (h *DealsHandler) GetDealActivities(c *gin.Context) {
	id := c.Param("id")
	var activities []models.Activity
	h.db.Select(&activities, `SELECT * FROM activities WHERE deal_id=$1 ORDER BY created_at DESC`, id)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: activities})
}

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
		id, req.Type, req.Subject, req.Description, req.DealID, req.ContactID, userID, req.DueDate.Ptr(), req.Duration,
	)
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Data: gin.H{"id": id}})
}

func nilIfEmptyStr(s string) *string {
	if s == "" { return nil }
	return &s
}
