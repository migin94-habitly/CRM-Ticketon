package models

import (
	"time"
)

type Role string

const (
	RoleAdmin      Role = "admin"
	RoleManager    Role = "manager"
	RoleSales      Role = "sales"
	RoleViewer     Role = "viewer"
)

type User struct {
	ID          string     `db:"id" json:"id"`
	Email       string     `db:"email" json:"email"`
	Password    string     `db:"password" json:"-"`
	FirstName   string     `db:"first_name" json:"first_name"`
	LastName    string     `db:"last_name" json:"last_name"`
	Role        Role       `db:"role" json:"role"`
	Avatar      *string    `db:"avatar" json:"avatar,omitempty"`
	PhoneNumber *string    `db:"phone_number" json:"phone_number,omitempty"`
	IsActive    bool       `db:"is_active" json:"is_active"`
	LastLoginAt *time.Time `db:"last_login_at" json:"last_login_at,omitempty"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at" json:"updated_at"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginResponse struct {
	Token     string `json:"token"`
	ExpiresAt int64  `json:"expires_at"`
	User      *User  `json:"user"`
}

type CreateUserRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=6"`
	FirstName   string `json:"first_name" binding:"required"`
	LastName    string `json:"last_name" binding:"required"`
	Role        Role   `json:"role" binding:"required,oneof=admin manager sales viewer"`
	PhoneNumber string `json:"phone_number,omitempty"`
}

type ContactStatus string

const (
	ContactStatusNew      ContactStatus = "new"
	ContactStatusActive   ContactStatus = "active"
	ContactStatusInactive ContactStatus = "inactive"
	ContactStatusLost     ContactStatus = "lost"
)

type Contact struct {
	ID          string         `db:"id" json:"id"`
	FirstName   string         `db:"first_name" json:"first_name"`
	LastName    string         `db:"last_name" json:"last_name"`
	Email       *string        `db:"email" json:"email,omitempty"`
	Phone       *string        `db:"phone" json:"phone,omitempty"`
	Company     *string        `db:"company" json:"company,omitempty"`
	Position    *string        `db:"position" json:"position,omitempty"`
	Status      ContactStatus  `db:"status" json:"status"`
	Source      *string        `db:"source" json:"source,omitempty"`
	AssignedTo  *string        `db:"assigned_to" json:"assigned_to,omitempty"`
	Tags        []string       `db:"-" json:"tags,omitempty"`
	Notes       *string        `db:"notes" json:"notes,omitempty"`
	Avatar      *string        `db:"avatar" json:"avatar,omitempty"`
	WhatsAppID  *string        `db:"whatsapp_id" json:"whatsapp_id,omitempty"`
	CreatedAt   time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time      `db:"updated_at" json:"updated_at"`
	AssignedUser *User `db:"-" json:"assigned_user,omitempty"`
	DealsCount   int   `db:"-" json:"deals_count,omitempty"`
}

type CreateContactRequest struct {
	FirstName  string        `json:"first_name" binding:"required"`
	LastName   string        `json:"last_name" binding:"required"`
	Email      string        `json:"email,omitempty"`
	Phone      string        `json:"phone,omitempty"`
	Company    string        `json:"company,omitempty"`
	Position   string        `json:"position,omitempty"`
	Status     ContactStatus `json:"status,omitempty"`
	Source     string        `json:"source,omitempty"`
	AssignedTo *string       `json:"assigned_to,omitempty"`
	Tags       []string      `json:"tags,omitempty"`
	Notes      string        `json:"notes,omitempty"`
}

type Pipeline struct {
	ID          string           `db:"id" json:"id"`
	Name        string           `db:"name" json:"name"`
	Description *string          `db:"description" json:"description,omitempty"`
	IsDefault   bool             `db:"is_default" json:"is_default"`
	CreatedBy   *string          `db:"created_by" json:"created_by,omitempty"`
	CreatedAt   time.Time        `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time        `db:"updated_at" json:"updated_at"`
	Stages      []PipelineStage  `db:"-" json:"stages,omitempty"`
}

type PipelineStage struct {
	ID         string    `db:"id" json:"id"`
	PipelineID string    `db:"pipeline_id" json:"pipeline_id"`
	Name       string    `db:"name" json:"name"`
	Color      string    `db:"color" json:"color"`
	Position   int       `db:"position" json:"position"`
	Probability int      `db:"probability" json:"probability"`
	IsWon      bool      `db:"is_won" json:"is_won"`
	IsLost     bool      `db:"is_lost" json:"is_lost"`
	CreatedAt  time.Time `db:"created_at" json:"created_at"`
}

type CreatePipelineRequest struct {
	Name        string               `json:"name" binding:"required"`
	Description string               `json:"description,omitempty"`
	IsDefault   bool                 `json:"is_default,omitempty"`
	Stages      []CreateStageRequest `json:"stages,omitempty"`
}

type CreateStageRequest struct {
	Name        string `json:"name" binding:"required"`
	Color       string `json:"color,omitempty"`
	Position    int    `json:"position"`
	Probability int    `json:"probability"`
	IsWon       bool   `json:"is_won,omitempty"`
	IsLost      bool   `json:"is_lost,omitempty"`
}

type DealPriority string

const (
	PriorityLow    DealPriority = "low"
	PriorityMedium DealPriority = "medium"
	PriorityHigh   DealPriority = "high"
)

type Deal struct {
	ID          string       `db:"id" json:"id"`
	Title       string       `db:"title" json:"title"`
	Value       float64      `db:"value" json:"value"`
	Currency    string       `db:"currency" json:"currency"`
	PipelineID  string       `db:"pipeline_id" json:"pipeline_id"`
	StageID     string       `db:"stage_id" json:"stage_id"`
	ContactID   *string      `db:"contact_id" json:"contact_id,omitempty"`
	AssignedTo  *string      `db:"assigned_to" json:"assigned_to,omitempty"`
	Priority    DealPriority `db:"priority" json:"priority"`
	CloseDate   *time.Time   `db:"close_date" json:"close_date,omitempty"`
	Notes       *string      `db:"notes" json:"notes,omitempty"`
	LostReason  *string      `db:"lost_reason" json:"lost_reason,omitempty"`
	PartnerID   *string      `db:"partner_id" json:"partner_id,omitempty"`
	VenueID     *string      `db:"venue_id" json:"venue_id,omitempty"`
	EventName   *string      `db:"event_name" json:"event_name,omitempty"`
	EventDate   *time.Time   `db:"event_date" json:"event_date,omitempty"`
	TicketCount *int         `db:"ticket_count" json:"ticket_count,omitempty"`
	CreatedAt   time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time    `db:"updated_at" json:"updated_at"`
	Contact      *Contact      `db:"-" json:"contact,omitempty"`
	AssignedUser *User         `db:"-" json:"assigned_user,omitempty"`
	Stage        *PipelineStage `db:"-" json:"stage,omitempty"`
	Activities   []Activity    `db:"-" json:"activities,omitempty"`
	AIScore      *AIScore      `db:"-" json:"ai_score,omitempty"`
	Partner      *Partner      `db:"-" json:"partner,omitempty"`
	Venue        *Venue        `db:"-" json:"venue,omitempty"`
}

type CreateDealRequest struct {
	Title      string          `json:"title" binding:"required"`
	Value      FlexibleFloat64 `json:"value,omitempty"`
	Currency   string          `json:"currency,omitempty"`
	PipelineID string          `json:"pipeline_id" binding:"required"`
	StageID    string          `json:"stage_id" binding:"required"`
	ContactID  *string         `json:"contact_id,omitempty"`
	AssignedTo *string         `json:"assigned_to,omitempty"`
	Priority   DealPriority    `json:"priority,omitempty"`
	CloseDate  *string         `json:"close_date,omitempty"`
	Notes      string          `json:"notes,omitempty"`
	PartnerID   *string         `json:"partner_id,omitempty"`
	VenueID     *string         `json:"venue_id,omitempty"`
	EventName   string          `json:"event_name,omitempty"`
	EventDate   *string         `json:"event_date,omitempty"`
	TicketCount *int            `json:"ticket_count,omitempty"`
}

type MoveDealRequest struct {
	StageID string `json:"stage_id" binding:"required"`
}

type ActivityType string

const (
	ActivityCall     ActivityType = "call"
	ActivityEmail    ActivityType = "email"
	ActivityMeeting  ActivityType = "meeting"
	ActivityNote     ActivityType = "note"
	ActivityTask     ActivityType = "task"
	ActivityWhatsApp ActivityType = "whatsapp"
)

type ActivityStatus string

const (
	ActivityPending   ActivityStatus = "pending"
	ActivityCompleted ActivityStatus = "completed"
	ActivityCancelled ActivityStatus = "cancelled"
)

type Activity struct {
	ID          string         `db:"id" json:"id"`
	Type        ActivityType   `db:"type" json:"type"`
	Subject     string         `db:"subject" json:"subject"`
	Description *string        `db:"description" json:"description,omitempty"`
	Status      ActivityStatus `db:"status" json:"status"`
	DealID      *string        `db:"deal_id" json:"deal_id,omitempty"`
	ContactID   *string        `db:"contact_id" json:"contact_id,omitempty"`
	UserID      string         `db:"user_id" json:"user_id"`
	UserName    *string        `db:"user_name" json:"user_name,omitempty"`
	DueDate     *time.Time     `db:"due_date" json:"due_date,omitempty"`
	Duration    int            `db:"duration" json:"duration,omitempty"`
	CreatedAt   time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time      `db:"updated_at" json:"updated_at"`
	User        *User          `db:"-" json:"user,omitempty"`
}

type CreateActivityRequest struct {
	Type        ActivityType   `json:"type" binding:"required"`
	Subject     string         `json:"subject" binding:"required"`
	Description string         `json:"description,omitempty"`
	DealID      *string        `json:"deal_id,omitempty"`
	ContactID   *string        `json:"contact_id,omitempty"`
	DueDate     *FlexibleTime  `json:"due_date,omitempty"`
	Duration    int            `json:"duration,omitempty"`
}

type CallDirection string

const (
	CallInbound  CallDirection = "inbound"
	CallOutbound CallDirection = "outbound"
)

type CallStatus string

const (
	CallStatusInitiated CallStatus = "initiated"
	CallStatusRinging   CallStatus = "ringing"
	CallStatusAnswered  CallStatus = "answered"
	CallStatusCompleted CallStatus = "completed"
	CallStatusMissed    CallStatus = "missed"
	CallStatusFailed    CallStatus = "failed"
)

type CallRecord struct {
	ID           string        `db:"id" json:"id"`
	ExternalID   *string       `db:"external_id" json:"external_id,omitempty"`
	Direction    CallDirection `db:"direction" json:"direction"`
	Status       CallStatus    `db:"status" json:"status"`
	FromNumber   string        `db:"from_number" json:"from_number"`
	ToNumber     string        `db:"to_number" json:"to_number"`
	Duration     int           `db:"duration" json:"duration"` // seconds
	RecordingURL *string       `db:"recording_url" json:"recording_url,omitempty"`
	RecordingKey *string       `db:"recording_key" json:"recording_key,omitempty"` // S3 key
	Transcript   *string       `db:"transcript" json:"transcript,omitempty"`
	AIAnalysis   *string       `db:"ai_analysis" json:"ai_analysis,omitempty"`
	ContactID    *string       `db:"contact_id" json:"contact_id,omitempty"`
	DealID       *string       `db:"deal_id" json:"deal_id,omitempty"`
	UserID       *string       `db:"user_id" json:"user_id,omitempty"`
	StartedAt    *time.Time    `db:"started_at" json:"started_at,omitempty"`
	EndedAt      *time.Time    `db:"ended_at" json:"ended_at,omitempty"`
	CreatedAt    time.Time     `db:"created_at" json:"created_at"`
	Contact      *Contact      `db:"-" json:"contact,omitempty"`
	User         *User         `db:"-" json:"user,omitempty"`
}

type MessageDirection string

const (
	MessageIncoming MessageDirection = "incoming"
	MessageOutgoing MessageDirection = "outgoing"
)

type WhatsAppMessage struct {
	ID          string           `db:"id" json:"id"`
	ExternalID  *string          `db:"external_id" json:"external_id,omitempty"`
	ContactID   *string          `db:"contact_id" json:"contact_id,omitempty"`
	DealID      *string          `db:"deal_id" json:"deal_id,omitempty"`
	UserID      *string          `db:"user_id" json:"user_id,omitempty"`
	Direction   MessageDirection `db:"direction" json:"direction"`
	FromNumber  string           `db:"from_number" json:"from_number"`
	ToNumber    string           `db:"to_number" json:"to_number"`
	Body        string           `db:"body" json:"body"`
	MediaURL    *string          `db:"media_url" json:"media_url,omitempty"`
	MediaType   *string          `db:"media_type" json:"media_type,omitempty"`
	Status      string           `db:"status" json:"status"`
	SentAt      *time.Time       `db:"sent_at" json:"sent_at,omitempty"`
	ReadAt      *time.Time       `db:"read_at" json:"read_at,omitempty"`
	CreatedAt   time.Time        `db:"created_at" json:"created_at"`
}

type SendWhatsAppRequest struct {
	ToNumber  string  `json:"to_number" binding:"required"`
	Body      string  `json:"body" binding:"required"`
	ContactID *string `json:"contact_id,omitempty"`
	DealID    *string `json:"deal_id,omitempty"`
}

type AIScore struct {
	ID           string    `db:"id" json:"id"`
	EntityType   string    `db:"entity_type" json:"entity_type"`
	EntityID     string    `db:"entity_id" json:"entity_id"`
	Score        float64   `db:"score" json:"score"`
	Sentiment    string    `db:"sentiment" json:"sentiment"`
	Insights     []string  `db:"-" json:"insights,omitempty"`
	Suggestions  []string  `db:"-" json:"suggestions,omitempty"`
	RawJSON      *string   `db:"raw_json" json:"raw_json,omitempty"`
	GeneratedAt  time.Time `db:"generated_at" json:"generated_at"`
}

type DashboardMetrics struct {
	TotalDeals        int     `json:"total_deals"`
	TotalValue        float64 `json:"total_value"`
	WonDeals          int     `json:"won_deals"`
	WonValue          float64 `json:"won_value"`
	LostDeals         int     `json:"lost_deals"`
	ConversionRate    float64 `json:"conversion_rate"`
	AvgDealValue      float64 `json:"avg_deal_value"`
	AvgDealCycleDays  float64 `json:"avg_deal_cycle_days"`
	TotalContacts     int     `json:"total_contacts"`
	NewContactsToday  int     `json:"new_contacts_today"`
	TotalCalls        int     `json:"total_calls"`
	TotalCallDuration int     `json:"total_call_duration"`
	TotalMessages     int     `json:"total_messages"`
	PipelineBreakdown []PipelineMetric `json:"pipeline_breakdown"`
	ActivityBreakdown []ActivityMetric `json:"activity_breakdown"`
	RevenueByMonth    []MonthlyRevenue `json:"revenue_by_month"`
	TopPerformers     []UserPerformance `json:"top_performers"`
	AIInsights        []string          `json:"ai_insights"`
}

type PipelineMetric struct {
	StageID   string  `db:"stage_id" json:"stage_id"`
	StageName string  `db:"stage_name" json:"stage_name"`
	Color     string  `db:"color" json:"color"`
	Count     int     `db:"count" json:"count"`
	Value     float64 `db:"value" json:"value"`
}

type ActivityMetric struct {
	Type  string `db:"type" json:"type"`
	Count int    `db:"count" json:"count"`
}

type MonthlyRevenue struct {
	Month  string  `db:"month" json:"month"`
	Won    float64 `db:"won" json:"won"`
	Target float64 `db:"target" json:"target"`
}

type UserPerformance struct {
	UserID    string  `db:"user_id" json:"user_id"`
	Name      string  `db:"name" json:"name"`
	Avatar    string  `db:"avatar" json:"avatar"`
	DealsWon  int     `db:"deals_won" json:"deals_won"`
	Revenue   float64 `db:"revenue" json:"revenue"`
	CallsMade int     `db:"calls_made" json:"calls_made"`
	Score     float64 `db:"score" json:"ai_score"`
}

type PaginationQuery struct {
	Page    int    `form:"page,default=1"`
	Limit   int    `form:"limit,default=20"`
	Search  string `form:"search,omitempty"`
	SortBy  string `form:"sort_by,omitempty"`
	SortDir string `form:"sort_dir,omitempty"`
}

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalPages int         `json:"total_pages"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Message string      `json:"message,omitempty"`
}

type UserActivityLog struct {
	ID            string    `db:"id" json:"id"`
	UserID        string    `db:"user_id" json:"user_id"`
	UserEmail     string    `db:"user_email" json:"user_email"`
	UserFirstName string    `db:"user_first_name" json:"user_first_name"`
	UserLastName  string    `db:"user_last_name" json:"user_last_name"`
	Action        string    `db:"action" json:"action"`
	EntityType    *string   `db:"entity_type" json:"entity_type,omitempty"`
	EntityID      *string   `db:"entity_id" json:"entity_id,omitempty"`
	Description   *string   `db:"description" json:"description,omitempty"`
	IPAddress     *string   `db:"ip_address" json:"ip_address,omitempty"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
}

type City struct {
	ID        string    `db:"id" json:"id"`
	Name      string    `db:"name" json:"name"`
	Country   string    `db:"country" json:"country"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

type CreateCityRequest struct {
	Name    string `json:"name" binding:"required"`
	Country string `json:"country,omitempty"`
}

type Venue struct {
	ID          string    `db:"id" json:"id"`
	Name        string    `db:"name" json:"name"`
	Address     *string   `db:"address" json:"address,omitempty"`
	CityID      *string   `db:"city_id" json:"city_id,omitempty"`
	Capacity    *int      `db:"capacity" json:"capacity,omitempty"`
	Description *string   `db:"description" json:"description,omitempty"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
	City        *City     `db:"-" json:"city,omitempty"`
}

type CreateVenueRequest struct {
	Name        string  `json:"name" binding:"required"`
	Address     string  `json:"address,omitempty"`
	CityID      *string `json:"city_id,omitempty"`
	Capacity    *int    `json:"capacity,omitempty"`
	Description string  `json:"description,omitempty"`
}

type PartnerStatus string

const (
	PartnerStatusActive   PartnerStatus = "active"
	PartnerStatusInactive PartnerStatus = "inactive"
	PartnerStatusProspect PartnerStatus = "prospect"
)

type Partner struct {
	ID             string        `db:"id" json:"id"`
	Name           string        `db:"name" json:"name"`
	ContactPerson  *string       `db:"contact_person" json:"contact_person,omitempty"`
	Email          *string       `db:"email" json:"email,omitempty"`
	Phone          *string       `db:"phone" json:"phone,omitempty"`
	CityID         *string       `db:"city_id" json:"city_id,omitempty"`
	Status         PartnerStatus `db:"status" json:"status"`
	ContractNumber *string       `db:"contract_number" json:"contract_number,omitempty"`
	ContractDate   *time.Time    `db:"contract_date" json:"contract_date,omitempty"`
	CommissionRate float64       `db:"commission_rate" json:"commission_rate"`
	Notes          *string       `db:"notes" json:"notes,omitempty"`
	Website        *string       `db:"website" json:"website,omitempty"`
	CreatedAt      time.Time     `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time     `db:"updated_at" json:"updated_at"`
	City           *City         `db:"-" json:"city,omitempty"`
	DealsCount     int           `db:"-" json:"deals_count,omitempty"`
	TotalRevenue   float64       `db:"-" json:"total_revenue,omitempty"`
}

type CreatePartnerRequest struct {
	Name           string        `json:"name" binding:"required"`
	ContactPerson  string        `json:"contact_person,omitempty"`
	Email          string        `json:"email,omitempty"`
	Phone          string        `json:"phone,omitempty"`
	CityID         *string       `json:"city_id,omitempty"`
	Status         PartnerStatus `json:"status,omitempty"`
	ContractNumber string        `json:"contract_number,omitempty"`
	ContractDate   *string       `json:"contract_date,omitempty"`
	CommissionRate float64       `json:"commission_rate,omitempty"`
	Notes          string        `json:"notes,omitempty"`
	Website        string        `json:"website,omitempty"`
}

type PartnerStats struct {
	PartnerID      string  `json:"partner_id"`
	PartnerName    string  `json:"partner_name"`
	TotalDeals     int     `json:"total_deals"`
	WonDeals       int     `json:"won_deals"`
	LostDeals      int     `json:"lost_deals"`
	ActiveDeals    int     `json:"active_deals"`
	TotalRevenue   float64 `json:"total_revenue"`
	AvgDealValue   float64 `json:"avg_deal_value"`
	ConversionRate float64 `json:"conversion_rate"`
	TotalTickets   int     `json:"total_tickets"`
}

type ChecklistItem struct {
	ID        string    `db:"id" json:"id"`
	DealID    string    `db:"deal_id" json:"deal_id"`
	Text      string    `db:"text" json:"text"`
	IsDone    bool      `db:"is_done" json:"is_done"`
	Position  int       `db:"position" json:"position"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

type CreateChecklistItemRequest struct {
	Text     string `json:"text" binding:"required"`
	Position int    `json:"position,omitempty"`
}
