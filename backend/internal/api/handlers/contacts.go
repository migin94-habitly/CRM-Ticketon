package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/crm-ticketon/backend/internal/api/middleware"
	"github.com/crm-ticketon/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type ContactsHandler struct {
	db *sqlx.DB
}

func NewContactsHandler(db *sqlx.DB) *ContactsHandler {
	return &ContactsHandler{db: db}
}

// ListContacts godoc
// @Summary      List contacts
// @Tags         contacts
// @Security     BearerAuth
// @Produce      json
// @Param        page    query  int     false  "Page number"
// @Param        limit   query  int     false  "Items per page"
// @Param        search  query  string  false  "Search by name/email/phone"
// @Success      200  {object}  models.PaginatedResponse
// @Router       /contacts [get]
func (h *ContactsHandler) ListContacts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	search := c.Query("search")
	assignedTo := c.Query("assigned_to")
	status := c.Query("status")

	if page < 1 { page = 1 }
	if limit < 1 || limit > 100 { limit = 20 }
	offset := (page - 1) * limit

	where := "WHERE 1=1"
	args := []interface{}{}
	argN := 1

	if search != "" {
		where += fmt.Sprintf(` AND (first_name ILIKE $%d OR last_name ILIKE $%d OR email ILIKE $%d OR phone ILIKE $%d OR company ILIKE $%d)`, argN, argN, argN, argN, argN)
		args = append(args, "%"+search+"%")
		argN++
	}
	if assignedTo != "" {
		where += fmt.Sprintf(` AND assigned_to=$%d`, argN)
		args = append(args, assignedTo)
		argN++
	}
	if status != "" {
		where += fmt.Sprintf(` AND status=$%d`, argN)
		args = append(args, status)
		argN++
	}

	var total int64
	h.db.QueryRow(fmt.Sprintf(`SELECT COUNT(*) FROM contacts %s`, where), args...).Scan(&total)

	args = append(args, limit, offset)
	query := fmt.Sprintf(`
		SELECT c.*,
			(SELECT COUNT(*) FROM deals d WHERE d.contact_id = c.id) as deals_count
		FROM contacts c
		%s ORDER BY c.created_at DESC LIMIT $%d OFFSET $%d`,
		where, argN, argN+1)

	rows, err := h.db.Queryx(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	defer rows.Close()

	contacts := []models.Contact{}
	for rows.Next() {
		var ct models.Contact
		if err := rows.StructScan(&ct); err == nil {
			// Load tags
			h.db.Select(&ct.Tags, `SELECT tag FROM contact_tags WHERE contact_id=$1`, ct.ID)
			contacts = append(contacts, ct)
		}
	}

	totalPages := int(total) / limit
	if int(total)%limit != 0 { totalPages++ }

	c.JSON(http.StatusOK, models.PaginatedResponse{
		Data: contacts, Total: total, Page: page, Limit: limit, TotalPages: totalPages,
	})
}

// GetContact godoc
// @Summary      Get contact by ID
// @Tags         contacts
// @Security     BearerAuth
// @Produce      json
// @Param        id   path  string  true  "Contact ID"
// @Success      200  {object}  models.Contact
// @Router       /contacts/{id} [get]
func (h *ContactsHandler) GetContact(c *gin.Context) {
	id := c.Param("id")
	var ct models.Contact
	if err := h.db.QueryRowx(`SELECT * FROM contacts WHERE id=$1`, id).StructScan(&ct); err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Error: "contact not found"})
		return
	}
	h.db.Select(&ct.Tags, `SELECT tag FROM contact_tags WHERE contact_id=$1`, ct.ID)
	// Load assigned user
	if ct.AssignedTo != nil {
		var u models.User
		if h.db.Get(&u, `SELECT id, first_name, last_name, email, role, avatar FROM users WHERE id=$1`, *ct.AssignedTo) == nil {
			ct.AssignedUser = &u
		}
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: ct})
}

// CreateContact godoc
// @Summary      Create contact
// @Tags         contacts
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      models.CreateContactRequest  true  "Contact data"
// @Success      201   {object}  models.APIResponse
// @Router       /contacts [post]
func (h *ContactsHandler) CreateContact(c *gin.Context) {
	var req models.CreateContactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}

	if req.Status == "" { req.Status = models.ContactStatusNew }

	id := uuid.New().String()
	_, err := h.db.Exec(`
		INSERT INTO contacts (id, first_name, last_name, email, phone, company, position, status, source, assigned_to, notes)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		id, req.FirstName, req.LastName, req.Email, req.Phone, req.Company,
		req.Position, req.Status, req.Source, req.AssignedTo, req.Notes,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	for _, tag := range req.Tags {
		h.db.Exec(`INSERT INTO contact_tags (contact_id, tag) VALUES ($1,$2) ON CONFLICT DO NOTHING`, id, tag)
	}

	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Message: "contact created", Data: gin.H{"id": id}})
}

// UpdateContact godoc
// @Summary      Update contact
// @Tags         contacts
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id    path  string  true  "Contact ID"
// @Success      200   {object}  models.APIResponse
// @Router       /contacts/{id} [put]
func (h *ContactsHandler) UpdateContact(c *gin.Context) {
	id := c.Param("id")
	var req models.CreateContactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}

	_, err := h.db.Exec(`
		UPDATE contacts SET first_name=$1, last_name=$2, email=$3, phone=$4, company=$5,
		position=$6, status=$7, source=$8, assigned_to=$9, notes=$10, updated_at=NOW()
		WHERE id=$11`,
		req.FirstName, req.LastName, req.Email, req.Phone, req.Company,
		req.Position, req.Status, req.Source, req.AssignedTo, req.Notes, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	// Refresh tags
	h.db.Exec(`DELETE FROM contact_tags WHERE contact_id=$1`, id)
	for _, tag := range req.Tags {
		h.db.Exec(`INSERT INTO contact_tags (contact_id, tag) VALUES ($1,$2)`, id, tag)
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "contact updated"})
}

// DeleteContact godoc
// @Summary      Delete contact
// @Tags         contacts
// @Security     BearerAuth
// @Param        id  path  string  true  "Contact ID"
// @Success      200  {object}  models.APIResponse
// @Router       /contacts/{id} [delete]
func (h *ContactsHandler) DeleteContact(c *gin.Context) {
	id := c.Param("id")
	if _, err := h.db.Exec(`DELETE FROM contacts WHERE id=$1`, id); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "contact deleted"})
}

// GetContactActivities returns all activities for a contact
func (h *ContactsHandler) GetContactActivities(c *gin.Context) {
	id := c.Param("id")
	var activities []models.Activity
	h.db.Select(&activities, `SELECT * FROM activities WHERE contact_id=$1 ORDER BY created_at DESC LIMIT 50`, id)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: activities})
}

// GetContactCalls returns all calls for a contact
func (h *ContactsHandler) GetContactCalls(c *gin.Context) {
	id := c.Param("id")
	var calls []models.CallRecord
	h.db.Select(&calls, `SELECT * FROM call_records WHERE contact_id=$1 ORDER BY created_at DESC LIMIT 50`, id)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: calls})
}

// GetContactMessages returns WhatsApp messages for a contact
func (h *ContactsHandler) GetContactMessages(c *gin.Context) {
	id := c.Param("id")
	var messages []models.WhatsAppMessage
	h.db.Select(&messages, `SELECT * FROM whatsapp_messages WHERE contact_id=$1 ORDER BY created_at ASC LIMIT 100`, id)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: messages})
}

// ExportContacts exports contacts as JSON
func (h *ContactsHandler) ExportContacts(c *gin.Context) {
	role := middleware.GetUserRole(c)
	if role == "viewer" {
		c.JSON(http.StatusForbidden, models.APIResponse{Error: "insufficient permissions"})
		return
	}
	var contacts []models.Contact
	h.db.Select(&contacts, `SELECT * FROM contacts ORDER BY created_at DESC`)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: contacts})
}
