package handlers

import (
	"net/http"

	"github.com/crm-ticketon/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type CitiesHandler struct {
	db *sqlx.DB
}

func NewCitiesHandler(db *sqlx.DB) *CitiesHandler {
	return &CitiesHandler{db: db}
}

func (h *CitiesHandler) List(c *gin.Context) {
	var cities []models.City
	if err := h.db.Select(&cities, `SELECT * FROM cities ORDER BY name ASC`); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	if cities == nil {
		cities = []models.City{}
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: cities})
}

func (h *CitiesHandler) Create(c *gin.Context) {
	var req models.CreateCityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	if req.Country == "" {
		req.Country = "Kazakhstan"
	}
	id := uuid.New().String()
	if _, err := h.db.Exec(`INSERT INTO cities (id, name, country) VALUES ($1,$2,$3)`, id, req.Name, req.Country); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Data: gin.H{"id": id}})
}

func (h *CitiesHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req models.CreateCityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}
	if _, err := h.db.Exec(`UPDATE cities SET name=$1, country=$2 WHERE id=$3`, req.Name, req.Country, id); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "city updated"})
}

func (h *CitiesHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if _, err := h.db.Exec(`DELETE FROM cities WHERE id=$1`, id); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "city deleted"})
}
