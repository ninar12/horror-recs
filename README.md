# ReelScream

> AI-powered horror film discovery — find obscure picks by mood, theme, vibe, or image. Intentionally biased toward cult and under-seen films.

## What it does

Users describe what they want ("something slow-burn and atmospheric about grief"), upload a photo for vibe-matching, or browse by preset theme. The app returns a ranked grid of horror films with a one-sentence AI explanation per film. Results are biased toward niche and cult picks over mainstream titles. Logged-in users can save films to watchlists, mark films as watched, and track watch history.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11, FastAPI, Mangum (serverless ASGI adapter) |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Embeddings** | Pinecone integrated — NVIDIA `llama-text-embed-v2` (1024 dims, server-side) |
| **Query expansion + reranking** | Gemini 2.5 Flash Lite — rewrites queries atmospherically, reranks candidates, writes per-film explanations |
| **Image search** | Gemini 2.5 Flash (Vision) — converts uploaded image to atmospheric horror query |
| **Vector DB** | Pinecone serverless (AWS us-east-1, cosine similarity) |
| **User DB** | Neon (Postgres) via SQLAlchemy + psycopg2 |
| **Auth** | JWT (python-jose) + bcrypt |
| **Ratings** | IMDb (TMDb), Letterboxd (scraped), Rotten Tomatoes (OMDb, ~950/day) |
| **Poster images** | TMDb API — patched into `raw_films.json` at index time |

---

## Architecture

```
User input (text query / mood / image upload)
    │
    ▼
Query expansion (Gemini 2.5 Flash Lite)       ← rewrites any input into 1-2 sentence
    │                                            atmospheric description
    ▼
Pinecone vector search                         ← top 30 candidates (CANDIDATE_POOL)
    │                                            pre-filtered by niche_score range
    │                                            optional year range filter (decade queries)
    ▼
Score blending                                 ← similarity * 0.6 + (niche_score / 10) * 0.4
    │
    ▼
Session deduplication                          ← exclude already-seen film IDs
    │
    ▼
Gemini 2.5 Flash Lite rerank                  ← re-orders top 8, adds why_youll_like_it,
    │                                            obscurity-biased prompt,
    │                                            optionally uses watch history for context
    ▼
In-memory poster enrichment                   ← raw_films.json lookup (lru_cache)
    │
    ▼
FastAPI JSON → React frontend grid
```

**Image search flow** (`/api/search/image`):
```
Uploaded image → Gemini 2.5 Flash Vision → atmospheric query string → same pipeline above
```

**Find Similar flow** (`/api/search/similar`):
```
Film metadata (title, genres, atmosphere) → Gemini rerank with similar_to mode → top 8
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
blended_score = similarity * 0.6 + (niche_score / 10) * 0.4
```

**Frontend tiers:**
| Score | Label | Color |
|---|---|---|
| 8–10 | DEEP CUT | Purple |
| 6–7 | CULT PICK | Blue |
| 4–5 | HIDDEN GEM | Amber/theme color |
| 1–3 | (no badge) | — |

---

## Consensus Scoring

Each film has a `consensus_score` (0–10) blended from available rating sources:

| Sources available | Weight |
|---|---|
| IMDb + RT + Letterboxd | 30% / 35% / 35% |
| IMDb + Letterboxd (no RT) | 46% / 54% |
| IMDb only | 100% |

RT scores are populated via OMDb (950/day free tier, ~10 days to full coverage). Letterboxd ratings are scraped (76% coverage as of build). `patch_ratings.py` pushes updates directly to Pinecone metadata without re-embedding.

---

## User Accounts

Auth is JWT-based. Tokens stored in `localStorage`, sent as `Authorization: Bearer` header.

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/auth/me` | Get current user profile |
| GET | `/api/history` | Watch history (newest first) |
| POST | `/api/history` | Mark film as watched |
| DELETE | `/api/history/{film_id}` | Remove from history |
| GET | `/api/history/ids` | Lightweight set of watched film IDs |
| GET | `/api/watchlists` | List watchlists |
| POST | `/api/watchlists` | Create watchlist |
| GET | `/api/watchlists/{id}` | Get watchlist with items |
| POST | `/api/watchlists/{id}/items` | Add film to watchlist |
| DELETE | `/api/watchlists/{id}/items/{item_id}` | Remove film |

**Frontend auth state** is managed via `AuthContext` (React Context API). On mount it rehydrates the token from `localStorage`, fetches `/api/auth/me` to load the user profile, and fetches `/api/history/ids` to pre-populate the watched state across all film cards.

---

## Directory Structure

```
horror-recs/
├── api/
│   ├── index.py                  — FastAPI app entry point + Mangum handler
│   ├── routes/
│   │   ├── auth.py               — register, login, /me
│   │   ├── search.py             — GET /search, /search/mood, POST /search/similar, /search/image
│   │   ├── watchlist.py          — CRUD /watchlists
│   │   ├── history.py            — watch history CRUD
│   │   └── random.py             — GET /random/from-watchlist, /random/from-mood
│   └── services/
│       ├── gemini.py             — expand_search_query, rerank_and_explain, generate_mood_query,
│       │                           image_to_horror_query (Gemini 2.5 Flash / Flash Lite)
│       ├── pinecone_client.py    — search_films: integrated embedding + score blending + year filter
│       ├── film_lookup.py        — in-memory poster lookup from raw_films.json (lru_cache)
│       ├── database.py           — SQLAlchemy models: User, Watchlist, WatchlistItem, WatchHistory
│       └── auth.py               — JWT encode/decode, bcrypt, get_optional_user_id
├── scripts/
│   ├── scrape_films.py           — Step 1: fetch TMDb horror catalog → data/raw_films.json
│   ├── patch_posters.py          — Step 1b: patch raw_films.json with poster_path from TMDb
│   ├── patch_niche_scores.py     — Step 1c: compute percentile-based niche scores
│   ├── patch_ratings.py          — Step 1d: fetch LB ratings + OMDb RT scores, push to Pinecone
│   ├── patch_vote_counts.py      — Step 1e: patch vote counts from TMDb
│   ├── patch_pinecone_posters.py — Backfill: push poster_url into existing Pinecone records
│   ├── embed_and_index.py        — Step 2: upsert_records to Pinecone (integrated embedding)
│   └── create_tables.py          — One-time: create Neon Postgres tables
├── web/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx               — nav bar, theme switcher, routes, AuthProvider
│   │   ├── api.ts                — axios client with auth interceptor, all endpoint helpers
│   │   ├── index.css             — terminal CSS variables, themes, scanlines, cursor blink
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx   — global auth state, watchedIds Set, toggleWatched()
│   │   ├── pages/
│   │   │   ├── Search.tsx        — unified search (text/image/random), niche slider, dedup
│   │   │   ├── Watchlists.tsx    — saved film grid + random pick
│   │   │   ├── FilmPage.tsx      — full film detail page, find similar, mark watched, save
│   │   │   ├── Profile.tsx       — user profile, watch history, stats, ascii bar chart
│   │   │   └── About.tsx
│   │   └── components/
│   │       ├── FilmCard.tsx      — poster-top card, niche badge, watched indicator, find similar
│   │       └── AuthModal.tsx     — login/register modal
│   └── index.html
├── data/                         — gitignored (raw_films.json, checkpoints)
├── requirements.txt
├── runtime.txt
└── vercel.json
```

---

## Data Pipeline

Run once to populate Pinecone from scratch. Scripts must run in order.

```bash
# Step 1 — Scrape films from TMDb
python scripts/scrape_films.py

# Step 1b — Patch poster URLs
python scripts/patch_posters.py

# Step 1c — Compute niche scores
python scripts/patch_niche_scores.py

# Step 1d — Fetch Letterboxd + OMDb ratings (run daily, 950 OMDb/day limit)
python scripts/patch_ratings.py

# Step 2 — Index to Pinecone
python scripts/embed_and_index.py
```

`patch_ratings.py` is resumable — skips films already having `rt_score`. It updates Pinecone metadata directly via `index.update()` without re-embedding.

---

## Environment Variables

| Variable | Required | Used by | Notes |
|---|---|---|---|
| `TMDB_READ_TOKEN` | Yes | scripts | TMDb developer dashboard → API Read Access Token |
| `GEMINI_API_KEY` | Yes | api | Google AI Studio |
| `PINECONE_API_KEY` | Yes | api, scripts | Pinecone console |
| `PINECONE_INDEX_NAME` | No | api, scripts | Defaults to `horror-recs` |
| `DATABASE_URL` | Yes | api | Neon console → `postgres://...` |
| `JWT_SECRET` | Yes | api | Any long random string |
| `JWT_ALGORITHM` | No | api | Defaults to `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | api | Defaults to `10080` (7 days) |
| `OMDB_API_KEY` | Yes | scripts | OMDb for RT scores — 1000 req/day free |
| `VITE_API_URL` | No | web | Deployed API URL if frontend is on a different domain |

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

Frontend at `http://localhost:5173`. Vite proxies `/api` to `http://localhost:8000`.

---

## UI

Terminal / CRT aesthetic:

- **Fonts**: VT323 (titles), Share Tech Mono (body)
- **Themes**: Amber (default), Green, Red, Cyan, White — switched via color swatches in the nav bar
- **Film cards**: Poster-top grid (2–5 columns responsive), 2:3 aspect ratio, niche tier badge, WATCHED ✓ indicator, FIND SIMILAR hover overlay
- **Film page**: Full-screen overlay with ratings, synopsis, atmosphere, genres, streaming, find similar strip
- **Profile page**: Watch history list + ASCII bar chart of films watched per month
- **Mobile**: Bottom nav bar

---

## Deployment

```bash
vercel --prod
```

`vercel.json` routes `/api/*` to `api/index.py` (Python serverless, 50 MB lambda cap) and serves the React build as a static site from `web/dist`. Set all environment variables in Vercel project settings before deploying.

---

## Data Coverage (as of June 2026)

| Attribute | Coverage |
|---|---|
| Films indexed in Pinecone | 9,536 |
| Poster images | 100% |
| IMDb ratings | ~94% (8,971 with consensus score) |
| Letterboxd ratings | 76% (7,290 / 9,536) |
| Rotten Tomatoes scores | ~0.02% (2 / 9,536) — running at 950/day via OMDb |
| Consensus score | 94% (8,971 / 9,536) |
| Niche scores | 100% |
