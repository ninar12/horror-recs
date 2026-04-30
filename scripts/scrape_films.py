"""
Data pipeline step 1: Fetch horror films from TMDb (primary) and optionally
enrich themes/atmosphere via Firecrawl + Gemini (secondary).

Run: python scripts/scrape_films.py
Output: data/raw_films.json

Resumable — if interrupted, re-running picks up exactly where it left off.
Checkpoints saved to data/:
  film_ids.json        — all TMDb horror IDs (skip re-fetch if exists)
  details_done.json    — set of IDs already detail-fetched
  raw_films_partial.json — films fetched so far
"""
import json
import os
import re
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import httpx
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

TMDB_TOKEN = os.environ["TMDB_READ_TOKEN"]
TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_HEADERS = {"Authorization": f"Bearer {TMDB_TOKEN}", "accept": "application/json"}
HORROR_GENRE_ID = 27

MAX_PAGES = 500  # 20 films/page — 500 pages = ~10,000 films
FIRECRAWL_ENRICH_LIMIT = 0  # set > 0 only on paid Gemini plan

GEMINI_KEY = os.environ.get("GEMINI_API_KEY")
FIRECRAWL_KEY = os.environ.get("FIRECRAWL_API_KEY")

CHECKPOINT_IDS      = Path("data/film_ids.json")
CHECKPOINT_DONE     = Path("data/details_done.json")
CHECKPOINT_PARTIAL  = Path("data/raw_films_partial.json")
OUTPUT              = Path("data/raw_films.json")
CHECKPOINT_INTERVAL = 100  # save progress every N films


# ── Checkpoint helpers ────────────────────────────────────────────────────────

def load_json(path: Path, default):
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return default


def save_json(path: Path, data) -> None:
    with open(path, "w") as f:
        json.dump(data, f)


# ── TMDb helpers ──────────────────────────────────────────────────────────────

def tmdb_get(path: str, params: dict = {}) -> dict:
    r = httpx.get(f"{TMDB_BASE}{path}", params=params, headers=TMDB_HEADERS, timeout=10)
    r.raise_for_status()
    return r.json()


# Percentile thresholds derived from the horror film dataset (raw_films.json).
# Each threshold is the p10/p20/.../p90 popularity boundary.
# Films at or below threshold[i] score 10-i; above all thresholds scores 1.
_POPULARITY_THRESHOLDS = [0.684, 0.821, 0.951, 1.070, 1.208, 1.376, 1.612, 2.072, 3.351]


def compute_niche_score(
    popularity: float,
    vote_count: int,
    vote_average: float = 0.0,
    year: int | None = None,
    original_language: str = "en",
) -> int:
    """
    Percentile-based niche score 1-10. Higher = more obscure/cult.

    Base score maps popularity to a decile bucket (~950 films per bucket):
      <= p10 (0.684)  → 10   bottom 10% — virtually unknown
      <= p20 (0.821)  → 9
      <= p30 (0.951)  → 8
      <= p40 (1.070)  → 7
      <= p50 (1.208)  → 6
      <= p60 (1.376)  → 5
      <= p70 (1.612)  → 4
      <= p80 (2.072)  → 3
      <= p90 (3.351)  → 2
      >  p90          → 1    top 10% — mainstream horror

    Modifiers:
      - Quality gate: vote_average < 5.0 and vote_count < 1000 → -2 (DTV trash)
      - Hidden gem bonus: vote_average >= 7.0 at base >= 6 → +1
      - Age bonus: pre-1980 → +1 (fewer digital votes by nature)
      - Foreign language bonus: non-English → +1 (underrepresented on TMDb)
    """
    base = 10
    for threshold in _POPULARITY_THRESHOLDS:
        if popularity > threshold:
            base -= 1
        else:
            break

    if vote_average < 5.0 and vote_count < 1000:
        base = max(1, base - 2)
    elif vote_average >= 7.0 and base >= 6:
        base = min(10, base + 1)

    if year and year < 1980:
        base = min(10, base + 1)
    if original_language and original_language not in ("en", ""):
        base = min(10, base + 1)

    return base


def fetch_film_detail(movie_id: int) -> dict | None:
    try:
        detail = tmdb_get(f"/movie/{movie_id}", {"append_to_response": "credits,keywords,watch/providers"})
        genres = [g["name"] for g in detail.get("genres", [])]

        if not any(g.lower() == "horror" for g in genres):
            return None

        director = next(
            (c["name"] for c in detail.get("credits", {}).get("crew", []) if c["job"] == "Director"),
            "",
        )
        cast = [c["name"] for c in detail.get("credits", {}).get("cast", [])[:6]]
        keywords = [k["name"] for k in detail.get("keywords", {}).get("keywords", [])]

        # Streaming providers via TMDb/JustWatch (US region)
        us_providers = detail.get("watch/providers", {}).get("results", {}).get("US", {})
        streaming = [p["provider_name"] for p in us_providers.get("flatrate", [])]
        rental = [p["provider_name"] for p in us_providers.get("rent", [])]

        year = int(detail.get("release_date", "0000")[:4]) if detail.get("release_date") else None
        vote_count = detail.get("vote_count") or 0
        vote_average = detail.get("vote_average") or 0.0
        popularity = detail.get("popularity") or 0.0
        original_language = detail.get("original_language", "en")

        return {
            "tmdb_id": movie_id,
            "title": detail.get("title", ""),
            "year": year,
            "director": director,
            "cast": cast,
            "genres": genres,
            "keywords": keywords,
            "original_language": original_language,
            "synopsis": detail.get("overview", ""),
            "imdb_rating": vote_average,
            "vote_count": vote_count,
            "popularity": popularity,
            "runtime_minutes": detail.get("runtime") or 0,
            "niche_score": compute_niche_score(popularity, vote_count, vote_average, year, original_language),
            "streaming_platforms": streaming,
            "rental_platforms": rental,
            "is_horror": True,
            "themes": [],
            "atmosphere": "",
        }
    except Exception as e:
        print(f"  TMDb detail error id={movie_id}: {e}")
        return None


def fetch_ids_for_year(year: int) -> list[int]:
    """
    Fetch all horror film IDs for a single year.
    Paginating by year bypasses TMDb's 500-page global discover cap,
    letting us reach all ~70k horror films instead of just 10k.
    """
    ids = []
    first = tmdb_get("/discover/movie", {
        "with_genres": HORROR_GENRE_ID,
        "primary_release_year": year,
        "sort_by": "vote_count.desc",
        "page": 1,
    })
    total_pages = min(first.get("total_pages", 1), 500)
    ids.extend(m["id"] for m in first.get("results", []))

    for page in range(2, total_pages + 1):
        try:
            data = tmdb_get("/discover/movie", {
                "with_genres": HORROR_GENRE_ID,
                "primary_release_year": year,
                "sort_by": "vote_count.desc",
                "page": page,
            })
            ids.extend(m["id"] for m in data.get("results", []))
            time.sleep(0.05)
        except Exception as e:
            print(f"  Year {year} page {page} error: {e}")

    return ids


def fetch_all_horror_ids() -> list[int]:
    if CHECKPOINT_IDS.exists():
        ids = load_json(CHECKPOINT_IDS, [])
        print(f"Step 1: Loaded {len(ids)} IDs from checkpoint (skipping re-fetch)")
        return ids

    print("Step 1: Fetching horror film IDs from TMDb (by year — bypasses 10k cap)...")
    all_ids: set[int] = set()

    years = list(range(1900, 2026))
    for i, year in enumerate(years):
        year_ids = fetch_ids_for_year(year)
        all_ids.update(year_ids)
        if year_ids:
            print(f"  {year}: {len(year_ids)} films — {len(all_ids)} total so far")

    ids = list(all_ids)
    save_json(CHECKPOINT_IDS, ids)
    print(f"\n  {len(ids)} unique horror IDs saved to checkpoint")
    return ids


# ── Validation ────────────────────────────────────────────────────────────────

def validate(film: dict) -> bool:
    return bool(
        film.get("is_horror")
        and film.get("title", "").strip()
        and len(film.get("synopsis", "").strip()) >= 30
        and film.get("genres")
    )


# ── Detail fetch with resume ──────────────────────────────────────────────────

def fetch_all_details(ids: list[int]) -> list[dict]:
    done_ids: set[int] = set(load_json(CHECKPOINT_DONE, []))
    films: list[dict] = load_json(CHECKPOINT_PARTIAL, [])

    remaining = [mid for mid in ids if mid not in done_ids]

    if done_ids:
        print(f"Step 2: Resuming — {len(done_ids)} already done, {len(remaining)} remaining")
    else:
        print(f"Step 2: Fetching details for {len(ids)} films (parallel, 10 workers)...")

    if not remaining:
        print("  All details already fetched.")
        return films

    processed = 0
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {pool.submit(fetch_film_detail, mid): mid for mid in remaining}
        for future in as_completed(futures):
            mid = futures[future]
            result = future.result()
            done_ids.add(mid)
            if result and validate(result):
                films.append(result)
            processed += 1

            if processed % CHECKPOINT_INTERVAL == 0:
                save_json(CHECKPOINT_PARTIAL, films)
                save_json(CHECKPOINT_DONE, list(done_ids))
                pct = processed / len(remaining) * 100
                print(f"  {processed}/{len(remaining)} ({pct:.0f}%) — {len(films)} valid films — checkpoint saved")

    # Final save
    save_json(CHECKPOINT_PARTIAL, films)
    save_json(CHECKPOINT_DONE, list(done_ids))
    print(f"  Done: {len(films)} valid horror films")
    return films


# ── Firecrawl enrichment (optional) ──────────────────────────────────────────

def enrich_with_firecrawl(films: list[dict], limit: int) -> list[dict]:
    if not FIRECRAWL_KEY or not GEMINI_KEY or limit == 0:
        print("Step 3: Skipping Firecrawl enrichment (FIRECRAWL_ENRICH_LIMIT=0)")
        return films

    from firecrawl import FirecrawlApp
    fc = FirecrawlApp(api_key=FIRECRAWL_KEY)
    genai.configure(api_key=GEMINI_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")

    # Load enrichment checkpoint — track which tmdb_ids are already enriched
    enrichment_checkpoint = Path("data/enriched_ids.json")
    enriched_ids: set[int] = set(load_json(enrichment_checkpoint, []))

    to_enrich = [
        f for f in sorted(films, key=lambda x: x.get("niche_score", 0), reverse=True)
        if f["tmdb_id"] not in enriched_ids
    ][:limit]

    if not to_enrich:
        print("Step 3: All films already enriched.")
        return films

    print(f"Step 3: Enriching {len(to_enrich)} films via Firecrawl (resumable)...")
    enrich_map = {f["tmdb_id"]: f for f in films}

    enriched_count = 0
    for film in to_enrich:
        title = film["title"]
        year = film.get("year", "")
        try:
            result = fc.scrape_url(
                f"https://bloody-disgusting.com/?s={title.replace(' ', '+')}",
                params={"formats": ["markdown"]},
            )
            content = (result.get("markdown") or "")[:3000]
            if not content:
                enriched_ids.add(film["tmdb_id"])
                continue

            prompt = (
                f"From this horror review content about '{title}' ({year}), extract:\n"
                f"1. themes: a JSON array of thematic elements (e.g. grief, isolation, paranoia, cults)\n"
                f"2. atmosphere: a single short phrase (e.g. 'slow burn dread', 'campy fun')\n\n"
                f"Content:\n{content}\n\n"
                f"Return only valid JSON: {{\"themes\": [...], \"atmosphere\": \"...\"}}"
            )

            for attempt in range(4):
                try:
                    resp = model.generate_content(prompt)
                    data = json.loads(resp.text.strip())
                    enrich_map[film["tmdb_id"]]["themes"] = data.get("themes", [])
                    enrich_map[film["tmdb_id"]]["atmosphere"] = data.get("atmosphere", "")
                    enriched_count += 1
                    break
                except Exception as gemini_err:
                    wait = 30
                    match = re.search(r"seconds:\s*(\d+)", str(gemini_err))
                    if match:
                        wait = int(match.group(1)) + 2
                    if attempt < 3:
                        print(f"  Rate limited — waiting {wait}s ({attempt+1}/3)...")
                        time.sleep(wait)
                    else:
                        print(f"  Gemini failed for '{title}' after retries")

            enriched_ids.add(film["tmdb_id"])

            if enriched_count % 10 == 0 and enriched_count > 0:
                save_json(enrichment_checkpoint, list(enriched_ids))
                print(f"  Enriched {enriched_count}/{len(to_enrich)} — checkpoint saved")

        except Exception as e:
            print(f"  Enrich failed for '{title}': {e}")

        time.sleep(15)

    save_json(enrichment_checkpoint, list(enriched_ids))
    return list(enrich_map.values())


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    Path("data").mkdir(exist_ok=True)

    ids = fetch_all_horror_ids()
    films = fetch_all_details(ids)

    films = enrich_with_firecrawl(films, limit=FIRECRAWL_ENRICH_LIMIT)

    films.sort(key=lambda f: f.get("niche_score", 0), reverse=True)

    with open(OUTPUT, "w") as f:
        json.dump(films, f, indent=2)

    print(f"\nDone. {len(films)} horror films saved to {OUTPUT}")

    niche_breakdown = {s: sum(1 for f in films if f.get("niche_score") == s) for s in range(1, 11)}
    print("Niche score breakdown:", {k: v for k, v in niche_breakdown.items() if v})

    # Clean up checkpoints on successful completion
    for checkpoint in [CHECKPOINT_IDS, CHECKPOINT_DONE, CHECKPOINT_PARTIAL]:
        if checkpoint.exists():
            checkpoint.unlink()
    print("Checkpoints cleaned up.")


if __name__ == "__main__":
    main()
