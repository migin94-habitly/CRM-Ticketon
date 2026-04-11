package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/crm-ticketon/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type PartnersHandler struct {
	db *sqlx.DB
}

func NewPartnersHandler(db *sqlx.DB) *PartnersHandler {
	return &PartnersHandler{db: db}
}

func (h *PartnersHandler) List(c *gin.Context) {
	search := c.Query("search")
	status := c.Query("status")
	cityID := c.Query("city_id")

	where := "WHERE 1=1"
	args := []interface{}{}
	n := 1

	if search != "" {
		where += fmt.Sprintf(" AND (p.name ILIKE $%d OR p.contact_person ILIKE $%d OR p.email ILIKE $%d)", n, n, n)
		args = append(args, "%"+search+"%")
		n++
	}
	if status != "" {
		where += fmt.Sprintf(" AND p.status=$%d", n)
		args = append(args, status)
		n++
	}
	if cityID != "" {
		where += fmt.Sprintf(" AND p.city_id=$%d", n)
		args = append(args, cityID)
		n++
	}
	_ = n

	query := fmt.Sprintf(`
		SELECT p.*,
			c.name as city_name,
			c.country as city_country,
			COUNT(d.id) as deals_count,
			COALESCE(SUM(CASE WHEN ps.is_won THEN d.value ELSE 0 END), 0) as total_revenue
		FROM partners p
		LEFT JOIN cities c ON c.id = p.city_id
		LEFT JOIN deals d ON d.partner_id = p.id
		LEFT JOIN pipeline_stages ps ON ps.id = d.stage_id
		%s
		GROUP BY p.id, c.name, c.country
		ORDER BY p.name ASC`, where)

	type PartnerRow struct {
		models.Partner
		CityName       *string `db:"city_name"`
		CityCountry    *string `db:"city_country"`
		DealsCountDB   int     `db:"deals_count"`
		TotalRevenueDB float64 `db:"total_revenue"`
	}

	rows, err := h.db.Queryx(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	defer rows.Close()

	partners := []models.Partner{}
	for rows.Next() {
		var row PartnerRow
		if err := rows.StructScan(&row); err != nil {
			continue
		}
		p := row.Partner
		p.DealsCount = row.DealsCountDB
		p.TotalRevenue = row.TotalRevenueDB
		if row.CityName != nil && row.CityID != nil {
			p.City = &models.City{ID: *row.CityID, Name: *row.CityName}
			if row.CityCountry != nil {
				p.City.Country = *row.CityCountry
			}
		}
		partners = append(partners, p)
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: partners})
}

func (h *PartnersHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var p models.Partner
	if err := h.db.Get(&p, `SELECT * FROM partners WHERE id=$1`, id); err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Error: "partner not found"})
		return
	}
	if p.CityID != nil {
		var city models.City
		if h.db.Get(&city, `SELECT * FROM cities WHERE id=$1`, *p.CityID) == nil {
			p.City = &city
		}
	}
	h.db.QueryRow(`SELECT COUNT(*) FROM deals WHERE partner_id=$1`, id).Scan(&p.DealsCount)
	h.db.QueryRow(`
		SELECT COALESCE(SUM(d.value), 0) FROM deals d
		JOIN pipeline_stages ps ON ps.id = d.stage_id
		WHERE d.partner_id=$1 AND ps.is_won=true`, id).Scan(&p.TotalRevenue)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: p})
}

func (h *PartnersHandler) Create(c *gin.Context) {
	var req models.CreatePartnerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	if req.Status == "" {
		req.Status = models.PartnerStatusActive
	}

	cityID := models.NilIfEmptyUUIDPtr(req.CityID)
	var contractDate *time.Time
	if req.ContractDate != nil && *req.ContractDate != "" {
		t, err := time.Parse("2006-01-02", *req.ContractDate)
		if err == nil {
			contractDate = &t
		}
	}

	id := uuid.New().String()
	_, err := h.db.Exec(`
		INSERT INTO partners (id, name, contact_person, email, phone, city_id, status, contract_number, contract_date, commission_rate, notes, website)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
		id,
		req.Name,
		nilIfEmpty(req.ContactPerson),
		nilIfEmpty(req.Email),
		nilIfEmpty(req.Phone),
		cityID,
		req.Status,
		nilIfEmpty(req.ContractNumber),
		contractDate,
		req.CommissionRate,
		nilIfEmpty(req.Notes),
		nilIfEmpty(req.Website),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Data: gin.H{"id": id}})
}

func (h *PartnersHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req models.CreatePartnerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}

	cityID := models.NilIfEmptyUUIDPtr(req.CityID)
	var contractDate *time.Time
	if req.ContractDate != nil && *req.ContractDate != "" {
		t, err := time.Parse("2006-01-02", *req.ContractDate)
		if err == nil {
			contractDate = &t
		}
	}

	_, err := h.db.Exec(`
		UPDATE partners SET name=$1, contact_person=$2, email=$3, phone=$4, city_id=$5,
		status=$6, contract_number=$7, contract_date=$8, commission_rate=$9, notes=$10, website=$11, updated_at=NOW()
		WHERE id=$12`,
		req.Name,
		nilIfEmpty(req.ContactPerson),
		nilIfEmpty(req.Email),
		nilIfEmpty(req.Phone),
		cityID,
		req.Status,
		nilIfEmpty(req.ContractNumber),
		contractDate,
		req.CommissionRate,
		nilIfEmpty(req.Notes),
		nilIfEmpty(req.Website),
		id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "partner updated"})
}

func (h *PartnersHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if _, err := h.db.Exec(`DELETE FROM partners WHERE id=$1`, id); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "partner deleted"})
}

func (h *PartnersHandler) GetStats(c *gin.Context) {
	id := c.Param("id")

	var stats models.PartnerStats
	stats.PartnerID = id

	h.db.QueryRow(`SELECT name FROM partners WHERE id=$1`, id).Scan(&stats.PartnerName)
	h.db.QueryRow(`SELECT COUNT(*) FROM deals WHERE partner_id=$1`, id).Scan(&stats.TotalDeals)
	h.db.QueryRow(`
		SELECT COUNT(*) FROM deals d
		JOIN pipeline_stages ps ON ps.id=d.stage_id
		WHERE d.partner_id=$1 AND ps.is_won=true`, id).Scan(&stats.WonDeals)
	h.db.QueryRow(`
		SELECT COUNT(*) FROM deals d
		JOIN pipeline_stages ps ON ps.id=d.stage_id
		WHERE d.partner_id=$1 AND ps.is_lost=true`, id).Scan(&stats.LostDeals)
	h.db.QueryRow(`
		SELECT COUNT(*) FROM deals d
		JOIN pipeline_stages ps ON ps.id=d.stage_id
		WHERE d.partner_id=$1 AND ps.is_won=false AND ps.is_lost=false`, id).Scan(&stats.ActiveDeals)
	h.db.QueryRow(`
		SELECT COALESCE(SUM(d.value),0) FROM deals d
		JOIN pipeline_stages ps ON ps.id=d.stage_id
		WHERE d.partner_id=$1 AND ps.is_won=true`, id).Scan(&stats.TotalRevenue)
	h.db.QueryRow(`
		SELECT COALESCE(AVG(d.value),0) FROM deals WHERE partner_id=$1`, id).Scan(&stats.AvgDealValue)
	h.db.QueryRow(`
		SELECT COALESCE(SUM(d.ticket_count),0) FROM deals d WHERE d.partner_id=$1`, id).Scan(&stats.TotalTickets)

	if stats.TotalDeals > 0 {
		stats.ConversionRate = float64(stats.WonDeals) / float64(stats.TotalDeals) * 100
	}

	type DealSummary struct {
		ID         string     `db:"id" json:"id"`
		Title      string     `db:"title" json:"title"`
		Value      float64    `db:"value" json:"value"`
		Priority   string     `db:"priority" json:"priority"`
		EventName  *string    `db:"event_name" json:"event_name,omitempty"`
		EventDate  *time.Time `db:"event_date" json:"event_date,omitempty"`
		CreatedAt  time.Time  `db:"created_at" json:"created_at"`
		StageName  string     `db:"stage_name" json:"stage_name"`
		StageColor string     `db:"stage_color" json:"stage_color"`
	}
	var recentDeals []DealSummary
	h.db.Select(&recentDeals, `
		SELECT d.id, d.title, d.value, d.priority, d.event_name, d.event_date, d.created_at,
			ps.name as stage_name, ps.color as stage_color
		FROM deals d
		JOIN pipeline_stages ps ON ps.id=d.stage_id
		WHERE d.partner_id=$1
		ORDER BY d.created_at DESC LIMIT 20`, id)
	if recentDeals == nil {
		recentDeals = []DealSummary{}
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: gin.H{
		"stats":        stats,
		"recent_deals": recentDeals,
	}})
}
