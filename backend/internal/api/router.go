package api

import (
	"net/http"

	"github.com/crm-ticketon/backend/internal/api/handlers"
	"github.com/crm-ticketon/backend/internal/api/middleware"
	"github.com/crm-ticketon/backend/internal/config"
	"github.com/crm-ticketon/backend/pkg/auth"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"go.uber.org/zap"
)

func NewRouter(db *sqlx.DB, cfg *config.Config, log *zap.Logger) *gin.Engine {
	if cfg.Server.Mode == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.Logger(log))

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Request-ID"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		MaxAge:           12 * 3600,
	}))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "version": "1.0.0"})
	})

	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	jwtManager := auth.NewJWTManager(cfg.JWT.Secret, cfg.JWT.ExpiryHours)

	authH := handlers.NewAuthHandler(db, jwtManager)
	contactsH := handlers.NewContactsHandler(db)
	pipelineH := handlers.NewPipelineHandler(db)
	dealsH := handlers.NewDealsHandler(db)
	telephonyH := handlers.NewTelephonyHandler(db)
	whatsappH := handlers.NewWhatsAppHandler(db)
	analyticsH := handlers.NewAnalyticsHandler(db, &cfg.AI)
	activitiesH := handlers.NewActivitiesHandler(db)
	auditLogH := handlers.NewAuditLogHandler(db)

	r.POST("/api/v1/auth/login", authH.Login)
	r.GET("/api/v1/webhooks/whatsapp", whatsappH.WebhookVerify)
	r.POST("/api/v1/webhooks/whatsapp", whatsappH.WebhookHandler)
	r.POST("/api/v1/webhooks/telephony", telephonyH.WebhookHandler)

	api := r.Group("/api/v1", middleware.AuthMiddleware(jwtManager), middleware.AuditLogMiddleware(db))
	{
		api.GET("/auth/me", authH.Me)

		users := api.Group("/users")
		{
			users.GET("", middleware.RequireRoles("admin", "manager"), authH.GetUsers)
			users.POST("", middleware.RequireRoles("admin"), authH.CreateUser)
			users.PUT("/:id", authH.UpdateUser)
		}

		contacts := api.Group("/contacts")
		{
			contacts.GET("", contactsH.ListContacts)
			contacts.POST("", contactsH.CreateContact)
			contacts.GET("/export", contactsH.ExportContacts)
			contacts.GET("/:id", contactsH.GetContact)
			contacts.PUT("/:id", contactsH.UpdateContact)
			contacts.DELETE("/:id", middleware.RequireRoles("admin", "manager"), contactsH.DeleteContact)
			contacts.GET("/:id/activities", contactsH.GetContactActivities)
			contacts.GET("/:id/calls", contactsH.GetContactCalls)
			contacts.GET("/:id/messages", contactsH.GetContactMessages)
		}

		pipelines := api.Group("/pipelines")
		{
			pipelines.GET("", pipelineH.ListPipelines)
			pipelines.POST("", middleware.RequireRoles("admin", "manager"), pipelineH.CreatePipeline)
			pipelines.GET("/:id", pipelineH.GetPipeline)
			pipelines.PUT("/:id", middleware.RequireRoles("admin", "manager"), pipelineH.UpdatePipeline)
			pipelines.DELETE("/:id", middleware.RequireRoles("admin"), pipelineH.DeletePipeline)
			pipelines.POST("/:id/stages", middleware.RequireRoles("admin", "manager"), pipelineH.AddStage)
			pipelines.PUT("/:id/stages/:stage_id", middleware.RequireRoles("admin", "manager"), pipelineH.UpdateStage)
			pipelines.DELETE("/:id/stages/:stage_id", middleware.RequireRoles("admin", "manager"), pipelineH.DeleteStage)
		}

		deals := api.Group("/deals")
		{
			deals.GET("", dealsH.ListDeals)
			deals.POST("", dealsH.CreateDeal)
			deals.GET("/:id", dealsH.GetDeal)
			deals.PUT("/:id", dealsH.UpdateDeal)
			deals.PATCH("/:id/move", dealsH.MoveDeal)
			deals.DELETE("/:id", middleware.RequireRoles("admin", "manager"), dealsH.DeleteDeal)
			deals.GET("/:id/activities", dealsH.GetDealActivities)
			deals.POST("/:id/activities", dealsH.CreateDealActivity)
		}

		activities := api.Group("/activities")
		{
			activities.GET("", activitiesH.ListActivities)
			activities.POST("", activitiesH.CreateActivity)
			activities.GET("/:id", activitiesH.GetActivity)
			activities.PUT("/:id", activitiesH.UpdateActivity)
			activities.DELETE("/:id", activitiesH.DeleteActivity)
		}

		telephony := api.Group("/telephony")
		{
			telephony.GET("/calls", telephonyH.ListCalls)
			telephony.POST("/calls", telephonyH.InitiateCall)
			telephony.GET("/calls/:id", telephonyH.GetCall)
			telephony.PATCH("/calls/:id", telephonyH.UpdateCallRecord)
			telephony.GET("/calls/:id/recording", telephonyH.GetRecordingURL)
		}

		whatsapp := api.Group("/whatsapp")
		{
			whatsapp.GET("/conversations", whatsappH.GetConversations)
			whatsapp.GET("/messages", whatsappH.ListMessages)
			whatsapp.POST("/messages", whatsappH.SendMessage)
			whatsapp.PATCH("/messages/:id/read", whatsappH.MarkMessageRead)
		}

		analytics := api.Group("/analytics")
		{
			analytics.GET("/dashboard", analyticsH.GetDashboard)
			analytics.GET("/forecast", analyticsH.GetSalesForecast)
			analytics.GET("/deals/:id", analyticsH.AnalyzeDeal)
			analytics.GET("/calls/:id", analyticsH.AnalyzeCall)
		}

		auditLog := api.Group("/audit-log")
		{
			auditLog.GET("", middleware.RequireRoles("admin", "manager"), auditLogH.List)
		}
	}

	return r
}
