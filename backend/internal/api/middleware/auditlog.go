package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func AuditLogMiddleware(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		method := c.Request.Method
		if method == "GET" || method == "OPTIONS" || method == "HEAD" {
			return
		}

		userID := GetUserID(c)
		if userID == "" {
			return
		}

		emailVal, _ := c.Get(UserEmailKey)
		userEmail, _ := emailVal.(string)

		action := resolveAction(method, c.FullPath())
		entityType := resolveEntityType(c.FullPath())
		entityID := c.Param("id")

		ip := c.ClientIP()

		var etPtr, eiPtr, ipPtr *string
		if entityType != "" {
			etPtr = &entityType
		}
		if entityID != "" {
			eiPtr = &entityID
		}
		if ip != "" {
			ipPtr = &ip
		}

		db.Exec(`
			INSERT INTO user_activity_logs (user_id, user_email, action, entity_type, entity_id, ip_address)
			VALUES ($1,$2,$3,$4,$5,$6)`,
			userID, userEmail, action, etPtr, eiPtr, ipPtr,
		)
	}
}

func resolveEntityType(fullPath string) string {
	path := strings.TrimPrefix(fullPath, "/api/v1/")
	parts := strings.SplitN(path, "/", 2)
	if len(parts) > 0 {
		return parts[0]
	}
	return ""
}

func resolveAction(method, fullPath string) string {
	path := strings.TrimPrefix(fullPath, "/api/v1/")
	parts := strings.Split(path, "/")
	if len(parts) == 0 {
		return strings.ToLower(method)
	}

	entity := parts[0]

	switch method {
	case "POST":
		if len(parts) >= 3 && parts[2] == "move" {
			return entity + ".move"
		}
		if len(parts) >= 3 && parts[2] == "stages" {
			return entity + ".stages.create"
		}
		if len(parts) >= 3 && parts[2] == "activities" {
			return entity + ".activities.create"
		}
		return entity + ".create"
	case "PUT":
		if len(parts) >= 4 && parts[2] == "stages" {
			return entity + ".stages.update"
		}
		return entity + ".update"
	case "PATCH":
		if len(parts) >= 3 {
			last := parts[len(parts)-1]
			if last != ":id" && last != ":stage_id" {
				return entity + "." + last
			}
		}
		return entity + ".update"
	case "DELETE":
		if len(parts) >= 4 && parts[2] == "stages" {
			return entity + ".stages.delete"
		}
		return entity + ".delete"
	default:
		return strings.ToLower(method) + " " + entity
	}
}
