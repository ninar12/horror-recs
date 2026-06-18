"""
Patch imdb_id into raw_films.json from TMDb external_ids endpoint.

Why: patch_ratings.py fetches RT scores via OMDb. When imdb_id is missing it
falls back to title+year search which misses many films. Having imdb_id gives
OMDb a direct lookup and dramatically improves RT score hit rate.

Run:
    python scripts/patch_imdb_ids.py

Resumable — skips films that already have imdb_id.
Checkpoint saved every 200 films to data/imdb_ids_done.json.
~8 min for 9,536 films at 10 workers.
No Pinecone update needed — imdb_id is not stored in Pinecone.
"""
import json
import os
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv()

TMDB_TOKEN   = os.environ["TMDB_READ_TOKEN"]
TMDB_BASE    = "https://api.themoviedb.org/3"
TMDB_HEADERS = {"Authorization": f"Bearer {TMDB_TOKEN}", "accept": "application/json"}

DATA_PATH    = Path(__file__).resolve().parent.parent / "data" / "raw_films.json"
CHECKPOINT   = Path(__file__).resolve().parent.parent / "data" / "imdb_ids_done.json"
WORKERS      = 10
SLEEP        = 0.04
SAVE_EVERY   = 200


def fetch_imdb_id(tmdb_id: int) -> str | None:
    try:
        r = httpx.get(
            f"{TMDB_BASE}/movie/{tmdb_id}/external_ids",
            headers=TMDB_HEADERS, timeout=10,
        )
        r.raise_for_status()
        return r.json().get("imdb_id") or None
    except Exception:
        return None


def main():
    with open(DATA_PATH) as f:
        films: list[dict] = json.load(f)

    done_ids: set = set(json.loads(CHECKPOINT.read_text())) if CHECKPOINT.exists() else set()
    needs = [f for f in films if f.get("tmdb_id") and not f.get("imdb_id")
             and f.get("tmdb_id") not in done_ids]

    print(f"Total films: {len(films)} | Need IMDb ID: {len(needs)} | Already done: {len(done_ids)}")

    results: dict[int, str] = {}

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futs = {pool.submit(fetch_imdb_id, f["tmdb_id"]): f["tmdb_id"] for f in needs}
        for i, fut in enumerate(as_completed(futs)):
            tid = futs[fut]
            imdb_id = fut.result()
            if imdb_id:
                results[tid] = imdb_id
            done_ids.add(tid)
            time.sleep(SLEEP)

            if (i + 1) % SAVE_EVERY == 0:
                _apply_and_save(films, results, done_ids, DATA_PATH, CHECKPOINT)
                found = sum(1 for f in films if f.get("imdb_id"))
                print(f"  {i+1}/{len(needs)} — {found} IMDb IDs patched so far")

    _apply_and_save(films, results, done_ids, DATA_PATH, CHECKPOINT)
    found = sum(1 for f in films if f.get("imdb_id"))
    print(f"Done — imdb_id populated: {found}/{len(films)}")


def _apply_and_save(films, results, done_ids, data_path, checkpoint):
    for film in films:
        tid = film.get("tmdb_id")
        if tid in results:
            film["imdb_id"] = results[tid]
    with open(data_path, "w") as f:
        json.dump(films, f, indent=2)
    checkpoint.write_text(json.dumps(list(done_ids)))


if __name__ == "__main__":
    main()
