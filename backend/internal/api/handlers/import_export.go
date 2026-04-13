package handlers

import (
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/crm-ticketon/backend/internal/api/middleware"
	"github.com/crm-ticketon/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type ImportExportHandler struct {
	db *sqlx.DB
}

func NewImportExportHandler(db *sqlx.DB) *ImportExportHandler {
	return &ImportExportHandler{db: db}
}

// utf8BOM prepends a UTF-8 BOM so Excel opens the file with correct encoding.
var utf8BOM = []byte{0xEF, 0xBB, 0xBF}

func strDeref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func strPtr2(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACTS
// ─────────────────────────────────────────────────────────────────────────────

func (h *ImportExportHandler) ExportContactsCSV(c *gin.Context) {
	var contacts []models.Contact
	h.db.Select(&contacts, `SELECT * FROM contacts ORDER BY created_at DESC`)

	c.Header("Content-Disposition", `attachment; filename="contacts.csv"`)
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Cache-Control", "no-cache")
	c.Writer.WriteHeader(http.StatusOK)
	c.Writer.Write(utf8BOM)

	w := csv.NewWriter(c.Writer)
	_ = w.Write([]string{
		"ID", "Имя", "Фамилия", "Email", "Телефон", "Компания",
		"Должность", "Статус", "Источник", "Заметки", "Дата создания",
	})
	for _, ct := range contacts {
		_ = w.Write([]string{
			ct.ID, ct.FirstName, ct.LastName,
			strDeref(ct.Email), strDeref(ct.Phone), strDeref(ct.Company),
			strDeref(ct.Position), string(ct.Status), strDeref(ct.Source),
			strDeref(ct.Notes), ct.CreatedAt.Format("2006-01-02"),
		})
	}
	w.Flush()
}

func (h *ImportExportHandler) ImportContactsCSV(c *gin.Context) {
	role := middleware.GetUserRole(c)
	if role == "viewer" {
		c.JSON(http.StatusForbidden, models.APIResponse{Error: "insufficient permissions"})
		return
	}

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "файл не передан: " + err.Error()})
		return
	}
	defer file.Close()

	// Skip UTF-8 BOM if present
	bom := make([]byte, 3)
	n, _ := file.Read(bom)
	var reader io.Reader
	if n == 3 && bom[0] == 0xEF && bom[1] == 0xBB && bom[2] == 0xBF {
		reader = file
	} else {
		reader = io.MultiReader(strings.NewReader(string(bom[:n])), file)
	}

	r := csv.NewReader(reader)
	r.FieldsPerRecord = -1

	records, err := r.ReadAll()
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "ошибка разбора CSV: " + err.Error()})
		return
	}
	if len(records) < 2 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "файл пуст или содержит только заголовок"})
		return
	}

	inserted, skipped := 0, 0
	for i, row := range records[1:] { // skip header
		if len(row) < 4 {
			skipped++
			continue
		}
		firstName := strings.TrimSpace(row[1])
		lastName := strings.TrimSpace(row[2])
		if firstName == "" && lastName == "" {
			skipped++
			continue
		}
		email := strPtr2(strings.TrimSpace(safeGet(row, 3)))
		phone := strPtr2(strings.TrimSpace(safeGet(row, 4)))
		company := strPtr2(strings.TrimSpace(safeGet(row, 5)))
		position := strPtr2(strings.TrimSpace(safeGet(row, 6)))
		status := models.ContactStatus(strings.TrimSpace(safeGet(row, 7)))
		if status == "" {
			status = models.ContactStatusNew
		}
		source := strPtr2(strings.TrimSpace(safeGet(row, 8)))
		notes := strPtr2(strings.TrimSpace(safeGet(row, 9)))

		id := uuid.New().String()
		_, dbErr := h.db.Exec(`
			INSERT INTO contacts (id, first_name, last_name, email, phone, company, position, status, source, notes)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
			id, firstName, lastName, email, phone, company, position, status, source, notes,
		)
		if dbErr != nil {
			skipped++
			_ = i
			continue
		}
		inserted++
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: fmt.Sprintf("Импортировано: %d, пропущено: %d", inserted, skipped),
		Data:    gin.H{"inserted": inserted, "skipped": skipped},
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// DEALS
// ─────────────────────────────────────────────────────────────────────────────

func (h *ImportExportHandler) ExportDealsCSV(c *gin.Context) {
	type DealExportRow struct {
		models.Deal
		StageName string `db:"stage_name"`
	}
	var rows []DealExportRow
	h.db.Select(&rows, `
		SELECT d.*, COALESCE(ps.name,'') as stage_name
		FROM deals d
		LEFT JOIN pipeline_stages ps ON ps.id = d.stage_id
		ORDER BY d.created_at DESC`)

	c.Header("Content-Disposition", `attachment; filename="deals.csv"`)
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Cache-Control", "no-cache")
	c.Writer.WriteHeader(http.StatusOK)
	c.Writer.Write(utf8BOM)

	w := csv.NewWriter(c.Writer)
	_ = w.Write([]string{
		"ID", "Название", "Сумма", "Валюта", "Этап", "Приоритет",
		"Дата закрытия", "Мероприятие", "Кол-во билетов", "Заметки", "Дата создания",
	})
	for _, d := range rows {
		closeDate := ""
		if d.CloseDate != nil {
			closeDate = d.CloseDate.Format("2006-01-02")
		}
		eventDate := ""
		if d.EventDate != nil {
			eventDate = d.EventDate.Format("2006-01-02")
		}
		tickets := ""
		if d.TicketCount != nil {
			tickets = strconv.Itoa(*d.TicketCount)
		}
		_ = w.Write([]string{
			d.ID, d.Title,
			strconv.FormatFloat(d.Value, 'f', 2, 64),
			d.Currency, d.StageName, string(d.Priority),
			closeDate, strDeref(d.EventName) + eventDate,
			tickets, strDeref(d.Notes), d.CreatedAt.Format("2006-01-02"),
		})
	}
	w.Flush()
}

func (h *ImportExportHandler) ImportDealsCSV(c *gin.Context) {
	role := middleware.GetUserRole(c)
	if role == "viewer" || role == "sales" {
		c.JSON(http.StatusForbidden, models.APIResponse{Error: "insufficient permissions"})
		return
	}

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "файл не передан: " + err.Error()})
		return
	}
	defer file.Close()

	bom := make([]byte, 3)
	n, _ := file.Read(bom)
	var reader io.Reader
	if n == 3 && bom[0] == 0xEF && bom[1] == 0xBB && bom[2] == 0xBF {
		reader = file
	} else {
		reader = io.MultiReader(strings.NewReader(string(bom[:n])), file)
	}

	// Resolve default pipeline stage
	var defaultStageID string
	h.db.QueryRow(`
		SELECT ps.id FROM pipeline_stages ps
		JOIN pipelines p ON p.id = ps.pipeline_id
		WHERE p.is_default = true
		ORDER BY ps.position ASC LIMIT 1`).Scan(&defaultStageID)
	var defaultPipelineID string
	h.db.QueryRow(`SELECT id FROM pipelines WHERE is_default=true LIMIT 1`).Scan(&defaultPipelineID)

	r := csv.NewReader(reader)
	r.FieldsPerRecord = -1
	records, err := r.ReadAll()
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "ошибка разбора CSV: " + err.Error()})
		return
	}
	if len(records) < 2 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "файл пуст"})
		return
	}

	inserted, skipped := 0, 0
	for _, row := range records[1:] {
		title := strings.TrimSpace(safeGet(row, 1))
		if title == "" {
			skipped++
			continue
		}
		valueStr := strings.TrimSpace(safeGet(row, 2))
		value, _ := strconv.ParseFloat(strings.ReplaceAll(valueStr, ",", "."), 64)
		currency := strings.TrimSpace(safeGet(row, 3))
		if currency == "" {
			currency = "KZT"
		}
		priority := models.DealPriority(strings.TrimSpace(safeGet(row, 5)))
		if priority == "" {
			priority = models.PriorityMedium
		}

		var closeDate *time.Time
		if cd := strings.TrimSpace(safeGet(row, 6)); cd != "" {
			if t, err := time.Parse("2006-01-02", cd); err == nil {
				closeDate = &t
			}
		}

		ticketsStr := strings.TrimSpace(safeGet(row, 8))
		var ticketCount *int
		if ticketsStr != "" {
			if tc, err := strconv.Atoi(ticketsStr); err == nil {
				ticketCount = &tc
			}
		}
		notes := strPtr2(strings.TrimSpace(safeGet(row, 9)))

		id := uuid.New().String()
		_, dbErr := h.db.Exec(`
			INSERT INTO deals (id, title, value, currency, pipeline_id, stage_id, priority, close_date, ticket_count, notes)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
			id, title, value, currency, defaultPipelineID, defaultStageID,
			priority, closeDate, ticketCount, notes,
		)
		if dbErr != nil {
			skipped++
			continue
		}
		inserted++
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: fmt.Sprintf("Импортировано: %d, пропущено: %d", inserted, skipped),
		Data:    gin.H{"inserted": inserted, "skipped": skipped},
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTNERS
// ─────────────────────────────────────────────────────────────────────────────

func (h *ImportExportHandler) ExportPartnersCSV(c *gin.Context) {
	var partners []models.Partner
	h.db.Select(&partners, `SELECT * FROM partners ORDER BY name ASC`)

	c.Header("Content-Disposition", `attachment; filename="partners.csv"`)
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Cache-Control", "no-cache")
	c.Writer.WriteHeader(http.StatusOK)
	c.Writer.Write(utf8BOM)

	w := csv.NewWriter(c.Writer)
	_ = w.Write([]string{
		"ID", "Название", "Контактное лицо", "Email", "Телефон",
		"Статус", "Номер договора", "Комиссия (%)", "Сайт", "Заметки", "Дата создания",
	})
	for _, p := range partners {
		contractDate := ""
		if p.ContractDate != nil {
			contractDate = p.ContractDate.Format("2006-01-02")
		}
		_ = contractDate
		_ = w.Write([]string{
			p.ID, p.Name,
			strDeref(p.ContactPerson), strDeref(p.Email), strDeref(p.Phone),
			string(p.Status), strDeref(p.ContractNumber),
			strconv.FormatFloat(p.CommissionRate, 'f', 2, 64),
			strDeref(p.Website), strDeref(p.Notes),
			p.CreatedAt.Format("2006-01-02"),
		})
	}
	w.Flush()
}

func (h *ImportExportHandler) ImportPartnersCSV(c *gin.Context) {
	role := middleware.GetUserRole(c)
	if role == "viewer" || role == "sales" {
		c.JSON(http.StatusForbidden, models.APIResponse{Error: "insufficient permissions"})
		return
	}

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "файл не передан: " + err.Error()})
		return
	}
	defer file.Close()

	bom := make([]byte, 3)
	n, _ := file.Read(bom)
	var reader io.Reader
	if n == 3 && bom[0] == 0xEF && bom[1] == 0xBB && bom[2] == 0xBF {
		reader = file
	} else {
		reader = io.MultiReader(strings.NewReader(string(bom[:n])), file)
	}

	r := csv.NewReader(reader)
	r.FieldsPerRecord = -1
	records, err := r.ReadAll()
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "ошибка разбора CSV: " + err.Error()})
		return
	}
	if len(records) < 2 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "файл пуст"})
		return
	}

	inserted, skipped := 0, 0
	for _, row := range records[1:] {
		name := strings.TrimSpace(safeGet(row, 1))
		if name == "" {
			skipped++
			continue
		}
		contactPerson := strPtr2(strings.TrimSpace(safeGet(row, 2)))
		email := strPtr2(strings.TrimSpace(safeGet(row, 3)))
		phone := strPtr2(strings.TrimSpace(safeGet(row, 4)))
		status := models.PartnerStatus(strings.TrimSpace(safeGet(row, 5)))
		if status == "" {
			status = models.PartnerStatusActive
		}
		contractNumber := strPtr2(strings.TrimSpace(safeGet(row, 6)))
		commissionStr := strings.TrimSpace(safeGet(row, 7))
		commission, _ := strconv.ParseFloat(strings.ReplaceAll(commissionStr, ",", "."), 64)
		website := strPtr2(strings.TrimSpace(safeGet(row, 8)))
		notes := strPtr2(strings.TrimSpace(safeGet(row, 9)))

		id := uuid.New().String()
		_, dbErr := h.db.Exec(`
			INSERT INTO partners (id, name, contact_person, email, phone, status, contract_number, commission_rate, website, notes)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
			id, name, contactPerson, email, phone, status,
			contractNumber, commission, website, notes,
		)
		if dbErr != nil {
			skipped++
			continue
		}
		inserted++
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: fmt.Sprintf("Импортировано: %d, пропущено: %d", inserted, skipped),
		Data:    gin.H{"inserted": inserted, "skipped": skipped},
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// VENUES
// ─────────────────────────────────────────────────────────────────────────────

func (h *ImportExportHandler) ExportVenuesCSV(c *gin.Context) {
	type VenueRow struct {
		models.Venue
		CityName *string `db:"city_name"`
	}
	var rows []VenueRow
	h.db.Select(&rows, `
		SELECT v.*, c.name as city_name
		FROM venues v LEFT JOIN cities c ON c.id = v.city_id
		ORDER BY v.name ASC`)

	c.Header("Content-Disposition", `attachment; filename="venues.csv"`)
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Cache-Control", "no-cache")
	c.Writer.WriteHeader(http.StatusOK)
	c.Writer.Write(utf8BOM)

	w := csv.NewWriter(c.Writer)
	_ = w.Write([]string{
		"ID", "Название", "Адрес", "Город", "Вместимость", "Описание", "Дата создания",
	})
	for _, v := range rows {
		capacity := ""
		if v.Capacity != nil {
			capacity = strconv.Itoa(*v.Capacity)
		}
		_ = w.Write([]string{
			v.ID, v.Name,
			strDeref(v.Address), strDeref(v.CityName),
			capacity, strDeref(v.Description),
			v.CreatedAt.Format("2006-01-02"),
		})
	}
	w.Flush()
}

func (h *ImportExportHandler) ImportVenuesCSV(c *gin.Context) {
	role := middleware.GetUserRole(c)
	if role == "viewer" || role == "sales" {
		c.JSON(http.StatusForbidden, models.APIResponse{Error: "insufficient permissions"})
		return
	}

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "файл не передан: " + err.Error()})
		return
	}
	defer file.Close()

	bom := make([]byte, 3)
	n, _ := file.Read(bom)
	var reader io.Reader
	if n == 3 && bom[0] == 0xEF && bom[1] == 0xBB && bom[2] == 0xBF {
		reader = file
	} else {
		reader = io.MultiReader(strings.NewReader(string(bom[:n])), file)
	}

	r := csv.NewReader(reader)
	r.FieldsPerRecord = -1
	records, err := r.ReadAll()
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "ошибка разбора CSV: " + err.Error()})
		return
	}
	if len(records) < 2 {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "файл пуст"})
		return
	}

	inserted, skipped := 0, 0
	for _, row := range records[1:] {
		name := strings.TrimSpace(safeGet(row, 1))
		if name == "" {
			skipped++
			continue
		}
		address := strPtr2(strings.TrimSpace(safeGet(row, 2)))
		cityName := strings.TrimSpace(safeGet(row, 3))
		capacityStr := strings.TrimSpace(safeGet(row, 4))
		description := strPtr2(strings.TrimSpace(safeGet(row, 5)))

		var capacityPtr *int
		if capacityStr != "" {
			if cap, err := strconv.Atoi(capacityStr); err == nil {
				capacityPtr = &cap
			}
		}

		// Resolve city by name if provided
		var cityID *string
		if cityName != "" {
			var cid string
			if h.db.QueryRow(`SELECT id FROM cities WHERE name ILIKE $1 LIMIT 1`, cityName).Scan(&cid) == nil {
				cityID = &cid
			}
		}

		id := uuid.New().String()
		_, dbErr := h.db.Exec(`
			INSERT INTO venues (id, name, address, city_id, capacity, description)
			VALUES ($1,$2,$3,$4,$5,$6)`,
			id, name, address, cityID, capacityPtr, description,
		)
		if dbErr != nil {
			skipped++
			continue
		}
		inserted++
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: fmt.Sprintf("Импортировано: %d, пропущено: %d", inserted, skipped),
		Data:    gin.H{"inserted": inserted, "skipped": skipped},
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

// safeGet returns row[i] or "" when index is out of range.
func safeGet(row []string, i int) string {
	if i < len(row) {
		return row[i]
	}
	return ""
}
