"""
Update pipeline — run weekly to:
  1. Fetch horror films released/added to TMDb since last run
  2. Refresh streaming providers for all existing films (JustWatch data via TMDb)
  3. Re-embed and upsert changed films to Pinecone

Run: python scripts/update_films.py
Tracks last run date in data/last_update.json
"""
import json
import os
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

import httpx
import google.generativeai as genai
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

TMDB_TOKEN   = os.environ["TMDB_READ_TOKEN"]
TMDB_BASE    = "https://api.themoviedb.org/3"
TMDB_HEADERS = {"Authorization": f"Bearer {TMDB_TOKEN}", "accept": "application/json"}
HORROR_GENRE_ID = 27

LAST_UPDATE_FILE = Path("data/last_update.json")
RAW_FILMS_FILE   = Path("data/raw_films.json")


# ── Helpers ───────────────────────────────────────────────────────────────────

def tmdb_get(path: str, params: dict = {}) -> dict:
    r = httpx.get(f"{TMDB_BASE}{path}", params=params, headers=TMDB_HEADERS, timeout=10)
    r.raise_for_status()
    return r.json()


def load_json(path: Path, default):
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return default


def save_json(path: Path, data) -> None:
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


_POPULARITY_THRESHOLDS = [0.684, 0.821, 0.951, 1.070, 1.208, 1.376, 1.612, 2.072, 3.351]


def compute_niche_score(
    popularity: float,
    vote_count: int,
    vote_average: float = 0.0,
    year: int | None = None,
    original_language: str = "en",
) -> int:
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


# ── Fetch new films ───────────────────────────────────────────────────────────

def fetch_new_film_ids(since_date: str) -> list[int]:
    """Fetch horror films added/updated on TMDb since a given date (YYYY-MM-DD)."""
    print(f"  Fetching films with primary_release_date >= {since_date}...")
    ids = []
    page = 1
    while True:
        data = tmdb_get("/discover/movie", {
            "with_genres": HORROR_GENRE_ID,
            "primary_release_date.gte": since_date,
            "sort_by": "primary_release_date.desc",
            "page": page,
        })
        results = data.get("results", [])
        if not results:
            break
        ids.extend(m["id"] for m in results)
        if page >= data.get("total_pages", 1):
            break
        page += 1
        time.sleep(0.05)
    return list(set(ids))


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
        cast     = [c["name"] for c in detail.get("credits", {}).get("cast", [])[:6]]
        keywords = [k["name"] for k in detail.get("keywords", {}).get("keywords", [])]

        us_providers = detail.get("watch/providers", {}).get("results", {}).get("US", {})
        streaming = [p["provider_name"] for p in us_providers.get("flatrate", [])]
        rental    = [p["provider_name"] for p in us_providers.get("rent", [])]
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
        print(f"  Detail error id={movie_id}: {e}")
        return None


# ── Refresh streaming for existing films ──────────────────────────────────────

def refresh_streaming(films: list[dict]) -> tuple[list[dict], list[dict]]:
    """Re-fetch streaming providers for all existing films. Returns (updated_films, changed_films)."""
    print(f"  Refreshing streaming data for {len(films)} films...")
    changed = []

    def refresh_one(film: dict) -> dict | None:
        try:
            data = tmdb_get(f"/movie/{film['tmdb_id']}/watch/providers")
            us = data.get("results", {}).get("US", {})
            new_streaming = [p["provider_name"] for p in us.get("flatrate", [])]
            new_rental    = [p["provider_name"] for p in us.get("rent", [])]
            if new_streaming != film.get("streaming_platforms") or new_rental != film.get("rental_platforms"):
                film["streaming_platforms"] = new_streaming
                film["rental_platforms"] = new_rental
                return film
        except Exception:
            pass
        return None

    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {pool.submit(refresh_one, f): f for f in films}
        for i, future in enumerate(as_completed(futures)):
            result = future.result()
            if result:
                changed.append(result)
            if (i + 1) % 1000 == 0:
                print(f"  Checked {i+1}/{len(films)} streaming records")
            time.sleep(0.02)

    print(f"  {len(changed)} films had streaming changes")
    return films, changed


# ── Pinecone upsert ───────────────────────────────────────────────────────────

def upsert_to_pinecone(films: list[dict]) -> None:
    if not films:
        return

    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    index = pc.Index(os.environ.get("PINECONE_INDEX_NAME", "horror-films"))

    print(f"  Upserting {len(films)} films to Pinecone...")
    batch = []
    for film in films:
        film_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{film.get('title')}-{film.get('year')}"))
        doc = build_film_document(film)

        try:
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=doc,
                task_type="retrieval_document",
            )
            vector = result["embedding"]
        except Exception as e:
            print(f"  Embed failed for '{film.get('title')}': {e}")
            time.sleep(2)
            continue

        metadata = {
            "title": film.get("title", ""),
            "year": film.get("year") or 0,
            "director": film.get("director", ""),
            "genres": film.get("genres", []),
            "keywords": film.get("keywords", []),
            "themes": film.get("themes", []),
            "atmosphere": film.get("atmosphere", ""),
            "synopsis": film.get("synopsis", "")[:1000],
            "imdb_rating": film.get("imdb_rating") or 0.0,
            "vote_count": film.get("vote_count") or 0,
            "popularity": film.get("popularity") or 0.0,
            "niche_score": film.get("niche_score") or 5,
            "streaming_platforms": film.get("streaming_platforms", []),
            "rental_platforms": film.get("rental_platforms", []),
        }

        batch.append({"id": film_id, "values": vector, "metadata": metadata})
        if len(batch) >= 100:
            index.upsert(vectors=batch)
            batch = []
            time.sleep(0.5)

    if batch:
        index.upsert(vectors=batch)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    Path("data").mkdir(exist_ok=True)

    last_update = load_json(LAST_UPDATE_FILE, {})
    last_run = last_update.get("last_run", "2020-01-01")
    today = datetime.utcnow().strftime("%Y-%m-%d")
    print(f"Update pipeline — last run: {last_run} → today: {today}\n")

    existing_films: list[dict] = load_json(RAW_FILMS_FILE, [])
    existing_ids = {f["tmdb_id"] for f in existing_films}

    # Step 1: New films
    print("Step 1: Fetching new horror films...")
    new_ids = [mid for mid in fetch_new_film_ids(last_run) if mid not in existing_ids]
    print(f"  {len(new_ids)} new films to add")

    new_films = []
    if new_ids:
        with ThreadPoolExecutor(max_workers=10) as pool:
            futures = {pool.submit(fetch_film_detail, mid): mid for mid in new_ids}
            for future in as_completed(futures):
                result = future.result()
                if result and result.get("synopsis") and len(result["synopsis"]) >= 30:
                    new_films.append(result)
        print(f"  {len(new_films)} valid new films fetched")

    # Step 2: Refresh streaming on all existing films
    print("\nStep 2: Refreshing streaming providers...")
    existing_films, streaming_changed = refresh_streaming(existing_films)

    # Step 3: Upsert new + streaming-changed films to Pinecone
    to_upsert = new_films + streaming_changed
    print(f"\nStep 3: Upserting {len(to_upsert)} films to Pinecone...")
    upsert_to_pinecone(to_upsert)

    # Step 4: Save updated raw_films.json
    all_films = existing_films + new_films
    all_films.sort(key=lambda f: f.get("niche_score", 0), reverse=True)
    save_json(RAW_FILMS_FILE, all_films)

    save_json(LAST_UPDATE_FILE, {"last_run": today})
    print(f"\nDone. {len(new_films)} new films added, {len(streaming_changed)} streaming records updated.")
    print(f"Total films in database: {len(all_films)}")


if __name__ == "__main__":
    main()
