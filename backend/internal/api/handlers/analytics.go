package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/crm-ticketon/backend/internal/config"
	"github.com/crm-ticketon/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type AnalyticsHandler struct {
	db  *sqlx.DB
	cfg *config.AIConfig
}

func NewAnalyticsHandler(db *sqlx.DB, cfg *config.AIConfig) *AnalyticsHandler {
	return &AnalyticsHandler{db: db, cfg: cfg}
}

// GetDashboard godoc
// @Summary      Get dashboard metrics
// @Tags         analytics
// @Security     BearerAuth
// @Produce      json
// @Param        period  query  string  false  "Period: week, month, quarter, year (default: month)"
// @Success      200     {object}  models.DashboardMetrics
// @Router       /analytics/dashboard [get]
func (h *AnalyticsHandler) GetDashboard(c *gin.Context) {
	period := c.DefaultQuery("period", "month")
	var since time.Time
	switch period {
	case "week":
		since = time.Now().AddDate(0, 0, -7)
	case "quarter":
		since = time.Now().AddDate(0, -3, 0)
	case "year":
		since = time.Now().AddDate(-1, 0, 0)
	default:
		since = time.Now().AddDate(0, -1, 0)
	}

	m := &models.DashboardMetrics{
		PipelineBreakdown: []models.PipelineMetric{},
		ActivityBreakdown: []models.ActivityMetric{},
		RevenueByMonth:    []models.MonthlyRevenue{},
		TopPerformers:     []models.UserPerformance{},
	}

	// Total deals & value
	h.db.QueryRow(`SELECT COUNT(*), COALESCE(SUM(value),0) FROM deals`).Scan(&m.TotalDeals, &m.TotalValue)

	// Won
	h.db.QueryRow(`
		SELECT COUNT(*), COALESCE(SUM(d.value),0)
		FROM deals d
		JOIN pipeline_stages ps ON ps.id = d.stage_id
		WHERE ps.is_won = true`).Scan(&m.WonDeals, &m.WonValue)

	// Lost
	h.db.QueryRow(`
		SELECT COUNT(*) FROM deals d
		JOIN pipeline_stages ps ON ps.id = d.stage_id
		WHERE ps.is_lost = true`).Scan(&m.LostDeals)

	if m.TotalDeals > 0 {
		m.ConversionRate = float64(m.WonDeals) / float64(m.TotalDeals) * 100
		m.AvgDealValue = m.TotalValue / float64(m.TotalDeals)
	}

	// Contacts
	h.db.QueryRow(`SELECT COUNT(*) FROM contacts`).Scan(&m.TotalContacts)
	h.db.QueryRow(`SELECT COUNT(*) FROM contacts WHERE created_at >= NOW() - INTERVAL '1 day'`).Scan(&m.NewContactsToday)

	// Calls
	h.db.QueryRow(`SELECT COUNT(*), COALESCE(SUM(duration),0) FROM call_records WHERE created_at >= $1`, since).
		Scan(&m.TotalCalls, &m.TotalCallDuration)

	// Messages
	h.db.QueryRow(`SELECT COUNT(*) FROM whatsapp_messages WHERE created_at >= $1`, since).Scan(&m.TotalMessages)

	// Pipeline breakdown
	rows, _ := h.db.Queryx(`
		SELECT ps.id as stage_id, ps.name as stage_name, ps.color,
		       COUNT(d.id) as count, COALESCE(SUM(d.value),0) as value
		FROM pipeline_stages ps
		LEFT JOIN deals d ON d.stage_id = ps.id
		GROUP BY ps.id, ps.name, ps.color, ps.position
		ORDER BY ps.position ASC`)
	if rows != nil {
		for rows.Next() {
			var pm models.PipelineMetric
			rows.StructScan(&pm)
			m.PipelineBreakdown = append(m.PipelineBreakdown, pm)
		}
		rows.Close()
	}

	// Activity breakdown
	actRows, _ := h.db.Queryx(`
		SELECT type, COUNT(*) as count FROM activities
		WHERE created_at >= $1 GROUP BY type ORDER BY count DESC`, since)
	if actRows != nil {
		for actRows.Next() {
			var am models.ActivityMetric
			actRows.StructScan(&am)
			m.ActivityBreakdown = append(m.ActivityBreakdown, am)
		}
		actRows.Close()
	}

	// Revenue by month (last 6 months)
	revRows, _ := h.db.Queryx(`
		SELECT TO_CHAR(d.updated_at, 'YYYY-MM') as month,
		       COALESCE(SUM(CASE WHEN ps.is_won THEN d.value ELSE 0 END),0) as won,
		       0::float as target
		FROM deals d
		JOIN pipeline_stages ps ON ps.id = d.stage_id
		WHERE d.updated_at >= NOW() - INTERVAL '6 months'
		GROUP BY month ORDER BY month ASC`)
	if revRows != nil {
		for revRows.Next() {
			var mr models.MonthlyRevenue
			revRows.StructScan(&mr)
			m.RevenueByMonth = append(m.RevenueByMonth, mr)
		}
		revRows.Close()
	}

	// Top performers
	perfRows, _ := h.db.Queryx(`
		SELECT u.id as user_id, u.first_name || ' ' || u.last_name as name,
		       COALESCE(u.avatar,'') as avatar,
		       COUNT(CASE WHEN ps.is_won THEN 1 END) as deals_won,
		       COALESCE(SUM(CASE WHEN ps.is_won THEN d.value ELSE 0 END),0) as revenue,
		       (SELECT COUNT(*) FROM call_records cr WHERE cr.user_id = u.id AND cr.created_at >= $1) as calls_made,
		       0::float as score
		FROM users u
		LEFT JOIN deals d ON d.assigned_to = u.id
		LEFT JOIN pipeline_stages ps ON ps.id = d.stage_id
		WHERE u.is_active = true
		GROUP BY u.id, u.first_name, u.last_name, u.avatar
		ORDER BY revenue DESC LIMIT 5`, since)
	if perfRows != nil {
		for perfRows.Next() {
			var up models.UserPerformance
			perfRows.StructScan(&up)
			m.TopPerformers = append(m.TopPerformers, up)
		}
		perfRows.Close()
	}

	// AI insights
	m.AIInsights = h.generateInsights(m)

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: m})
}

func (h *AnalyticsHandler) generateInsights(m *models.DashboardMetrics) []string {
	insights := []string{}
	if m.ConversionRate < 20 {
		insights = append(insights, "Conversion rate is below 20% — review qualification stage criteria")
	}
	if m.ConversionRate >= 40 {
		insights = append(insights, fmt.Sprintf("Strong conversion rate of %.1f%% — pipeline is healthy", m.ConversionRate))
	}
	if m.TotalCalls > 0 && m.TotalCallDuration/m.TotalCalls < 60 {
		insights = append(insights, "Average call duration is under 1 minute — consider longer discovery calls")
	}
	if m.NewContactsToday == 0 {
		insights = append(insights, "No new contacts today — consider lead generation activities")
	}
	if m.AvgDealValue > 0 {
		insights = append(insights, fmt.Sprintf("Average deal value: $%.0f", m.AvgDealValue))
	}
	if len(insights) == 0 {
		insights = append(insights, "Pipeline looks healthy — keep up the momentum!")
	}
	return insights
}

// AnalyzeDeal godoc
// @Summary      AI analysis for a deal
// @Tags         analytics
// @Security     BearerAuth
// @Param        id  path  string  true  "Deal ID"
// @Produce      json
// @Success      200  {object}  models.AIScore
// @Router       /analytics/deals/{id} [get]
func (h *AnalyticsHandler) AnalyzeDeal(c *gin.Context) {
	dealID := c.Param("id")

	// Check cache
	var cached models.AIScore
	err := h.db.Get(&cached, `
		SELECT * FROM ai_scores
		WHERE entity_type='deal' AND entity_id=$1
		AND generated_at > NOW() - INTERVAL '1 hour'
		ORDER BY generated_at DESC LIMIT 1`, dealID)
	if err == nil {
		c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: cached})
		return
	}

	// Build context from deal + activities + calls
	var deal models.Deal
	h.db.Get(&deal, `SELECT * FROM deals WHERE id=$1`, dealID)

	var activities []models.Activity
	h.db.Select(&activities, `SELECT * FROM activities WHERE deal_id=$1 ORDER BY created_at DESC LIMIT 10`, dealID)

	var calls []models.CallRecord
	h.db.Select(&calls, `SELECT * FROM call_records WHERE deal_id=$1 ORDER BY created_at DESC LIMIT 5`, dealID)

	score := h.callAI("deal", dealID, deal, activities, calls)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: score})
}

// AnalyzeCall godoc
// @Summary      AI analysis for a call recording
// @Tags         analytics
// @Security     BearerAuth
// @Param        id  path  string  true  "Call ID"
// @Produce      json
// @Success      200  {object}  models.AIScore
// @Router       /analytics/calls/{id} [get]
func (h *AnalyticsHandler) AnalyzeCall(c *gin.Context) {
	callID := c.Param("id")
	var call models.CallRecord
	if err := h.db.Get(&call, `SELECT * FROM call_records WHERE id=$1`, callID); err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Error: "call not found"})
		return
	}
	score := h.callAI("call", callID, call, nil, nil)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: score})
}

func (h *AnalyticsHandler) callAI(entityType, entityID string, entity interface{}, activities []models.Activity, calls []models.CallRecord) *models.AIScore {
	score := &models.AIScore{
		ID:          uuid.New().String(),
		EntityType:  entityType,
		EntityID:    entityID,
		GeneratedAt: time.Now(),
	}

	if h.cfg.APIKey == "" {
		// Fallback: rule-based scoring
		score.Score = 65
		score.Sentiment = "neutral"
		s := `{"insights":["Enable AI API key for detailed analysis"]}`; score.RawJSON = &s
		return score
	}

	// Build prompt
	contextJSON, _ := json.Marshal(map[string]interface{}{
		"entity":     entity,
		"activities": activities,
		"calls":      calls,
	})

	prompt := fmt.Sprintf(`Analyze this CRM %s data and provide:
1. A win probability score (0-100)
2. Sentiment (positive/neutral/negative)
3. Top 3 insights
4. Top 3 next-step suggestions
Return JSON: {"score": number, "sentiment": string, "insights": [string], "suggestions": [string]}

Data: %s`, entityType, string(contextJSON))

	result := h.openAICall(prompt)
	if result != nil {
		score.Score = result.Score
		score.Sentiment = result.Sentiment
		rawJSONBytes, _ := json.Marshal(result)
		rawJSONStr := string(rawJSONBytes)
		score.RawJSON = &rawJSONStr
	} else {
		score.Score = 50
		score.Sentiment = "neutral"
	}

	// Persist
	h.db.Exec(`
		INSERT INTO ai_scores (id, entity_type, entity_id, score, sentiment, raw_json, generated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		score.ID, score.EntityType, score.EntityID,
		score.Score, score.Sentiment, score.RawJSON, score.GeneratedAt,
	)

	return score
}

type aiResult struct {
	Score       float64  `json:"score"`
	Sentiment   string   `json:"sentiment"`
	Insights    []string `json:"insights"`
	Suggestions []string `json:"suggestions"`
}

func (h *AnalyticsHandler) openAICall(prompt string) *aiResult {
	url := h.cfg.BaseURL
	if url == "" { url = "https://api.openai.com/v1/chat/completions" }
	model := h.cfg.Model
	if model == "" { model = "gpt-4o-mini" }

	body, _ := json.Marshal(map[string]interface{}{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": "You are a CRM sales analytics AI. Always respond with valid JSON only."},
			{"role": "user", "content": prompt},
		},
		"temperature": 0.3,
		"max_tokens":  500,
	})

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil { return nil }
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+h.cfg.APIKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil { return nil }
	defer resp.Body.Close()

	var apiResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	data, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(data, &apiResp); err != nil { return nil }
	if len(apiResp.Choices) == 0 { return nil }

	var result aiResult
	if err := json.Unmarshal([]byte(apiResp.Choices[0].Message.Content), &result); err != nil {
		return nil
	}
	return &result
}

// GetSalesForecast godoc
// @Summary      AI sales forecast
// @Tags         analytics
// @Security     BearerAuth
// @Produce      json
// @Router       /analytics/forecast [get]
func (h *AnalyticsHandler) GetSalesForecast(c *gin.Context) {
	type ForecastItem struct {
		Month    string  `json:"month"`
		Forecast float64 `json:"forecast"`
		Pipeline float64 `json:"pipeline"`
	}

	// Simple weighted pipeline forecast
	var items []ForecastItem
	rows, _ := h.db.Queryx(`
		SELECT
			TO_CHAR(COALESCE(d.close_date, NOW() + INTERVAL '30 days'), 'YYYY-MM') as month,
			COALESCE(SUM(d.value * ps.probability / 100.0), 0) as forecast,
			COALESCE(SUM(d.value), 0) as pipeline
		FROM deals d
		JOIN pipeline_stages ps ON ps.id = d.stage_id
		WHERE ps.is_won = false AND ps.is_lost = false
		AND COALESCE(d.close_date, NOW() + INTERVAL '90 days') <= NOW() + INTERVAL '3 months'
		GROUP BY month ORDER BY month ASC
	`)
	if rows != nil {
		for rows.Next() {
			var item ForecastItem
			rows.StructScan(&item)
			items = append(items, item)
		}
		rows.Close()
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: gin.H{
		"forecast": items,
		"ai_note":  "Forecast based on weighted pipeline probability scores",
	}})
}
