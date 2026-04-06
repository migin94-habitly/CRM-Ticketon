package handlers

import (
	"net/http"
	"time"

	"github.com/crm-ticketon/backend/internal/api/middleware"
	"github.com/crm-ticketon/backend/internal/models"
	"github.com/crm-ticketon/backend/pkg/auth"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	db         *sqlx.DB
	jwtManager *auth.JWTManager
}

func NewAuthHandler(db *sqlx.DB, jwtManager *auth.JWTManager) *AuthHandler {
	return &AuthHandler{db: db, jwtManager: jwtManager}
}

// Login godoc
// @Summary      Login
// @Description  Authenticate user and receive JWT token
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      models.LoginRequest  true  "Credentials"
// @Success      200   {object}  models.LoginResponse
// @Failure      401   {object}  models.APIResponse
// @Router       /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}

	var user models.User
	err := h.db.Get(&user, `SELECT * FROM users WHERE email=$1 AND is_active=true`, req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.APIResponse{Error: "invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, models.APIResponse{Error: "invalid credentials"})
		return
	}

	token, expiresAt, err := h.jwtManager.Generate(user.ID, user.Email, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: "failed to generate token"})
		return
	}

	now := time.Now()
	h.db.Exec(`UPDATE users SET last_login_at=$1 WHERE id=$2`, now, user.ID)

	user.Password = ""
	c.JSON(http.StatusOK, models.LoginResponse{
		Token:     token,
		ExpiresAt: expiresAt,
		User:      &user,
	})
}

// Me godoc
// @Summary      Get current user
// @Description  Returns the currently authenticated user
// @Tags         auth
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  models.User
// @Router       /auth/me [get]
func (h *AuthHandler) Me(c *gin.Context) {
	userID := middleware.GetUserID(c)
	var user models.User
	if err := h.db.Get(&user, `SELECT * FROM users WHERE id=$1`, userID); err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Error: "user not found"})
		return
	}
	user.Password = ""
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: user})
}

// GetUsers godoc
// @Summary      List users
// @Tags         users
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  models.APIResponse
// @Router       /users [get]
func (h *AuthHandler) GetUsers(c *gin.Context) {
	var users []models.User
	if err := h.db.Select(&users, `SELECT id, email, first_name, last_name, role, avatar, phone_number, is_active, last_login_at, created_at, updated_at FROM users ORDER BY created_at DESC`); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: users})
}

// CreateUser godoc
// @Summary      Create user
// @Tags         users
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      models.CreateUserRequest  true  "User data"
// @Success      201   {object}  models.APIResponse
// @Router       /users [post]
func (h *AuthHandler) CreateUser(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: "failed to hash password"})
		return
	}

	id := uuid.New().String()
	_, err = h.db.Exec(`
		INSERT INTO users (id, email, password, first_name, last_name, role, phone_number)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		id, req.Email, string(hashed), req.FirstName, req.LastName, req.Role, req.PhoneNumber,
	)
	if err != nil {
		c.JSON(http.StatusConflict, models.APIResponse{Error: "email already exists"})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Message: "user created", Data: gin.H{"id": id}})
}

// UpdateUser godoc
// @Summary      Update user
// @Tags         users
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id    path      string  true  "User ID"
// @Success      200   {object}  models.APIResponse
// @Router       /users/{id} [put]
func (h *AuthHandler) UpdateUser(c *gin.Context) {
	id := c.Param("id")
	callerID := middleware.GetUserID(c)
	callerRole := middleware.GetUserRole(c)

	// Non-admin can only update themselves
	if callerRole != "admin" && callerID != id {
		c.JSON(http.StatusForbidden, models.APIResponse{Error: "insufficient permissions"})
		return
	}

	var body struct {
		FirstName   string `json:"first_name"`
		LastName    string `json:"last_name"`
		PhoneNumber string `json:"phone_number"`
		Avatar      string `json:"avatar"`
		Role        string `json:"role"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Error: err.Error()})
		return
	}

	query := `UPDATE users SET first_name=$1, last_name=$2, phone_number=$3, avatar=$4, updated_at=NOW() WHERE id=$5`
	args := []interface{}{body.FirstName, body.LastName, body.PhoneNumber, body.Avatar, id}

	if callerRole == "admin" && body.Role != "" {
		query = `UPDATE users SET first_name=$1, last_name=$2, phone_number=$3, avatar=$4, role=$6, updated_at=NOW() WHERE id=$5`
		args = append(args, body.Role)
	}

	if _, err := h.db.Exec(query, args...); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "user updated"})
}

// SeedAdmin creates default admin if no users exist
func SeedAdmin(db *sqlx.DB) error {
	var count int
	db.Get(&count, `SELECT COUNT(*) FROM users`)
	if count > 0 {
		return nil
	}
	hashed, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	_, err := db.Exec(`
		INSERT INTO users (id, email, password, first_name, last_name, role)
		VALUES ($1,$2,$3,$4,$5,$6)`,
		uuid.New().String(), "admin@crm.local", string(hashed), "Admin", "User", "admin",
	)
	return err
}
