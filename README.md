# AI-Integrated CRM Platform — Phase 1

> Smart Contact Form System with AI-Powered Lead Capture

---

## Architecture

```
CRM/
├── backend/              Node.js + Express API
│   ├── src/
│   │   ├── config/       DB + OpenAI config
│   │   ├── controllers/  Business logic
│   │   ├── middleware/   JWT auth
│   │   └── routes/       API endpoints
│   └── database/         Schema + seed
└── frontend/             Next.js 15 + Tailwind
    ├── app/
    │   ├── login/
    │   ├── dashboard/    Admin panel
    │   └── [slug]/       Public forms
    └── components/
        ├── forms/        Form builder
        └── public/       Public form views
```

## Quick Start

### 1. Configure Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set DB_HOST, DB_USER, DB_PASSWORD
```

### 2. Initialize Database

```bash
cd backend
npm run db:init
```

### 3. Start Backend

```bash
cd backend
npm run dev
```

### 4. Start Frontend

```bash
cd frontend
npm run dev
```

### Or start everything at once

```bash
./start.sh
```

---

## URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| Admin Dashboard | http://localhost:3000/dashboard |
| Public Form | http://localhost:3000/{company-slug}/contact-us |

## Default Admin

```
Email:    admin@example.com
Password: Admin@123456
```

---

## API Endpoints

### Auth
- `POST /api/auth/login`
- `GET  /api/auth/me`
- `PUT  /api/auth/change-password`

### Businesses (Authenticated)
- `GET    /api/businesses`
- `POST   /api/businesses`
- `GET    /api/businesses/:id`
- `PUT    /api/businesses/:id`
- `DELETE /api/businesses/:id`

### Forms (Authenticated)
- `GET    /api/forms/business/:businessId`
- `POST   /api/forms/business/:businessId`
- `GET    /api/forms/:id`
- `PUT    /api/forms/:id`
- `DELETE /api/forms/:id`
- `POST   /api/forms/generate-ai-questions`

### Leads (Authenticated)
- `GET    /api/leads` (with ?businessId=, ?formId=, ?page=, ?limit=)
- `GET    /api/leads/stats`
- `GET    /api/leads/:id`
- `DELETE /api/leads/:id`

### Public (No Auth)
- `GET  /api/public/:company_slug`           Get form data
- `POST /api/public/:company_slug/submit`    Submit standard form
- `POST /api/public/:company_slug/ai/start`  Start AI session
- `POST /api/public/ai/message`              Send AI message

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `admins` | Admin accounts |
| `businesses` | Business profiles |
| `contact_forms` | Form configurations |
| `leads` | Captured lead data |
| `ai_sessions` | AI conversation state |

---

## Phase 2 (Planned)

- AI Lead Scoring
- Spam Detection
- Automated Follow-ups
- CRM Pipeline
- Analytics Dashboard
