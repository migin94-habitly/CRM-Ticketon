package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type SettingsHandler struct {
	db *sqlx.DB
}

func NewSettingsHandler(db *sqlx.DB) *SettingsHandler {
	return &SettingsHandler{db: db}
}

var validSettingsCategories = map[string]bool{
	"telephony": true,
	"whatsapp":  true,
	"ai":        true,
}

// GetSettings returns settings for a category; API keys are masked.
func (h *SettingsHandler) GetSettings(c *gin.Context) {
	category := c.Param("category")
	if !validSettingsCategories[category] {
		c.JSON(400, gin.H{"error": "invalid category"})
		return
	}

	rows, err := h.db.Query(
		"SELECT key, value FROM system_settings WHERE category = $1", category,
	)
	if err != nil {
		c.JSON(500, gin.H{"error": "database error"})
		return
	}
	defer rows.Close()

	settings := map[string]string{}
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		if key == "api_key" && len(value) > 4 {
			settings[key] = "***" + value[len(value)-4:]
		} else {
			settings[key] = value
		}
	}

	c.JSON(200, gin.H{"data": settings})
}

// SaveSettings upserts key-value pairs for a category.
// Masked values ("***xxxx") are skipped to avoid overwriting with placeholders.
func (h *SettingsHandler) SaveSettings(c *gin.Context) {
	category := c.Param("category")
	if !validSettingsCategories[category] {
		c.JSON(400, gin.H{"error": "invalid category"})
		return
	}

	var data map[string]string
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(400, gin.H{"error": "invalid request body"})
		return
	}

	for key, value := range data {
		if value == "" {
			continue
		}
		// Skip masked API key placeholder
		if len(value) > 3 && value[:3] == "***" {
			continue
		}
		_, err := h.db.Exec(`
			INSERT INTO system_settings (category, key, value, updated_at)
			VALUES ($1, $2, $3, NOW())
			ON CONFLICT (category, key) DO UPDATE
			  SET value = EXCLUDED.value, updated_at = NOW()
		`, category, key, value)
		if err != nil {
			c.JSON(500, gin.H{"error": "failed to save setting: " + key})
			return
		}
	}

	c.JSON(200, gin.H{"message": "Настройки сохранены"})
}

// TestSettings verifies connectivity for the given integration category.
func (h *SettingsHandler) TestSettings(c *gin.Context) {
	category := c.Param("category")
	if !validSettingsCategories[category] {
		c.JSON(400, gin.H{"success": false, "message": "invalid category"})
		return
	}

	rows, err := h.db.Query(
		"SELECT key, value FROM system_settings WHERE category = $1", category,
	)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "database error"})
		return
	}
	defer rows.Close()

	settings := map[string]string{}
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		settings[key] = value
	}

	switch category {
	case "ai":
		testAIConnection(c, settings)
	case "telephony":
		testTelephonyConnection(c, settings)
	case "whatsapp":
		testWhatsAppConnection(c, settings)
	default:
		c.JSON(400, gin.H{"success": false, "message": "unknown category"})
	}
}

// LoadSettingsFromDB returns unmasked key-value settings for a category.
// Useful for other handlers that need runtime DB-stored config.
func LoadSettingsFromDB(db *sqlx.DB, category string) map[string]string {
	rows, err := db.Query(
		"SELECT key, value FROM system_settings WHERE category = $1", category,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	out := map[string]string{}
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		out[key] = value
	}
	return out
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

func testAIConnection(c *gin.Context, settings map[string]string) {
	apiKey := settings["api_key"]
	if apiKey == "" {
		c.JSON(200, gin.H{"success": false, "message": "API ключ не задан"})
		return
	}

	baseURL := settings["base_url"]
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1/chat/completions"
	}
	model := settings["model"]
	if model == "" {
		model = "gpt-4o-mini"
	}

	body, _ := json.Marshal(map[string]interface{}{
		"model": model,
		"messages": []map[string]string{
			{"role": "user", "content": "Say 'ok'"},
		},
		"max_tokens": 5,
	})

	req, err := http.NewRequest("POST", baseURL, bytes.NewBuffer(body))
	if err != nil {
		c.JSON(200, gin.H{"success": false, "message": "Ошибка формирования запроса: " + err.Error()})
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(200, gin.H{"success": false, "message": "Ошибка соединения: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		c.JSON(200, gin.H{"success": true, "message": "ИИ API подключён. Модель: " + model})
		return
	}
	data, _ := io.ReadAll(resp.Body)
	c.JSON(200, gin.H{
		"success": false,
		"message": fmt.Sprintf("Ошибка API (HTTP %d): %s", resp.StatusCode, string(data)),
	})
}

func testTelephonyConnection(c *gin.Context, settings map[string]string) {
	apiURL := settings["api_url"]
	apiKey := settings["api_key"]

	if apiURL == "" {
		c.JSON(200, gin.H{"success": false, "message": "URL API телефонии не задан"})
		return
	}
	if apiKey == "" {
		c.JSON(200, gin.H{"success": false, "message": "API ключ телефонии не задан"})
		return
	}

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		c.JSON(200, gin.H{"success": false, "message": "Неверный URL: " + err.Error()})
		return
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("X-API-Key", apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(200, gin.H{"success": false, "message": "Ошибка соединения: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < 500 {
		c.JSON(200, gin.H{
			"success": true,
			"message": fmt.Sprintf("Сервер телефонии доступен (HTTP %d)", resp.StatusCode),
		})
	} else {
		c.JSON(200, gin.H{
			"success": false,
			"message": fmt.Sprintf("Сервер телефонии вернул ошибку (HTTP %d)", resp.StatusCode),
		})
	}
}

func testWhatsAppConnection(c *gin.Context, settings map[string]string) {
	apiKey := settings["api_key"]
	if apiKey == "" {
		c.JSON(200, gin.H{"success": false, "message": "API ключ WhatsApp не задан"})
		return
	}

	provider := settings["provider"]
	if provider == "" {
		provider = "meta"
	}

	switch provider {
	case "meta":
		phoneID := settings["phone_id"]
		if phoneID == "" {
			c.JSON(200, gin.H{"success": false, "message": "Phone ID не задан для Meta WhatsApp API"})
			return
		}
		url := "https://graph.facebook.com/v18.0/" + phoneID
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			c.JSON(200, gin.H{"success": false, "message": "Ошибка формирования запроса"})
			return
		}
		req.Header.Set("Authorization", "Bearer "+apiKey)

		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			c.JSON(200, gin.H{"success": false, "message": "Ошибка соединения с Meta API: " + err.Error()})
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode == 200 {
			c.JSON(200, gin.H{"success": true, "message": "Meta WhatsApp Business API подключён успешно"})
		} else {
			data, _ := io.ReadAll(resp.Body)
			c.JSON(200, gin.H{
				"success": false,
				"message": fmt.Sprintf("Ошибка Meta API (HTTP %d): %s", resp.StatusCode, string(data)),
			})
		}

	default:
		// Wazzup / Chat-API / other: just do an HTTP GET to api_url
		apiURL := settings["api_url"]
		if apiURL == "" {
			c.JSON(200, gin.H{
				"success": false,
				"message": fmt.Sprintf("API URL не задан для провайдера '%s'", provider),
			})
			return
		}
		req, err := http.NewRequest("GET", apiURL, nil)
		if err != nil {
			c.JSON(200, gin.H{"success": false, "message": "Неверный URL: " + err.Error()})
			return
		}
		req.Header.Set("Authorization", "Bearer "+apiKey)

		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			c.JSON(200, gin.H{"success": false, "message": "Ошибка соединения: " + err.Error()})
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode < 500 {
			c.JSON(200, gin.H{
				"success": true,
				"message": fmt.Sprintf("Сервер %s доступен (HTTP %d)", provider, resp.StatusCode),
			})
		} else {
			c.JSON(200, gin.H{
				"success": false,
				"message": fmt.Sprintf("Сервер вернул ошибку (HTTP %d)", resp.StatusCode),
			})
		}
	}
}
