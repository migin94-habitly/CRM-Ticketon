package handlers

import (
	"net/http"

	"github.com/crm-ticketon/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type ChecklistHandler struct {
	db *sqlx.DB
}

func NewChecklistHandler(db *sqlx.DB) *ChecklistHandler {
	return &ChecklistHandler{db: db}
}

func (h *ChecklistHandler) List(c *gin.Context) {
	dealID := c.Param("id")
	var items []models.ChecklistItem
	if err := h.db.Select(&items,
		`SELECT * FROM deal_checklist_items WHERE deal_id=$1 ORDER BY position ASC, created_at ASC`,
		dealID,
	); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	if items == nil {
		items = []models.ChecklistItem{}
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: items})
}

func (h *ChecklistHandler) Create(c *gin.Context) {
	dealID := c.Param("id")
	var req models.CreateChecklistItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}

	var maxPos int
	h.db.QueryRow(`SELECT COALESCE(MAX(position),0) FROM deal_checklist_items WHERE deal_id=$1`, dealID).Scan(&maxPos)

	id := uuid.New().String()
	if _, err := h.db.Exec(
		`INSERT INTO deal_checklist_items (id, deal_id, text, is_done, position) VALUES ($1,$2,$3,false,$4)`,
		id, dealID, req.Text, maxPos+1,
	); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	var item models.ChecklistItem
	h.db.Get(&item, `SELECT * FROM deal_checklist_items WHERE id=$1`, id)
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Data: item})
}

func (h *ChecklistHandler) Toggle(c *gin.Context) {
	itemID := c.Param("item_id")
	var item models.ChecklistItem
	if err := h.db.Get(&item, `SELECT * FROM deal_checklist_items WHERE id=$1`, itemID); err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Error: "item not found"})
		return
	}
	newDone := !item.IsDone
	h.db.Exec(`UPDATE deal_checklist_items SET is_done=$1, updated_at=NOW() WHERE id=$2`, newDone, itemID)
	item.IsDone = newDone
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: item})
}

func (h *ChecklistHandler) Update(c *gin.Context) {
	itemID := c.Param("item_id")
	var req models.CreateChecklistItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	h.db.Exec(`UPDATE deal_checklist_items SET text=$1, updated_at=NOW() WHERE id=$2`, req.Text, itemID)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "updated"})
}

func (h *ChecklistHandler) Delete(c *gin.Context) {
	itemID := c.Param("item_id")
	h.db.Exec(`DELETE FROM deal_checklist_items WHERE id=$1`, itemID)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "deleted"})
}
