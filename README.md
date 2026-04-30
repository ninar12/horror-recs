# horror-recs

> Semantic horror film search and discovery app — find obscure picks by mood, theme, or vibe, not just title keywords.

## What it does

Users describe what they want ("something slow-burn and atmospheric about grief") and the app returns a ranked list of horror films that match — with a one-sentence explanation of why each film fits. Results are intentionally biased toward niche and cult films over mainstream picks the user has probably already seen. Users can save films to personal watchlists, track what they've watched, and get a random pick from any mood or watchlist.

## Tech Stack

- **Backend**: Python, FastAPI, Mangum (serverless adapter), deployed to Vercel
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query
- **Embeddings**: Gemini `text-embedding-004` (768 dims) via `google-generativeai`
- **Reranking**: Gemini 2.0 Flash — reranks Pinecone candidates and generates per-film explanations
- **Vector DB**: Pinecone (serverless, AWS us-east-1, cosine similarity)
- **User DB**: Neon (Postgres), accessed via SQLAlchemy + psycopg2
- **Auth**: JWT (python-jose) + bcrypt (passlib)
- **Data source**: TMDb API (film metadata, streaming providers via JustWatch)
- **Optional enrichment**: Firecrawl + Gemini Flash for themes/atmosphere from Bloody Disgusting reviews

## Architecture

```
User query
    │
    ▼
Gemini text-embedding-004        ← query embedded as retrieval_query (768 dims)
    │
    ▼
Pinecone vector search           ← top 50 candidates fetched
    │
    ▼
Gemini 2.0 Flash rerank          ← re-orders top 10, adds "why_youll_like_it",
    │                               boosts niche films when relevance is similar
    ▼
FastAPI → React frontend
```

**Key decisions:**

- **Gemini text-embedding-004 over OpenAI**: 768-dim vectors stored in Pinecone. Switching providers would require re-embedding and re-indexing the entire corpus.
- **Two-stage search (Pinecone → Gemini rerank)**: Pinecone gives fast approximate recall; Gemini rerank adds reasoning and explanation that vector search alone can't produce.
- **Niche scoring via TMDb `vote_count`**: A 1–10 score based purely on how many people have rated a film. Vote count is more stable than TMDb's popularity field, which spikes whenever a sequel releases. Higher score = more obscure.
- **Pinecone for vectors, Neon for users**: Film embeddings and metadata live in Pinecone (no relational structure needed). User accounts, watchlists, and watch history need relational integrity — Neon handles that.
- **Vercel serverless for the API**: Zero infra to manage; Mangum adapts the ASGI FastAPI app to Lambda-style handlers. The 50 MB lambda size limit in `vercel.json` accommodates the ML dependencies.
- **By-year ID pagination on TMDb**: TMDb's global discover endpoint caps at 10k results (500 pages × 20 films). Paginating by year independently bypasses that cap and reaches the full ~70k horror film catalog.

## Directory Structure

```
horror-recs/
├── api/
│   ├── index.py              — FastAPI app entry point + Mangum handler
│   ├── routes/
│   │   ├── auth.py           — POST /api/auth/register, /api/auth/login
│   │   ├── search.py         — GET /api/search, /api/search/mood
│   │   ├── watchlist.py      — CRUD /api/watchlists
│   │   └── random.py         — GET /api/random/from-watchlist, /api/random/from-mood
│   └── services/
│       ├── gemini.py         — embed_text, rerank_and_explain, generate_mood_query
│       ├── pinecone_client.py — search_films, upsert helpers
│       ├── database.py       — SQLAlchemy models (User, Watchlist, WatchlistItem, WatchHistory)
│       └── auth.py           — JWT encode/decode, bcrypt helpers
├── scripts/
│   ├── scrape_films.py       — Step 1: fetch all TMDb horror films → data/raw_films.json
│   ├── embed_and_index.py    — Step 2: embed with Gemini, upsert to Pinecone
│   └── update_films.py       — Weekly: fetch new films + refresh streaming providers
├── web/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── pages/
│   └── index.html
├── data/                     — Local only, gitignored (raw_films.json, checkpoints)
├── requirements.txt
└── vercel.json
```

## Data Pipeline

Run once to populate Pinecone from scratch. Scripts must run in order.

### Step 1 — Scrape films

```bash
python scripts/scrape_films.py
```

Fetches all horror films from TMDb, paginating by year (1900–present) to bypass the 10k global cap. Saves full metadata — title, director, cast, keywords, synopsis, streaming/rental platforms, and niche score — to `data/raw_films.json`.

**Resumable**: checkpoints saved to `data/film_ids.json`, `data/details_done.json`, `data/raw_films_partial.json`. Re-running picks up exactly where it left off. Checkpoints are deleted on successful completion.

**Optional enrichment**: Set `FIRECRAWL_ENRICH_LIMIT > 0` in the script to enrich the most-niche films with themes and atmosphere scraped from Bloody Disgusting reviews (requires `FIRECRAWL_API_KEY` and a paid Gemini plan for the volume).

### Step 2 — Embed and index

```bash
python scripts/embed_and_index.py
```

Reads `data/raw_films.json`, embeds each film using Gemini `text-embedding-004` (task type: `retrieval_document`), and upserts to Pinecone in batches of 100. Skips films already present in the index — safe to re-run.

Creates the Pinecone index (`horror-films`, 768 dims, cosine) if it doesn't exist.

## Environment Variables

| Variable | Required | Used by | Where to get it |
|---|---|---|---|
| `TMDB_READ_TOKEN` | Yes | scripts | TMDb developer dashboard → API Read Access Token |
| `GEMINI_API_KEY` | Yes | api, scripts | Google AI Studio |
| `PINECONE_API_KEY` | Yes | api, scripts | Pinecone console |
| `PINECONE_INDEX_NAME` | No | api, scripts | Defaults to `horror-films` |
| `DATABASE_URL` | Yes | api | Neon console → connection string (postgres://...) |
| `JWT_SECRET` | Yes | api | Any long random string |
| `JWT_ALGORITHM` | No | api | Defaults to `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | api | Defaults to `10080` (7 days) |
| `FRONTEND_URL` | No | api | Your deployed frontend URL (CORS) |
| `FIRECRAWL_API_KEY` | No | scripts | Firecrawl dashboard — only needed if enrichment is enabled |

Create a `.env` file in the project root for local development. The API reads `.env` automatically via `python-dotenv`.

## Local Development

**Backend:**

```bash
# Create and activate venv
python -m venv venv
source venv/Scripts/activate   # Git Bash on Windows

# Install dependencies
pip install -r requirements.txt

# Run API (reload on change)
uvicorn api.index:app --reload --port 8000
```

API will be at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

**Create database tables** (first run only):

```python
from api.services.database import create_tables
create_tables()
```

**Frontend:**

```bash
cd web
npm install
npm run dev
```

Frontend will be at `http://localhost:5173`. The Vite dev server proxies `/api` requests to `http://localhost:8000` — verify your `vite.config.ts` has that proxy configured.

## Deployment

The backend deploys to Vercel as a serverless Python function.

```bash
vercel --prod
```

`vercel.json` routes all `/api/*` requests to `api/index.py`. The lambda size cap is set to 50 MB to accommodate the ML dependencies (google-generativeai, pinecone-client).

Set all required environment variables in the Vercel project settings. The frontend can be deployed separately to any static host (Vercel, Netlify, etc.) — set `VITE_API_URL` to your deployed API URL if the frontend isn't on the same domain.

## Updating the Database

Run the weekly update script to pull in new releases and refresh streaming provider data:

```bash
python scripts/update_films.py
```

This script:
1. Fetches horror films released since the last run (tracked in `data/last_update.json`)
2. Refreshes streaming/rental provider data for all existing films (JustWatch data via TMDb)
3. Re-embeds and upserts only new or changed films to Pinecone
4. Appends new films to `data/raw_films.json` and writes today's date to `data/last_update.json`

Run this on a cron schedule (e.g., every Sunday). The first run after a long gap will process more films but is still incremental — it only upserts what changed.
