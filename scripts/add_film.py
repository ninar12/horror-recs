"""
Add one or more specific films to ReelScream by TMDb ID or title search.

Usage:
    # By TMDb ID (most reliable):
    python scripts/add_film.py --tmdb-id 11 --tmdb-id 12345

    # By title (fuzzy search — confirms before adding):
    python scripts/add_film.py --title "Hereditary" --title "Midsommar"

    # Mix:
    python scripts/add_film.py --tmdb-id 502356 --title "The Wailing"

Each film is:
  1. Fetched from TMDb (metadata, poster, cast, keywords)
  2. Fetched from OMDb for RT score (if OMDB_API_KEY set)
  3. Letterboxd scraped for lb_rating
  4. Consensus score computed
  5. Niche score estimated from popularity
  6. Appended to data/raw_films.json (skipped if already present)
  7. Upserted to Pinecone immediately
"""

import argparse
import json
import os
import re
import time
import uuid
from pathlib import Path

import httpx
from dotenv import load_dotenv
from pinecone import Pinecone

load_dotenv()

TMDB_TOKEN  = os.environ["TMDB_READ_TOKEN"]
TMDB_BASE   = "https://api.themoviedb.org/3"
TMDB_IMAGE  = "https://image.tmdb.org/t/p/w500"
TMDB_HEADERS = {"Authorization": f"Bearer {TMDB_TOKEN}", "accept": "application/json"}

OMDB_API_KEY = os.environ.get("OMDB_API_KEY", "")
DATA_PATH   = Path(__file__).resolve().parent.parent / "data" / "raw_films.json"

W_IMDB, W_RT, W_LB = 0.30, 0.35, 0.35

# Percentile thresholds from the existing dataset (popularity → niche score 1-10)
_THRESHOLDS = [0.684, 0.821, 0.951, 1.070, 1.208, 1.376, 1.612, 2.072, 3.351]


def tmdb_get(path: str, params: dict = {}) -> dict:
    r = httpx.get(f"{TMDB_BASE}{path}", params=params, headers=TMDB_HEADERS, timeout=10)
    r.raise_for_status()
    return r.json()


def niche_score_from_popularity(popularity: float) -> int:
    for i, threshold in enumerate(_THRESHOLDS):
        if popularity <= threshold:
            return 10 - i
    return 1


def fetch_tmdb_film(tmdb_id: int) -> dict | None:
    """Fetch full film metadata from TMDb by ID."""
    try:
        detail = tmdb_get(f"/movie/{tmdb_id}", {"append_to_response": "credits,keywords,external_ids,watch/providers"})
    except Exception as e:
        print(f"  [TMDb] Error fetching {tmdb_id}: {e}")
        return None

    title = detail.get("title", "")
    year_raw = detail.get("release_date", "")
    year = int(year_raw[:4]) if year_raw and len(year_raw) >= 4 else None

    # Genres
    genres = [g["name"] for g in detail.get("genres", [])]

    # Keywords
    kw_data = detail.get("keywords", {}).get("keywords", [])
    keywords = [k["name"] for k in kw_data]

    # Cast/crew
    credits = detail.get("credits", {})
    cast = [c["name"] for c in credits.get("cast", [])[:8]]
    directors = [c["name"] for c in credits.get("crew", []) if c.get("job") == "Director"]
    director = directors[0] if directors else ""

    # Poster
    poster_path = detail.get("poster_path", "")

    # IMDb ID from external_ids
    imdb_id = detail.get("external_ids", {}).get("imdb_id", "")

    # Streaming (JustWatch via TMDb watch/providers — US only)
    wp = detail.get("watch/providers", {}).get("results", {}).get("US", {})
    flatrate = [p["provider_name"] for p in wp.get("flatrate", [])]
    rental = [p["provider_name"] for p in wp.get("rent", [])]

    film = {
        "tmdb_id": tmdb_id,
        "title": title,
        "year": year,
        "director": director,
        "cast": cast,
        "genres": genres,
        "keywords": keywords,
        "themes": [],
        "atmosphere": "",
        "synopsis": detail.get("overview", ""),
        "imdb_rating": detail.get("vote_average") or None,
        "imdb_id": imdb_id,
        "runtime_minutes": detail.get("runtime"),
        "niche_score": niche_score_from_popularity(detail.get("popularity", 5.0)),
        "is_horror": any(g["id"] == 27 for g in detail.get("genres", [])),
        "vote_count": detail.get("vote_count", 0),
        "popularity": detail.get("popularity", 0),
        "original_language": detail.get("original_language", "en"),
        "poster_path": poster_path,
        "streaming_platforms": flatrate,
        "rental_platforms": rental,
        "rt_score": None,
        "lb_rating": None,
        "consensus_score": None,
    }
    return film


def search_tmdb(title: str) -> list[dict]:
    """Return top TMDb search results for a title."""
    results = tmdb_get("/search/movie", {"query": title, "with_genres": "27"})
    return results.get("results", [])[:5]


def fetch_omdb_rt(film: dict) -> dict:
    """Fetch RT score from OMDb."""
    if not OMDB_API_KEY:
        return film
    params = {"apikey": OMDB_API_KEY, "tomatoes": "true"}
    if film.get("imdb_id"):
        params["i"] = film["imdb_id"]
    elif film.get("title") and film.get("year"):
        params["t"] = film["title"]
        params["y"] = film["year"]
    else:
        return film
    try:
        r = httpx.get("https://www.omdbapi.com/", params=params, timeout=10)
        data = r.json()
        if data.get("Response") == "True":
            for rating in data.get("Ratings", []):
                if rating["Source"] == "Rotten Tomatoes":
                    film["rt_score"] = int(rating["Value"].replace("%", ""))
                    break
    except Exception:
        pass
    return film


_LB_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
}

def _lb_slug(title: str) -> str:
    slug = title.lower()
    slug = re.sub(r"[''`]", "", slug)
    slug = re.sub(r"[^a-z0-9\s-]", " ", slug)
    slug = re.sub(r"\s+", "-", slug.strip())
    return re.sub(r"-+", "-", slug)


def fetch_letterboxd(film: dict) -> dict:
    slug = _lb_slug(film.get("title", ""))
    for candidate in [slug, f"{slug}-{film.get('year', '')}"] if film.get("year") else [slug]:
        try:
            r = httpx.get(f"https://letterboxd.com/film/{candidate}/", headers=_LB_HEADERS, timeout=12, follow_redirects=True)
            if r.status_code != 200:
                continue
            m = re.search(r'"aggregateRating"\s*:\s*\{[^}]*"ratingValue"\s*:\s*([\d.]+)', r.text)
            if not m:
                m = re.search(r'<meta name="twitter:data1" content="([\d.]+)"', r.text)
            if m:
                film["lb_rating"] = round(float(m.group(1)), 2)
                return film
        except Exception:
            pass
    return film


def compute_consensus(film: dict) -> dict:
    sources = []
    if film.get("imdb_rating"):
        sources.append((float(film["imdb_rating"]), W_IMDB))
    if film.get("rt_score") is not None:
        sources.append((float(film["rt_score"]) / 10.0, W_RT))
    if film.get("lb_rating"):
        sources.append((float(film["lb_rating"]) * 2.0, W_LB))
    if sources:
        total_w = sum(w for _, w in sources)
        film["consensus_score"] = round(sum(v * w for v, w in sources) / total_w, 2)
    return film


def build_film_document(film: dict) -> str:
    parts = [
        f"Title: {film.get('title', '')}",
        f"Year: {film.get('year', '')}",
        f"Director: {film.get('director', '')}",
        f"Genres: {', '.join(film.get('genres', []))}",
        f"Keywords: {', '.join(film.get('keywords', []))}",
        f"Themes: {', '.join(film.get('themes', []))}",
        f"Atmosphere: {film.get('atmosphere', '')}",
        f"Synopsis: {film.get('synopsis', '')}",
        f"Cast: {', '.join(film.get('cast', [])[:5])}",
        f"Niche score: {film.get('niche_score', '')} out of 10",
    ]
    return "\n".join(p for p in parts if not p.endswith(": "))


def upsert_to_pinecone(film: dict) -> bool:
    try:
        pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
        idx = pc.Index(os.environ.get("PINECONE_INDEX_NAME", "horror-recs"))
        film_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{film['title']}-{film['year']}"))
        record = {
            "_id": film_id,
            "text": build_film_document(film),
            "title": film.get("title", ""),
            "year": film.get("year") or 0,
            "director": film.get("director", ""),
            "genres": film.get("genres", []),
            "keywords": film.get("keywords", []),
            "themes": film.get("themes", []),
            "atmosphere": film.get("atmosphere", ""),
            "synopsis": (film.get("synopsis", ""))[:1000],
            "imdb_rating": film.get("imdb_rating") or 0.0,
            "vote_count": film.get("vote_count") or 0,
            "popularity": film.get("popularity") or 0.0,
            "original_language": film.get("original_language", "en"),
            "niche_score": film.get("niche_score") or 5,
            "streaming_platforms": film.get("streaming_platforms", []),
            "rental_platforms": film.get("rental_platforms", []),
            "rt_score": film.get("rt_score"),
            "lb_rating": film.get("lb_rating"),
            "consensus_score": film.get("consensus_score"),
        }
        idx.upsert_records(namespace="__default__", records=[record])
        return True
    except Exception as e:
        print(f"  [Pinecone] Error: {e}")
        return False


def add_film(film: dict, existing_ids: set) -> bool:
    """Enrich, add to raw_films.json, and upsert to Pinecone. Returns True if added."""
    title_year = f"{film['title']} ({film['year']})"

    if film.get("tmdb_id") in existing_ids:
        print(f"  SKIP — {title_year} already in dataset")
        return False

    # Enrich
    print(f"  Fetching RT score via OMDb...")
    film = fetch_omdb_rt(film)
    time.sleep(0.15)

    print(f"  Scraping Letterboxd...")
    film = fetch_letterboxd(film)
    time.sleep(0.35)

    film = compute_consensus(film)

    # Append to raw_films.json
    with open(DATA_PATH) as f:
        films = json.load(f)
    films.append(film)
    with open(DATA_PATH, "w") as f:
        json.dump(films, f, indent=2)

    # Upsert to Pinecone
    print(f"  Upserting to Pinecone...")
    ok = upsert_to_pinecone(film)

    status = "✓ Added" if ok else "✓ Added to JSON (Pinecone failed)"
    ratings = []
    if film.get("imdb_rating"): ratings.append(f"IMDb {film['imdb_rating']}")
    if film.get("rt_score") is not None: ratings.append(f"RT {film['rt_score']}%")
    if film.get("lb_rating"): ratings.append(f"LB {film['lb_rating']}")
    print(f"  {status} — {title_year} | niche {film['niche_score']}/10 | {' · '.join(ratings) or 'no ratings'}")
    return True


def main():
    parser = argparse.ArgumentParser(description="Add films to ReelScream by TMDb ID or title")
    parser.add_argument("--tmdb-id", type=int, action="append", dest="tmdb_ids", default=[], metavar="ID",
                        help="TMDb movie ID (can repeat)")
    parser.add_argument("--title", action="append", dest="titles", default=[], metavar="TITLE",
                        help="Film title to search TMDb (can repeat)")
    args = parser.parse_args()

    if not args.tmdb_ids and not args.titles:
        parser.print_help()
        return

    with open(DATA_PATH) as f:
        existing = json.load(f)
    existing_ids = {f.get("tmdb_id") for f in existing}
    print(f"Existing dataset: {len(existing)} films\n")

    # Resolve title searches to TMDb IDs
    tmdb_ids = list(args.tmdb_ids)
    for title in args.titles:
        print(f"Searching TMDb for: {title!r}")
        results = search_tmdb(title)
        if not results:
            print(f"  No results found for {title!r}")
            continue
        # Show top matches and confirm
        for i, r in enumerate(results[:3]):
            yr = r.get("release_date", "")[:4]
            print(f"  [{i+1}] {r.get('title')} ({yr}) — TMDb ID {r['id']}")
        choice = input("  Pick [1-3] or Enter to skip: ").strip()
        if choice in ("1", "2", "3"):
            tmdb_ids.append(results[int(choice) - 1]["id"])
        else:
            print("  Skipped.")

    if not tmdb_ids:
        print("Nothing to add.")
        return

    added = 0
    for tid in tmdb_ids:
        print(f"\nFetching TMDb ID {tid}...")
        film = fetch_tmdb_film(tid)
        if not film:
            continue
        print(f"  Found: {film['title']} ({film['year']})")
        if add_film(film, existing_ids):
            existing_ids.add(tid)
            added += 1

    print(f"\nDone — {added} film(s) added.")


if __name__ == "__main__":
    main()
