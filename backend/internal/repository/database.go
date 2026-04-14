package repository

import (
	"fmt"
	"github.com/crm-ticketon/backend/internal/config"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

func NewPostgres(cfg *config.DatabaseConfig) (*sqlx.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode,
	)
	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to postgres: %w", err)
	}
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	return db, nil
}

func RunMigrations(db *sqlx.DB) error {
	schema := `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'sales',
    avatar TEXT,
    phone_number VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    position INTEGER NOT NULL DEFAULT 0,
    probability INTEGER NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    is_won BOOLEAN NOT NULL DEFAULT false,
    is_lost BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    position VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    source VARCHAR(100),
    assigned_to UUID REFERENCES users(id),
    notes TEXT,
    avatar TEXT,
    whatsapp_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_tags (
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    PRIMARY KEY (contact_id, tag)
);

CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    value DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    pipeline_id UUID NOT NULL REFERENCES pipelines(id),
    stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
    contact_id UUID REFERENCES contacts(id),
    assigned_to UUID REFERENCES users(id),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    close_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    lost_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id),
    user_id UUID NOT NULL REFERENCES users(id),
    due_date TIMESTAMP WITH TIME ZONE,
    duration INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255),
    direction VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'initiated',
    from_number VARCHAR(50) NOT NULL,
    to_number VARCHAR(50) NOT NULL,
    duration INTEGER NOT NULL DEFAULT 0,
    recording_url TEXT,
    recording_key TEXT,
    transcript TEXT,
    ai_analysis TEXT,
    contact_id UUID REFERENCES contacts(id),
    deal_id UUID REFERENCES deals(id),
    user_id UUID REFERENCES users(id),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255),
    contact_id UUID REFERENCES contacts(id),
    deal_id UUID REFERENCES deals(id),
    user_id UUID REFERENCES users(id),
    direction VARCHAR(20) NOT NULL,
    from_number VARCHAR(50) NOT NULL,
    to_number VARCHAR(50) NOT NULL,
    body TEXT NOT NULL,
    media_url TEXT,
    media_type VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'sent',
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    score DECIMAL(5,2) NOT NULL DEFAULT 0,
    sentiment VARCHAR(20) NOT NULL DEFAULT 'neutral',
    raw_json TEXT,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    user_email VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    description TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Kazakhstan',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city_id UUID REFERENCES cities(id),
    capacity INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    city_id UUID REFERENCES cities(id),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    contract_number VARCHAR(100),
    contract_date DATE,
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    notes TEXT,
    website VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE deals ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS event_name VARCHAR(500);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS event_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS ticket_count INTEGER;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS category VARCHAR(100);

ALTER TABLE activities ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id);

CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline_id ON deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_to ON deals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_call_records_contact_id ON call_records(contact_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact_id ON whatsapp_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_ai_scores_entity ON ai_scores(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_venues_city_id ON venues(city_id);
CREATE INDEX IF NOT EXISTS idx_partners_city_id ON partners(city_id);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_deals_partner_id ON deals(partner_id);
CREATE INDEX IF NOT EXISTS idx_deals_venue_id ON deals(venue_id);
CREATE INDEX IF NOT EXISTS idx_activities_partner_id ON activities(partner_id);

CREATE TABLE IF NOT EXISTS deal_checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_done BOOLEAN NOT NULL DEFAULT false,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_deal_id ON deal_checklist_items(deal_id);

CREATE TABLE IF NOT EXISTS partner_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    filename VARCHAR(500) NOT NULL,
    storage_path VARCHAR(1000) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_documents_partner_id ON partner_documents(partner_id);

CREATE TABLE IF NOT EXISTS system_settings (
    category VARCHAR(50)  NOT NULL,
    key      VARCHAR(100) NOT NULL,
    value    TEXT         NOT NULL DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (category, key)
);

-- Unique index so seed data can use ON CONFLICT DO NOTHING
CREATE UNIQUE INDEX IF NOT EXISTS idx_cities_name_country ON cities(name, country);

-- Seed: cities of Kazakhstan
INSERT INTO cities (id, name, country) VALUES
  (uuid_generate_v4(), 'Астана',        'Kazakhstan'),
  (uuid_generate_v4(), 'Алматы',        'Kazakhstan'),
  (uuid_generate_v4(), 'Шымкент',       'Kazakhstan'),
  (uuid_generate_v4(), 'Актобе',        'Kazakhstan'),
  (uuid_generate_v4(), 'Қарағанды',     'Kazakhstan'),
  (uuid_generate_v4(), 'Тараз',         'Kazakhstan'),
  (uuid_generate_v4(), 'Павлодар',      'Kazakhstan'),
  (uuid_generate_v4(), 'Өскемен',       'Kazakhstan'),
  (uuid_generate_v4(), 'Семей',         'Kazakhstan'),
  (uuid_generate_v4(), 'Атырау',        'Kazakhstan'),
  (uuid_generate_v4(), 'Қостанай',      'Kazakhstan'),
  (uuid_generate_v4(), 'Петропавл',     'Kazakhstan'),
  (uuid_generate_v4(), 'Орал',          'Kazakhstan'),
  (uuid_generate_v4(), 'Теміртау',      'Kazakhstan'),
  (uuid_generate_v4(), 'Қызылорда',     'Kazakhstan'),
  (uuid_generate_v4(), 'Ақтау',         'Kazakhstan'),
  (uuid_generate_v4(), 'Түркістан',     'Kazakhstan'),
  (uuid_generate_v4(), 'Екібастұз',     'Kazakhstan'),
  (uuid_generate_v4(), 'Рудный',        'Kazakhstan'),
  (uuid_generate_v4(), 'Жезқазған',     'Kazakhstan'),
  (uuid_generate_v4(), 'Балқаш',        'Kazakhstan'),
  (uuid_generate_v4(), 'Жаңаөзен',      'Kazakhstan'),
  (uuid_generate_v4(), 'Талдықорған',   'Kazakhstan'),
  (uuid_generate_v4(), 'Кентау',        'Kazakhstan'),
  (uuid_generate_v4(), 'Степногорск',   'Kazakhstan'),
  (uuid_generate_v4(), 'Арқалық',       'Kazakhstan'),
  (uuid_generate_v4(), 'Сатпаев',       'Kazakhstan'),
  (uuid_generate_v4(), 'Қонаев',        'Kazakhstan'),
  (uuid_generate_v4(), 'Лисаков',       'Kazakhstan'),
  (uuid_generate_v4(), 'Байқоңыр',      'Kazakhstan')
ON CONFLICT (name, country) DO NOTHING;
`
	_, err := db.Exec(schema)
	return err
}
