# ReelScream

> AI-powered horror film discovery — find obscure picks by mood, theme, or vibe, not just title keywords.

## What it does

Users describe what they want ("something slow-burn and atmospheric about grief") and the app returns a ranked grid of horror films that match — each with a one-sentence AI explanation of why it fits. Results are intentionally biased toward niche and cult films over mainstream picks the user has probably already seen. Users can save films to personal watchlists and get a random pick from any mood or watchlist.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11, FastAPI, Mangum (serverless ASGI adapter) |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Embeddings** | Pinecone integrated — NVIDIA `llama-text-embed-v2` (1024 dims, hosted) |
| **Reranking + mood expansion** | Gemini 2.5 Flash — reranks candidates, writes per-film explanations, expands mood queries |
| **Vector DB** | Pinecone serverless (AWS us-east-1, cosine similarity) |
| **User DB** | Neon (Postgres) via SQLAlchemy + psycopg2 |
| **Auth** | JWT (python-jose) + bcrypt (passlib) |
| **Poster images** | TMDb API — patched into `raw_films.json` at index time, served via in-memory lookup |
| **Data source** | TMDb API (metadata, streaming providers via JustWatch) |

---

## Architecture

```
User query (text)
    │
    ▼
Pinecone integrated embedding        ← llama-text-embed-v2, query embedded server-side
    │                                   no client-side embedding call needed
    ▼
Pinecone vector search               ← top 10 candidates (CANDIDATE_POOL)
    │                                   pre-filtered by niche_score range
    ▼
Score blending                       ← similarity * 0.7 + (niche_score / 10) * 0.3
    │
    ▼
Gemini 2.5 Flash rerank              ← re-orders, adds why_youll_like_it per film,
    │                                   optionally uses watch history for context
    ▼
In-memory poster enrichment          ← raw_films.json lookup, no extra network call
    │
    ▼
FastAPI JSON → React frontend grid
```

**Mood query flow** (the `/api/search/mood` endpoint):
```
Mood phrase → Gemini 2.5 Flash expands to semantic horror query → same pipeline above
```

---

## Niche Scoring

Each film has a `niche_score` from 1–10 stored in Pinecone. Higher = more obscure.

**Current formula** (`scripts/patch_niche_scores.py`):
- Sort all films by TMDb `popularity` (ascending — lower popularity = more niche)
- Divide into 10 equal percentile buckets (~950 films each)
- Score = bucket number (1 = most mainstream, 10 = deepest cut)

**Score blending at query time:**
```python
blended_score = similarity * 0.7 + (niche_score / 10) * 0.3
```
This ensures relevant films rank first, but niche films win tiebreakers.

**Frontend tiers:**
| Score | Label | Color |
|---|---|---|
| 8–10 | DEEP CUT | Purple |
| 6–7 | CULT PICK | Blue |
| 4–5 | HIDDEN GEM | Amber/theme color |
| 1–3 | (no badge) | — |

**Known limitations / planned improvements:**
- Pure `popularity` signal is volatile — TMDb popularity spikes on sequel announcements. Adding `vote_count` as a second signal (weighted 40/60) would produce more stable scores.
- No year normalization — a 1974 film with 500 votes is more obscure than a 2024 film with 500 votes. Year-adjusted percentiles would correct this.
- No quality/obscurity separation — a low-quality obscure film and a genuine hidden gem score identically. A `quality_score` (IMDb rating weighted by log vote count) could let Gemini distinguish them in the reranking prompt.

---

## Directory Structure

```
horror-recs/
├── api/
│   ├── index.py                  — FastAPI app entry point + Mangum handler
│   ├── routes/
│   │   ├── auth.py               — POST /api/auth/register, /api/auth/login
│   │   ├── search.py             — GET /api/search, /api/search/mood
│   │   ├── watchlist.py          — CRUD /api/watchlists
│   │   └── random.py             — GET /api/random/from-watchlist, /api/random/from-mood
│   └── services/
│       ├── gemini.py             — rerank_and_explain, generate_mood_query (Gemini 2.5 Flash)
│       ├── pinecone_client.py    — search_films using integrated embedding + score blending
│       ├── film_lookup.py        — in-memory poster lookup from raw_films.json (lru_cache)
│       ├── database.py           — SQLAlchemy models: User, Watchlist, WatchlistItem, WatchHistory
│       └── auth.py               — JWT encode/decode, bcrypt, get_optional_user_id
├── scripts/
│   ├── scrape_films.py           — Step 1: fetch TMDb horror catalog → data/raw_films.json
│   ├── patch_posters.py          — Step 1b: patch raw_films.json with poster_path from TMDb
│   ├── patch_niche_scores.py     — Step 1c: compute percentile-based niche scores
│   ├── embed_and_index.py        — Step 2: upsert_records to Pinecone (integrated embedding)
│   └── create_tables.py          — One-time: create Neon Postgres tables
├── web/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx               — nav bar, theme switcher, routes
│   │   ├── api.ts                — axios client, search/watchlist/auth helpers
│   │   ├── vite-env.d.ts         — Vite import.meta.env type declarations
│   │   ├── index.css             — terminal CSS variables, themes, scanlines
│   │   ├── pages/
│   │   │   ├── Search.tsx        — two-column layout: sidebar search + poster grid
│   │   │   └── Watchlists.tsx
│   │   └── components/
│   │       └── FilmCard.tsx      — poster-top card with niche badge + expandable details
│   └── index.html
├── data/                         — gitignored (raw_films.json, checkpoints)
├── requirements.txt
└── vercel.json
```

---

## Data Pipeline

Run once to populate Pinecone from scratch. Scripts must run in order.

### Step 1 — Scrape films

```bash
python scripts/scrape_films.py
```

Fetches all horror films from TMDb, paginating by year (1900–present) to bypass the 10k global cap. Saves full metadata to `data/raw_films.json`. Resumable via checkpoint files.

### Step 1b — Patch posters

```bash
python scripts/patch_posters.py
```

Fetches `poster_path` from TMDb for any film in `raw_films.json` missing one. Uses 15 parallel workers. Run after scraping or after adding new films.

### Step 1c — Patch niche scores

```bash
python scripts/patch_niche_scores.py
```

Reads `raw_films.json`, computes percentile-based niche scores from TMDb `popularity`, and writes updated scores back to the file. Re-run after adding new films so the percentile buckets stay calibrated across the full corpus.

### Step 2 — Index to Pinecone

```bash
python scripts/embed_and_index.py
```

Reads `raw_films.json` and upserts records to Pinecone using `upsert_records()` with integrated embedding (llama-text-embed-v2 is called server-side by Pinecone — no local embedding step). Batches of 40 records with rate-limit backoff. Skips films already indexed — safe to re-run.

---

## Environment Variables

| Variable | Required | Used by | Notes |
|---|---|---|---|
| `TMDB_READ_TOKEN` | Yes | scripts | TMDb developer dashboard → API Read Access Token |
| `GEMINI_API_KEY` | Yes | api | Google AI Studio — Gemini 2.5 Flash for reranking |
| `PINECONE_API_KEY` | Yes | api, scripts | Pinecone console |
| `PINECONE_INDEX_NAME` | No | api, scripts | Defaults to `horror-films` |
| `DATABASE_URL` | Yes | api | Neon console → `postgres://...` connection string |
| `JWT_SECRET` | Yes | api | Any long random string |
| `JWT_ALGORITHM` | No | api | Defaults to `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | api | Defaults to `10080` (7 days) |
| `VITE_API_URL` | No | web | Set to deployed API URL if frontend is on a different domain |

---

## Local Development

**Backend:**

```bash
python -m venv venv
source venv/Scripts/activate      # Git Bash on Windows
pip install -r requirements.txt
uvicorn api.index:app --reload --port 8000
```

API at `http://localhost:8000`. Docs at `http://localhost:8000/docs`.

Create Neon tables on first run:

```bash
python scripts/create_tables.py
```

**Frontend:**

```bash
cd web
npm install
npm run dev
```

Frontend at `http://localhost:5173`. Vite proxies `/api` to `http://localhost:8000` — verify `vite.config.ts` has the proxy configured.

Both processes must run simultaneously during local development.

---

## UI

The frontend uses a custom terminal / CRT aesthetic:

- **Fonts**: VT323 (titles), Share Tech Mono (body)
- **Themes**: Amber (default), Green, Red, Cyan, White — switched via color swatches in the nav bar. Each theme changes the `--term-bright` CSS variable which drives the inverted right-panel background and all accent colors.
- **Layout**: Fixed left sidebar (search, mode toggle, niche slider) + scrollable right panel with an inverted background (`bg-[var(--term-bright)]`, black text)
- **Film cards**: Poster-top grid (2–6 columns responsive), 2:3 aspect ratio poster, niche tier badge overlay, expandable details (AI reason, director, streaming, external links)
- **Mobile**: Sidebar hidden below `md` breakpoint, accessible via a `☰ SEARCH` drawer toggle

---

## Deployment

```bash
vercel --prod
```

`vercel.json` routes `/api/*` to `api/index.py` (Python serverless function, 50 MB lambda cap) and serves the React build as a static site from `web/dist`. Set all environment variables in the Vercel project settings before deploying.
