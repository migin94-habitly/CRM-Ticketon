package handlers

import (
	"fmt"
	"net/http"

	"github.com/crm-ticketon/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type VenuesHandler struct {
	db *sqlx.DB
}

func NewVenuesHandler(db *sqlx.DB) *VenuesHandler {
	return &VenuesHandler{db: db}
}

func (h *VenuesHandler) List(c *gin.Context) {
	cityID := c.Query("city_id")
	search := c.Query("search")

	where := "WHERE 1=1"
	args := []interface{}{}
	n := 1

	if cityID != "" {
		where += fmt.Sprintf(" AND v.city_id=$%d", n)
		args = append(args, cityID)
		n++
	}
	if search != "" {
		where += fmt.Sprintf(" AND v.name ILIKE $%d", n)
		args = append(args, "%"+search+"%")
		n++
	}
	_ = n

	query := fmt.Sprintf(`
		SELECT v.*, c.name as city_name, c.country as city_country
		FROM venues v
		LEFT JOIN cities c ON c.id = v.city_id
		%s ORDER BY v.name ASC`, where)

	type VenueRow struct {
		models.Venue
		CityName    *string `db:"city_name"`
		CityCountry *string `db:"city_country"`
	}

	rows, err := h.db.Queryx(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	defer rows.Close()

	venues := []models.Venue{}
	for rows.Next() {
		var row VenueRow
		if err := rows.StructScan(&row); err != nil {
			continue
		}
		v := row.Venue
		if row.CityName != nil && row.CityID != nil {
			v.City = &models.City{ID: *row.CityID, Name: *row.CityName}
			if row.CityCountry != nil {
				v.City.Country = *row.CityCountry
			}
		}
		venues = append(venues, v)
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: venues})
}

func (h *VenuesHandler) Create(c *gin.Context) {
	var req models.CreateVenueRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	cityID := models.NilIfEmptyUUIDPtr(req.CityID)
	id := uuid.New().String()
	if _, err := h.db.Exec(
		`INSERT INTO venues (id, name, address, city_id, capacity, description) VALUES ($1,$2,$3,$4,$5,$6)`,
		id, req.Name, nilIfEmpty(req.Address), cityID, req.Capacity, nilIfEmpty(req.Description),
	); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Data: gin.H{"id": id}})
}

func (h *VenuesHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req models.CreateVenueRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	cityID := models.NilIfEmptyUUIDPtr(req.CityID)
	if _, err := h.db.Exec(
		`UPDATE venues SET name=$1, address=$2, city_id=$3, capacity=$4, description=$5, updated_at=NOW() WHERE id=$6`,
		req.Name, nilIfEmpty(req.Address), cityID, req.Capacity, nilIfEmpty(req.Description), id,
	); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "venue updated"})
}

func (h *VenuesHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if _, err := h.db.Exec(`DELETE FROM venues WHERE id=$1`, id); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "venue deleted"})
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
