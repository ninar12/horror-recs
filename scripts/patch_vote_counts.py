"""
Patch missing vote_count, vote_average, and original_language for existing films.
Faster than a full re-scrape — hits TMDb in parallel, saves every 500 films.
Run: python scripts/patch_vote_counts.py
"""
import json
import os
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv()

TMDB_TOKEN = os.environ["TMDB_READ_TOKEN"]
TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_HEADERS = {"Authorization": f"Bearer {TMDB_TOKEN}", "accept": "application/json"}


_POPULARITY_THRESHOLDS = [0.684, 0.821, 0.951, 1.070, 1.208, 1.376, 1.612, 2.072, 3.351]


def compute_niche_score(popularity, vote_count, vote_average=0.0, year=None, original_language="en"):
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


def fetch_vote_data(film: dict) -> dict:
    try:
        r = httpx.get(
            f"{TMDB_BASE}/movie/{film['tmdb_id']}",
            headers=TMDB_HEADERS,
            timeout=10,
        )
        r.raise_for_status()
        d = r.json()
        film["vote_count"] = d.get("vote_count") or 0
        film["imdb_rating"] = d.get("vote_average") or 0.0
        film["popularity"] = d.get("popularity") or 0.0
        film["original_language"] = d.get("original_language", "en")
        film["niche_score"] = compute_niche_score(
            film["popularity"],
            film["vote_count"],
            film["imdb_rating"],
            film.get("year"),
            film["original_language"],
        )
    except Exception as e:
        print(f"  Failed {film.get('title')}: {e}")
    return film


def main():
    with open("data/raw_films.json") as f:
        films = json.load(f)

    # Patch films missing vote_count OR popularity (needed for new niche score formula)
    needs_patch = [f for f in films if not f.get("vote_count") or not f.get("popularity")]
    already_ok  = [f for f in films if f.get("vote_count") and f.get("popularity")]

    print(f"Films needing patch: {len(needs_patch)} / {len(films)}")
    if not needs_patch:
        print("All films already have vote_count — nothing to do.")
        return

    patched = []
    with ThreadPoolExecutor(max_workers=15) as pool:
        futures = {pool.submit(fetch_vote_data, f): f for f in needs_patch}
        for i, future in enumerate(as_completed(futures)):
            patched.append(future.result())
            if (i + 1) % 500 == 0:
                # Save progress every 500
                all_films = already_ok + patched
                with open("data/raw_films.json", "w") as f:
                    json.dump(all_films, f, indent=2)
                print(f"  {i+1}/{len(needs_patch)} patched — checkpoint saved")
            time.sleep(0.02)

    all_films = already_ok + patched
    all_films.sort(key=lambda f: f.get("niche_score", 0), reverse=True)

    with open("data/raw_films.json", "w") as f:
        json.dump(all_films, f, indent=2)

    scores = Counter(f["niche_score"] for f in all_films)
    print(f"\nDone. {len(patched)} films patched.")
    print("Niche score breakdown:", dict(sorted(scores.items())))


if __name__ == "__main__":
    main()
