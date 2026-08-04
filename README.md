# Precision Lead Generation Agent

AI-powered business lead discovery and verification with a full sales pipeline.

- **Backend:** FastAPI (async, SQLAlchemy 2) — runs on port **8001**
- **Frontend:** Next.js 16 (App Router, Tailwind) — runs on port **3000**
- **Database:** SQLite locally (`leadgen.db`), PostgreSQL (Neon) in production
- **Auth:** invite-only, JWT (24h) + PBKDF2; the **first registered user becomes admin**

## Quick Start (local dev)

### 1. Configure API keys

Copy `.env.example` to `.env` and fill in:

| Key | Required For |
|-----|-------------|
| `LLM_API_KEY` | Intent parsing (OpenAI GPT-4o) |
| `GOOGLE_PLACES_API_KEY` | Local business discovery |
| `BRAVE_SEARCH_API_KEY` | Web search discovery |
| `HUNTER_API_KEY` | Email discovery & verification |
| `AUTH_SECRET_KEY` | JWT signing (change from the default!) |
| `DATABASE_URL` | Optional; defaults to local SQLite |

### 2. Start the backend

```bash
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

Tables are auto-created at startup. Health check: `http://localhost:8001/api/v1/health`

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` — register the first account (becomes admin).

## Authentication & accounts

- Invite-only: once any user exists, new accounts can only be created by an admin (Users page)
- Bootstrap: on an empty `users` table, the first registration becomes the admin
- Admin can add/edit/disable/delete users, assign leads to anyone, and access Settings
- Members claim unassigned leads for themselves; anyone can log contact activities

## Working a lead

1. **Search** generates qualified leads (scored, verified email/phone/website)
2. **Pipeline**: kanban drag or table to move stages; funnel + charts per search
3. **Lead detail**: click-to-call (`tel:`), stage dropdown, Assigned To, Contact Log
4. **Contact log outcomes auto-move stages**: `interested`→Qualified, `callback_requested`/`follow_up_required`→Follow-up, `meeting_scheduled`→Meeting, `not_interested`→Lost

## Deployment (Render + Neon, free tier)

The app is deployed from GitHub (`main` branch) as two Render Web Services with a Neon Postgres database.

### Database (Neon)

Create a Neon project, copy the connection string, convert to the async form:

```
postgresql+asyncpg://<user>:<password>@<host>/<db>?ssl=require
```

### API service (Render)

| Setting | Value |
|---------|-------|
| Repo | `shantanu2310/lead-generator` |
| Root Directory | *(root)* |
| Build | `pip install -r requirements.txt` |
| Start | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

Env vars: `DATABASE_URL`, `LLM_API_KEY`, `GOOGLE_PLACES_API_KEY`, `HUNTER_API_KEY`, `AUTH_SECRET_KEY` (random), `APP_ENV=production`, and `CORS_ORIGINS` (comma-separated list of frontend URLs, e.g. `https://leadgen-frontend-xv22.onrender.com,http://localhost:3000`).

### Frontend service (Render)

| Setting | Value |
|---------|-------|
| Repo | `shantanu2310/lead-generator` |
| Root Directory | `frontend` |
| Runtime | Node 20 |
| Build | `npm install && npm run build` |
| Start | `npm run start` |

Env vars (baked at build time — redeploy after changing): `NEXT_PUBLIC_API_URL=https://<api>.onrender.com`, `NEXT_PUBLIC_WS_URL=wss://<api>.onrender.com/ws/pipeline`, `NODE_VERSION=20`.

### Live URLs

- App: `https://leadgen-frontend-xv22.onrender.com`
- API: `https://leadgen-api-si8n.onrender.com`

### Production notes

- **Free tier spins down after ~15 min idle** — first request after idle takes 30–60s
- After first deploy, register the first account at the app URL — it becomes the admin
- Create accounts for other people on the Users page and share the link + credentials
- SQLite is local-only; production data lives in Neon (persists across redeploys)

## Custom domain

1. Render → service → **Settings** → **Custom Domains** → add your domain (e.g. `leads.yourcompany.com`)
2. At your DNS provider add a **CNAME**: `leads` → `<service>.onrender.com`
3. Render issues a Let's Encrypt cert automatically; then add `https://leads.yourcompany.com` to `CORS_ORIGINS` and set `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_WS_URL` to the new domain + redeploy

## API

### `POST /api/v1/leads/search`

**Request:**
```json
{
  "query": "florist in Amsterdam",
  "latitude": 52.3676,
  "longitude": 4.9041,
  "max_leads": 15
}
```

- `query` (required): Natural language search
- `latitude`/`longitude` (for "near me" queries)
- `max_leads` (optional): 1-15

**Response:** `leads[]` with `business_name`, `website`, `email`, `phone`, `address`, `confidence_score`, `relevance_reason`, `verification{}`.

All endpoints except `/health` require a Bearer token (`POST /api/v1/auth/login`).

## Tech Stack

- **Python 3.12+** / FastAPI / Uvicorn
- **Next.js 16** / React 19 / Tailwind CSS 4
- **PostgreSQL** (Neon, prod) / **SQLite** (dev), SQLAlchemy 2 async
- **OpenAI GPT-4o** (intent parsing), **Google Places API**, **Brave Search API**, **Hunter.io**
- **JWT + PBKDF2** (pyjwt, stdlib hashlib)
