# CRM Ticketon — Sales Intelligence Platform

> Полнофункциональная CRM система для отдела продаж с ИИ-аналитикой, телефонией, WhatsApp и настраиваемым pipeline.
> Вдохновлена: **Freshsales · Salesforce · AmoCRM**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | **Go 1.22** + Gin + PostgreSQL + Redis |
| Frontend | **React 18** + TypeScript + Redux + TailwindCSS |
| Auth | JWT + RBAC (4 roles) |
| API Docs | Swagger (OpenAPI 3.0) |
| Storage | S3 / MinIO (call recordings) |
| Containers | Docker Compose |

---

## Features

### Core CRM
- **Contacts** — база клиентов с тегами, источниками, статусами, поиском
- **Deals** — управление сделками с привязкой к контактам
- **Pipeline Kanban** — drag & drop по воронке, настройка стадий и вероятностей
- **Activities** — звонки, письма, встречи, задачи, заметки

### Telephony
- Интеграция: **Asterisk · FreeSWITCH · Twilio · Zadarma · Sipuni**
- Запись звонков → хранение в S3/MinIO
- Воспроизведение записей прямо в CRM
- Webhook-обработчик входящих событий

### WhatsApp
- Интеграция: **Meta Business API · Wazzup · Chat-API**
- Встроенный чат-интерфейс с историей переписки
- Входящие сообщения через webhook → привязка к контакту

### AI Analytics
- **Win score** — вероятность закрытия сделки (0–100%)
- **Sentiment analysis** — тональность звонков и переписки
- **Pipeline insights** — автоматические рекомендации
- **Sales forecast** — взвешенный прогноз по воронке
- **Top performers** — рейтинг менеджеров

### Dashboard
- KPI: Revenue / Conversion Rate / Contacts / Calls
- Revenue trend chart (area)
- Pipeline breakdown (bar + pie)
- Activity breakdown
- AI insights panel
- Period selector: Week / Month / Quarter / Year

### Access Control (RBAC)
| Role | Access |
|------|--------|
| **Admin** | Полный доступ, управление пользователями, настройки |
| **Manager** | Управление данными, пайплайн, отчёты |
| **Sales** | Контакты, сделки, свои активности |
| **Viewer** | Только чтение дашборда и контактов |

---

## Quick Start

### Docker Compose (рекомендуется)

```bash
git clone https://github.com/your-org/crm-ticketon
cd crm-ticketon
docker-compose up -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger/index.html
- MinIO console: http://localhost:9001

**Дефолтный логин:** `admin@crm.local` / `admin123`

### Local Development

#### Backend
```bash
cd backend
go mod tidy

# Генерация Swagger docs
go install github.com/swaggo/swag/cmd/swag@latest
swag init -g cmd/server/main.go -o docs

# Запуск
DB_HOST=localhost DB_USER=crm DB_PASSWORD=crm_password DB_NAME=crm_ticketon \
JWT_SECRET=my-secret-32-char-key \
go run ./cmd/server
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

---

## API Documentation

Swagger UI: `http://localhost:8080/swagger/index.html`

### Authentication
```http
POST /api/v1/auth/login
{ "email": "admin@crm.local", "password": "admin123" }
→ { "token": "eyJ...", "user": {...} }
```

Все защищённые запросы:
```http
Authorization: Bearer eyJ...
```

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Авторизация |
| GET | `/api/v1/contacts` | Список контактов |
| POST | `/api/v1/contacts` | Создать контакт |
| GET | `/api/v1/pipelines` | Воронки со стадиями |
| GET | `/api/v1/deals` | Список сделок |
| PATCH | `/api/v1/deals/:id/move` | Переместить сделку |
| GET | `/api/v1/analytics/dashboard` | Метрики дашборда |
| POST | `/api/v1/telephony/calls` | Инициировать звонок |
| GET | `/api/v1/telephony/calls/:id/recording` | URL записи |
| POST | `/api/v1/whatsapp/messages` | Отправить WhatsApp |
| GET | `/api/v1/analytics/deals/:id` | AI-анализ сделки |
| GET | `/api/v1/analytics/forecast` | Прогноз продаж |

---

## Project Structure

```
crm-ticketon/
├── backend/
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── api/handlers/
│   │   │
│   │   ├── api/middleware/
│   │   ├── api/router.go
│   │   ├── models/
│   │   ├── repository/
│   │   └── config/
│   ├── pkg/auth/jwt.go
│   └── configs/config.yaml
├── frontend/
│   └── src/
│       ├── pages/
│       │
│       ├── components/
│       ├── api/
│       ├── store/
│       └── types/
└── docker-compose.yml
```

---

## Integrations Setup

### Telephony (`configs/config.yaml`)
```yaml
telephony:
  provider: "twilio"
  api_key: "..."
  webhook_url: "https://your-crm/api/v1/webhooks/telephony"
```

### WhatsApp
```yaml
whatsapp:
  provider: "meta"
  api_key: "YOUR_META_TOKEN"
  phone_id: "YOUR_PHONE_ID"
  webhook_url: "https://your-crm/api/v1/webhooks/whatsapp"
```

### AI (OpenAI / Anthropic / Local)
```yaml
ai:
  api_key: "sk-..."
  model: "gpt-4o-mini"
```
Без ключа — работает rule-based scoring.
