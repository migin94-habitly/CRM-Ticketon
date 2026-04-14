package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/crm-ticketon/backend/internal/api/middleware"
	"github.com/crm-ticketon/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type PartnerDocumentsHandler struct {
	db         *sqlx.DB
	uploadsDir string
}

func NewPartnerDocumentsHandler(db *sqlx.DB, uploadsDir string) *PartnerDocumentsHandler {
	return &PartnerDocumentsHandler{db: db, uploadsDir: uploadsDir}
}

var allowedMimeTypes = map[string]bool{
	"application/pdf": true,
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
}

var allowedExtensions = map[string]bool{
	".pdf":  true,
	".docx": true,
}

// detectMimeType reads the first 512 bytes to sniff the content type.
// For DOCX (ZIP-based), Content-Type sniffing returns application/zip,
// so we fall back to extension-based detection.
func detectMimeType(header []byte, filename string) string {
	ct := http.DetectContentType(header)
	// DOCX is a ZIP archive – net/http will return "application/zip"
	if ct == "application/zip" || strings.HasPrefix(ct, "application/zip") {
		if strings.ToLower(filepath.Ext(filename)) == ".docx" {
			return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
		}
	}
	if strings.HasPrefix(ct, "application/pdf") {
		return "application/pdf"
	}
	// Fallback: trust extension
	switch strings.ToLower(filepath.Ext(filename)) {
	case ".pdf":
		return "application/pdf"
	case ".docx":
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	}
	return ct
}

// Upload godoc
// POST /api/v1/partners/:id/documents
func (h *PartnerDocumentsHandler) Upload(c *gin.Context) {
	partnerID := c.Param("id")

	// Verify partner exists
	var count int
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM partners WHERE id=$1`, partnerID).Scan(&count); err != nil || count == 0 {
		c.JSON(http.StatusNotFound, models.APIResponse{Error: "partner not found"})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "file is required"})
		return
	}
	defer file.Close()

	originalName := header.Filename
	ext := strings.ToLower(filepath.Ext(originalName))
	if !allowedExtensions[ext] {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "only PDF and DOCX files are allowed"})
		return
	}

	// Read first 512 bytes for MIME sniffing, then restore the reader
	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	mimeType := detectMimeType(buf[:n], originalName)
	if !allowedMimeTypes[mimeType] {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: "only PDF and DOCX files are allowed"})
		return
	}

	// Reset to beginning for full read
	if seeker, ok := file.(io.Seeker); ok {
		seeker.Seek(0, io.SeekStart)
	}

	// Prepare storage directory: {uploadsDir}/partners/{partnerID}/
	dir := filepath.Join(h.uploadsDir, "partners", partnerID)
	if err := os.MkdirAll(dir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: "failed to create storage directory"})
		return
	}

	docID := uuid.New().String()
	// Store as UUID to avoid filename collisions; original name is in DB
	storagePath := filepath.Join(dir, docID)

	dst, err := os.Create(storagePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: "failed to create file"})
		return
	}
	defer dst.Close()

	fileSize, err := io.Copy(dst, file)
	if err != nil {
		os.Remove(storagePath)
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: "failed to save file"})
		return
	}

	uploaderID := middleware.GetUserID(c)
	var uploaderPtr *string
	if uploaderID != "" {
		uploaderPtr = &uploaderID
	}

	_, err = h.db.Exec(`
		INSERT INTO partner_documents (id, partner_id, filename, storage_path, file_size, mime_type, uploaded_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		docID, partnerID, originalName, storagePath, fileSize, mimeType, uploaderPtr,
	)
	if err != nil {
		os.Remove(storagePath)
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: "failed to save document record"})
		return
	}

	doc := models.PartnerDocument{
		ID:        docID,
		PartnerID: partnerID,
		Filename:  originalName,
		FileSize:  fileSize,
		MimeType:  mimeType,
	}
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Data: doc})
}

// List godoc
// GET /api/v1/partners/:id/documents
func (h *PartnerDocumentsHandler) List(c *gin.Context) {
	partnerID := c.Param("id")

	type DocRow struct {
		models.PartnerDocument
		UploaderNameDB *string `db:"uploader_name"`
	}

	var rows []DocRow
	err := h.db.Select(&rows, `
		SELECT d.id, d.partner_id, d.filename, d.storage_path, d.file_size, d.mime_type,
		       d.uploaded_by, d.created_at,
		       u.full_name as uploader_name
		FROM partner_documents d
		LEFT JOIN users u ON u.id = d.uploaded_by
		WHERE d.partner_id = $1
		ORDER BY d.created_at DESC`, partnerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}

	docs := make([]models.PartnerDocument, 0, len(rows))
	for _, r := range rows {
		doc := r.PartnerDocument
		doc.UploaderName = r.UploaderNameDB
		docs = append(docs, doc)
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: docs})
}

// Download godoc
// GET /api/v1/partners/:id/documents/:doc_id
func (h *PartnerDocumentsHandler) Download(c *gin.Context) {
	partnerID := c.Param("id")
	docID := c.Param("doc_id")

	var doc models.PartnerDocument
	err := h.db.Get(&doc, `
		SELECT * FROM partner_documents WHERE id=$1 AND partner_id=$2`, docID, partnerID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Error: "document not found"})
		return
	}

	f, err := os.Open(doc.StoragePath)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Error: "file not found on disk"})
		return
	}
	defer f.Close()

	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, doc.Filename))
	c.Header("Content-Type", doc.MimeType)
	c.Header("Content-Length", fmt.Sprintf("%d", doc.FileSize))
	io.Copy(c.Writer, f)
}

// Delete godoc
// DELETE /api/v1/partners/:id/documents/:doc_id
func (h *PartnerDocumentsHandler) Delete(c *gin.Context) {
	partnerID := c.Param("id")
	docID := c.Param("doc_id")

	var doc models.PartnerDocument
	err := h.db.Get(&doc, `
		SELECT * FROM partner_documents WHERE id=$1 AND partner_id=$2`, docID, partnerID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Error: "document not found"})
		return
	}

	if _, err := h.db.Exec(`DELETE FROM partner_documents WHERE id=$1`, docID); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: "failed to delete document record"})
		return
	}

	// Best-effort file removal; don't fail if already gone
	os.Remove(doc.StoragePath)

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "document deleted"})
}
