package handlers

import (
	"net/http"

	"github.com/crm-ticketon/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type WhatsAppHandler struct {
	db *sqlx.DB
}

func NewWhatsAppHandler(db *sqlx.DB) *WhatsAppHandler {
	return &WhatsAppHandler{db: db}
}

// SendMessage godoc
// @Summary      Send WhatsApp message
// @Tags         whatsapp
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body  models.SendWhatsAppRequest  true  "Message data"
// @Success      201   {object}  models.APIResponse
// @Router       /whatsapp/messages [post]
func (h *WhatsAppHandler) SendMessage(c *gin.Context) {
	var req models.SendWhatsAppRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}

	userID := c.GetString("user_id")
	// Get sender's WhatsApp number from config
	fromNumber := "+10000000000" // In production: from config/integration settings

	msgID := uuid.New().String()
	_, err := h.db.Exec(`
		INSERT INTO whatsapp_messages (id, contact_id, deal_id, user_id, direction, from_number, to_number, body, status, sent_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
		msgID, req.ContactID, req.DealID, userID, models.MessageOutgoing,
		fromNumber, req.ToNumber, req.Body, "sent",
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	// In production: call Meta WhatsApp Business API / Wazzup / Chat-API
	// POST to https://graph.facebook.com/v18.0/{phone_number_id}/messages
	// with Bearer token

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "message sent",
		Data:    gin.H{"id": msgID, "status": "sent"},
	})
}

// ListMessages godoc
// @Summary      List WhatsApp conversations
// @Tags         whatsapp
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  models.APIResponse
// @Router       /whatsapp/messages [get]
func (h *WhatsAppHandler) ListMessages(c *gin.Context) {
	contactID := c.Query("contact_id")
	dealID := c.Query("deal_id")

	query := `SELECT * FROM whatsapp_messages WHERE 1=1`
	args := []interface{}{}
	n := 1

	if contactID != "" {
		query += ` AND contact_id=$1`
		args = append(args, contactID)
		n++
	}
	if dealID != "" {
		query += ` AND deal_id=$` + string(rune('0'+n))
		args = append(args, dealID)
	}
	query += ` ORDER BY created_at ASC LIMIT 100`

	var messages []models.WhatsAppMessage
	h.db.Select(&messages, query, args...)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: messages})
}

// GetConversations returns unique conversations grouped by contact
func (h *WhatsAppHandler) GetConversations(c *gin.Context) {
	type Conversation struct {
		ContactID   *string `db:"contact_id" json:"contact_id"`
		ContactName string  `json:"contact_name"`
		LastMessage string  `db:"last_message" json:"last_message"`
		UnreadCount int     `db:"unread_count" json:"unread_count"`
		LastAt      string  `db:"last_at" json:"last_at"`
	}

	var convs []struct {
		ContactID   *string `db:"contact_id"`
		LastMessage string  `db:"last_message"`
		UnreadCount int     `db:"unread_count"`
		LastAt      string  `db:"last_at"`
		ToNumber    string  `db:"to_number"`
		FromNumber  string  `db:"from_number"`
	}
	h.db.Select(&convs, `
		SELECT DISTINCT ON (COALESCE(contact_id::text, to_number))
			contact_id,
			body as last_message,
			(SELECT COUNT(*) FROM whatsapp_messages wm2
			 WHERE wm2.contact_id = wm.contact_id AND wm2.direction='incoming' AND wm2.read_at IS NULL) as unread_count,
			created_at::text as last_at,
			to_number, from_number
		FROM whatsapp_messages wm
		ORDER BY COALESCE(contact_id::text, to_number), created_at DESC
	`)

	result := []map[string]interface{}{}
	for _, conv := range convs {
		m := map[string]interface{}{
			"last_message": conv.LastMessage,
			"unread_count": conv.UnreadCount,
			"last_at":      conv.LastAt,
			"to_number":    conv.ToNumber,
		}
		if conv.ContactID != nil {
			m["contact_id"] = *conv.ContactID
			var ct models.Contact
			if h.db.Get(&ct, `SELECT id, first_name, last_name, phone, avatar FROM contacts WHERE id=$1`, *conv.ContactID) == nil {
				m["contact_name"] = ct.FirstName + " " + ct.LastName
				m["contact"] = ct
			}
		}
		result = append(result, m)
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: result})
}

// WhatsAppWebhook handles incoming messages from WhatsApp provider
// @Summary      WhatsApp webhook
// @Tags         whatsapp
// @Accept       json
// @Produce      json
// @Router       /webhooks/whatsapp [post]
func (h *WhatsAppHandler) WebhookHandler(c *gin.Context) {
	// Meta / WhatsApp Business API webhook format
	var payload struct {
		Object string `json:"object"`
		Entry  []struct {
			Changes []struct {
				Value struct {
					Messages []struct {
						ID        string `json:"id"`
						From      string `json:"from"`
						Timestamp string `json:"timestamp"`
						Type      string `json:"type"`
						Text      struct {
							Body string `json:"body"`
						} `json:"text"`
					} `json:"messages"`
					Metadata struct {
						DisplayPhoneNumber string `json:"display_phone_number"`
					} `json:"metadata"`
				} `json:"value"`
			} `json:"changes"`
		} `json:"entry"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for _, entry := range payload.Entry {
		for _, change := range entry.Changes {
			for _, msg := range change.Value.Messages {
				// Try to match contact
				var contactID *string
				var ct models.Contact
				if h.db.Get(&ct, `SELECT id FROM contacts WHERE phone=$1 OR whatsapp_id=$1 LIMIT 1`, msg.From) == nil {
					contactID = &ct.ID
				}

				msgID := uuid.New().String()
				h.db.Exec(`
					INSERT INTO whatsapp_messages
					(id, external_id, contact_id, direction, from_number, to_number, body, status, sent_at)
					VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
					ON CONFLICT (external_id) DO NOTHING`,
					msgID, msg.ID, contactID, models.MessageIncoming,
					msg.From, change.Value.Metadata.DisplayPhoneNumber,
					msg.Text.Body, "delivered",
				)
			}
		}
	}
	c.JSON(http.StatusOK, gin.H{"received": true})
}

// WhatsApp webhook verification (GET)
func (h *WhatsAppHandler) WebhookVerify(c *gin.Context) {
	mode := c.Query("hub.mode")
	token := c.Query("hub.verify_token")
	challenge := c.Query("hub.challenge")
	// In production: verify token against config
	if mode == "subscribe" && token != "" {
		c.String(http.StatusOK, challenge)
		return
	}
	c.JSON(http.StatusForbidden, gin.H{"error": "verification failed"})
}

// MarkMessageRead marks a message as read
func (h *WhatsAppHandler) MarkMessageRead(c *gin.Context) {
	id := c.Param("id")
	h.db.Exec(`UPDATE whatsapp_messages SET read_at=NOW() WHERE id=$1`, id)
	c.JSON(http.StatusOK, models.APIResponse{Success: true})
}
