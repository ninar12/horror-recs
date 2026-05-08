"""
Patch raw_films.json with poster_path from TMDb.
Run: python scripts/patch_posters.py
"""
import json, os, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import httpx
from dotenv import load_dotenv
load_dotenv()

TMDB_TOKEN = os.environ["TMDB_READ_TOKEN"]
TMDB_HEADERS = {"Authorization": f"Bearer {TMDB_TOKEN}", "accept": "application/json"}

def fetch_poster(film: dict) -> dict:
    try:
        r = httpx.get(
            f"https://api.themoviedb.org/3/movie/{film['tmdb_id']}",
            headers=TMDB_HEADERS,
            timeout=10,
        )
        r.raise_for_status()
        film["poster_path"] = r.json().get("poster_path", "")
    except Exception:
        film.setdefault("poster_path", "")
    return film

def main():
    with open("data/raw_films.json") as f:
        films = json.load(f)

    needs_patch = [f for f in films if not f.get("poster_path")]
    already_ok  = [f for f in films if f.get("poster_path")]
    print(f"Patching {len(needs_patch)} films with poster paths...")

    patched = []
    with ThreadPoolExecutor(max_workers=15) as pool:
        futures = {pool.submit(fetch_poster, f): f for f in needs_patch}
        for i, future in enumerate(as_completed(futures)):
            patched.append(future.result())
            if (i + 1) % 500 == 0:
                print(f"  {i+1}/{len(needs_patch)} done")
            time.sleep(0.02)

    all_films = already_ok + patched
    with open("data/raw_films.json", "w") as f:
        json.dump(all_films, f, indent=2)

    found = sum(1 for f in all_films if f.get("poster_path"))
    print(f"Done. {found}/{len(all_films)} films have poster paths.")

if __name__ == "__main__":
    main()
