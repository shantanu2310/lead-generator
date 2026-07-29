# Precision Lead Generation Agent

Production-grade AI lead generation focused on **accuracy** and **verified contactability**.

Returns max 10-15 high-confidence leads per request. Never fabricates leads.

## Quick Start

### 1. Start Infrastructure

```bash
docker-compose up -d
```

This starts PostgreSQL 16 (with pg_trgm) and Redis 7.

### 2. Configure API Keys

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

| Key | Required For |
|-----|-------------|
| `LLM_API_KEY` | Intent parsing (OpenAI GPT-4o) |
| `GOOGLE_PLACES_API_KEY` | Local business discovery |
| `BRAVE_SEARCH_API_KEY` | Web search discovery |
| `HUNTER_API_KEY` | Email discovery & verification |

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run Server

```bash
python run.py
```

Server starts at `http://localhost:8000`

### 5. Search for Leads

```bash
curl -X POST http://localhost:8000/api/v1/leads/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "florist in Amsterdam",
    "latitude": 52.3676,
    "longitude": 4.9041,
    "max_leads": 15
  }'
```

## API

### `POST /api/v1/leads/search`

**Request:**
```json
{
  "query": "florist near me",
  "latitude": 52.3676,
  "longitude": 4.9041,
  "max_leads": 15
}
```

- `query` (required): Natural language search
- `latitude`/`longitude` (required for "near me"): User location
- `max_leads` (optional): 1-15, default 15

**Response:**
```json
{
  "query": "florist near me",
  "candidates_checked": 43,
  "qualified_leads_found": 12,
  "requested_max_leads": 15,
  "leads": [
    {
      "business_name": "Bloom Flowers",
      "website": "https://bloomflowers.nl",
      "email": "info@bloomflowers.nl",
      "phone": "+31201234567",
      "address": "123 Flower St, Amsterdam",
      "confidence_score": 95,
      "relevance_reason": "Active florist offering flower delivery",
      "verification": {
        "business_active": true,
        "website_identity_verified": true,
        "email_verified": true,
        "phone_cross_verified": true,
        "location_match": true
      }
    }
  ]
}
```

## Pipeline Stages

```
Natural Language Query
    ↓
Intent Parser (LLM)
    ↓
Search Planner (LLM)
    ↓
Candidate Discovery (Google Places + Brave)
    ↓
Normalization
    ↓
Deduplication (exact + fuzzy)
    ↓
Website Intelligence (Crawl4AI + Playwright)
    ↓
Email Enrichment (waterfall: website → Hunter)
    ↓
Email Verification (Hunter)
    ↓
Phone Verification (phonenumbers)
    ↓
Cross-Source Validation
    ↓
Deterministic Scoring (100pts max)
    ↓
Lead Selection (min 80pts)
    ↓
API Response
```

## Scoring Weights

| Signal | Points |
|--------|--------|
| Category/Intent Match | 25 |
| Business Active | 15 |
| Website Identity Verified | 15 |
| Phone Cross-Verified | 15 |
| Email Verified | 15 |
| Location Match | 10 |
| Recent Business Signal | 5 |

Minimum score to return: **80/100**

## Development

```bash
# Run tests
python -m pytest app/tests/ -v

# Lint
python -m ruff check app/

# Format
python -m ruff format app/
```

## Tech Stack

- **Python 3.12+** / FastAPI / Uvicorn
- **PostgreSQL 16** (pg_trgm for fuzzy matching)
- **Redis 7** (caching)
- **OpenAI GPT-4o** (intent parsing)
- **Google Places API** (local business discovery)
- **Brave Search API** (web search)
- **Hunter.io** (email discovery/verification)
- **Crawl4AI + Playwright** (website crawling)
- **SQLAlchemy 2** (async ORM)
- **Pydantic v2** (validation)
