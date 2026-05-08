"""
Enrich raw_films.json with Rotten Tomatoes, Letterboxd, and a consensus score.

Sources:
  - IMDb rating        — already in the data (imdb_rating, 0-10)
  - Rotten Tomatoes    — via OMDb API (free tier: 1 000 req/day, $1/mo for 100k)
                         Returns Tomatometer % stored as rt_score (0-100)
  - Letterboxd         — scraped directly from letterboxd.com/film/{slug}/
                         Returns average rating stored as lb_rating (0-5)

Consensus score (0-10):
  Normalise each source to 0-10, then weighted average of whatever sources exist.
  Default weights: IMDb 30 %, Rotten Tomatoes 35 %, Letterboxd 35 %

Run:
    python scripts/patch_ratings.py

Env vars required:
    OMDB_API_KEY   — from omdbapi.com (free tier is enough for most libraries)

Optional flags (edit constants below):
    OMDB_LIMIT      — max films to hit OMDb for in a single run (rate-limit safety)
    LB_LIMIT        — max films to scrape Letterboxd for in a single run
    WORKERS         — parallel threads
"""

import json
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv()

OMDB_API_KEY = os.environ.get("OMDB_API_KEY", "")
DATA_PATH    = Path(__file__).resolve().parent.parent / "data" / "raw_films.json"

OMDB_LIMIT  = 5_000   # set lower if on free tier (1000/day)
LB_LIMIT    = 10_000
WORKERS     = 10
SLEEP_OMDB  = 0.05    # ~20 req/s, well within OMDb limits
SLEEP_LB    = 0.15    # be polite to Letterboxd

# ── Weights (must sum to 1.0) ────────────────────────────────────────────────
W_IMDB = 0.30
W_RT   = 0.35
W_LB   = 0.35


# ── OMDb ─────────────────────────────────────────────────────────────────────

def fetch_omdb(film: dict) -> dict:
    """Add rt_score (0-100 int or None) via OMDb using imdb_id or title+year."""
    if not OMDB_API_KEY:
        return film

    imdb_id = film.get("imdb_id") or film.get("tmdb_imdb_id")
    params  = {"apikey": OMDB_API_KEY, "tomatoes": "true"}

    if imdb_id:
        params["i"] = imdb_id
    elif film.get("title") and film.get("year"):
        params["t"] = film["title"]
        params["y"] = int(film["year"])
    else:
        return film

    try:
        r = httpx.get("https://www.omdbapi.com/", params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        if data.get("Response") == "True":
            for rating in data.get("Ratings", []):
                if rating["Source"] == "Rotten Tomatoes":
                    val = rating["Value"].replace("%", "").strip()
                    film["rt_score"] = int(val)
                    break
    except Exception:
        pass

    time.sleep(SLEEP_OMDB)
    return film


# ── Letterboxd ───────────────────────────────────────────────────────────────

_LB_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def _lb_slug(title: str, year) -> str:
    """Best-guess Letterboxd slug: lowercase, hyphens, no special chars."""
    slug = title.lower()
    slug = re.sub(r"[''`]", "", slug)          # remove apostrophes
    slug = re.sub(r"[^a-z0-9\s-]", " ", slug)  # strip special chars
    slug = re.sub(r"\s+", "-", slug.strip())    # spaces → hyphens
    slug = re.sub(r"-+", "-", slug)             # collapse double hyphens
    return slug


def _scrape_lb_rating(slug: str) -> float | None:
    """Return Letterboxd average rating (0-5) for a film slug, or None."""
    url = f"https://letterboxd.com/film/{slug}/"
    try:
        r = httpx.get(url, headers=_LB_HEADERS, timeout=12, follow_redirects=True)
        if r.status_code != 200:
            return None
        html = r.text

        # JSON-LD aggregate rating is the most reliable source
        ld_match = re.search(
            r'"aggregateRating"\s*:\s*\{[^}]*"ratingValue"\s*:\s*([\d.]+)', html
        )
        if ld_match:
            return float(ld_match.group(1))

        # Fallback: twitter card data attribute
        tw_match = re.search(
            r'<meta name="twitter:data1" content="([\d.]+)"', html
        )
        if tw_match:
            return float(tw_match.group(1))

    except Exception:
        pass
    return None


def fetch_letterboxd(film: dict) -> dict:
    """Add lb_rating (0-5 float or None) by scraping Letterboxd."""
    slug = _lb_slug(film.get("title", ""), film.get("year"))
    if not slug:
        return film

    rating = _scrape_lb_rating(slug)

    # If the slug guess 404s, try adding the year (common Letterboxd pattern)
    if rating is None and film.get("year"):
        rating = _scrape_lb_rating(f"{slug}-{int(film['year'])}")

    if rating is not None:
        film["lb_rating"] = round(rating, 2)

    time.sleep(SLEEP_LB)
    return film


# ── Consensus score ───────────────────────────────────────────────────────────

def compute_consensus(film: dict) -> dict:
    """
    Weighted average of available ratings, all normalised to 0-10.
    Missing sources are dropped and weights re-normalised.
    """
    sources: list[tuple[float, float]] = []  # (value_0_10, weight)

    if film.get("imdb_rating") not in (None, 0, ""):
        sources.append((float(film["imdb_rating"]), W_IMDB))

    if film.get("rt_score") not in (None, ""):
        sources.append((float(film["rt_score"]) / 10.0, W_RT))

    if film.get("lb_rating") not in (None, ""):
        sources.append((float(film["lb_rating"]) * 2.0, W_LB))

    if not sources:
        return film

    total_weight = sum(w for _, w in sources)
    score = sum(v * w for v, w in sources) / total_weight
    film["consensus_score"] = round(score, 2)
    return film


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    with open(DATA_PATH) as f:
        films: list[dict] = json.load(f)

    print(f"Total films: {len(films)}")

    # ── Pass 1: OMDb (Rotten Tomatoes) ───────────────────────────────────────
    if OMDB_API_KEY:
        needs_rt = [f for f in films if f.get("rt_score") is None][:OMDB_LIMIT]
        print(f"Fetching RT scores for {len(needs_rt)} films via OMDb …")
        done: dict[str, dict] = {}
        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            futs = {pool.submit(fetch_omdb, f): f for f in needs_rt}
            for i, fut in enumerate(as_completed(futs)):
                result = fut.result()
                done[result.get("tmdb_id") or result["title"]] = result
                if (i + 1) % 500 == 0:
                    print(f"  OMDb {i+1}/{len(needs_rt)} done")
        # merge back
        key = lambda f: f.get("tmdb_id") or f["title"]
        films = [done.get(key(f), f) for f in films]
        rt_found = sum(1 for f in films if f.get("rt_score") is not None)
        print(f"  RT scores present: {rt_found}/{len(films)}")
    else:
        print("OMDB_API_KEY not set — skipping Rotten Tomatoes pass.")
        print("Get a free key at https://www.omdbapi.com/apikey.aspx")

    # ── Pass 2: Letterboxd ────────────────────────────────────────────────────
    needs_lb = [f for f in films if f.get("lb_rating") is None][:LB_LIMIT]
    print(f"Scraping Letterboxd ratings for {len(needs_lb)} films …")
    done2: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futs2 = {pool.submit(fetch_letterboxd, f): f for f in needs_lb}
        for i, fut in enumerate(as_completed(futs2)):
            result = fut.result()
            done2[result.get("tmdb_id") or result["title"]] = result
            if (i + 1) % 500 == 0:
                print(f"  Letterboxd {i+1}/{len(needs_lb)} done")
    key = lambda f: f.get("tmdb_id") or f["title"]
    films = [done2.get(key(f), f) for f in films]
    lb_found = sum(1 for f in films if f.get("lb_rating") is not None)
    print(f"  Letterboxd ratings present: {lb_found}/{len(films)}")

    # ── Pass 3: (re-)compute consensus for all films ──────────────────────────
    films = [compute_consensus(f) for f in films]
    consensus_found = sum(1 for f in films if f.get("consensus_score") is not None)
    print(f"  Consensus scores computed: {consensus_found}/{len(films)}")

    # ── Save ──────────────────────────────────────────────────────────────────
    with open(DATA_PATH, "w") as f:
        json.dump(films, f, indent=2)
    print("Done — raw_films.json updated.")
    print("Next step: re-run embed_and_index.py to push new fields to Pinecone.")


if __name__ == "__main__":
    main()
