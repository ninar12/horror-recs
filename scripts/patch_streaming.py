"""
Patch streaming_platforms and rental_platforms into raw_films.json + Pinecone.
Uses TMDb watch/providers endpoint (JustWatch data, US region).

Run:
    python scripts/patch_streaming.py

Resumable — skips films that already have streaming_platforms populated.
Checkpoint saved to data/streaming_done.json every 200 films.
~15 min for 9,536 films at 10 workers.
"""
import json
import os
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import httpx
from dotenv import load_dotenv
from pinecone import Pinecone

load_dotenv()

TMDB_TOKEN   = os.environ["TMDB_READ_TOKEN"]
TMDB_BASE    = "https://api.themoviedb.org/3"
TMDB_HEADERS = {"Authorization": f"Bearer {TMDB_TOKEN}", "accept": "application/json"}

DATA_PATH    = Path(__file__).resolve().parent.parent / "data" / "raw_films.json"
CHECKPOINT   = Path(__file__).resolve().parent.parent / "data" / "streaming_done.json"
WORKERS      = 10
SLEEP        = 0.05   # TMDb allows ~40 req/s on free tier
SAVE_EVERY   = 200


def fetch_providers(tmdb_id: int) -> tuple[list, list]:
    """Return (flatrate, rental) provider name lists for US region."""
    try:
        r = httpx.get(
            f"{TMDB_BASE}/movie/{tmdb_id}/watch/providers",
            headers=TMDB_HEADERS, timeout=10,
        )
        r.raise_for_status()
        us = r.json().get("results", {}).get("US", {})
        flatrate = [p["provider_name"] for p in us.get("flatrate", [])]
        rental   = [p["provider_name"] for p in us.get("rent", [])]
        return flatrate, rental
    except Exception:
        return [], []


def main():
    with open(DATA_PATH) as f:
        films: list[dict] = json.load(f)

    done_ids: set = set(json.loads(CHECKPOINT.read_text())) if CHECKPOINT.exists() else set()
    needs = [f for f in films if f.get("tmdb_id") and f.get("tmdb_id") not in done_ids
             and not f.get("streaming_platforms")]
    print(f"Total films: {len(films)} | Need streaming: {len(needs)} | Already done: {len(done_ids)}")

    results: dict[int, tuple] = {}

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futs = {pool.submit(fetch_providers, f["tmdb_id"]): f["tmdb_id"] for f in needs}
        for i, fut in enumerate(as_completed(futs)):
            tid = futs[fut]
            flatrate, rental = fut.result()
            results[tid] = (flatrate, rental)
            done_ids.add(tid)
            time.sleep(SLEEP)

            if (i + 1) % SAVE_EVERY == 0:
                # Patch and save checkpoint
                _apply_and_save(films, results, done_ids, DATA_PATH, CHECKPOINT)
                print(f"  {i+1}/{len(needs)} — checkpoint saved")

    _apply_and_save(films, results, done_ids, DATA_PATH, CHECKPOINT)

    has_stream = sum(1 for f in films if f.get("streaming_platforms"))
    print(f"streaming_platforms populated: {has_stream}/{len(films)}")

    # Push to Pinecone
    print("Pushing to Pinecone...")
    pc  = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    idx = pc.Index(os.environ.get("PINECONE_INDEX_NAME", "horror-recs"))
    pushed = 0
    for film in films:
        sp = film.get("streaming_platforms")
        rp = film.get("rental_platforms")
        if sp is None and rp is None:
            continue
        film_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{film['title']}-{film['year']}"))
        try:
            idx.update(id=film_id, set_metadata={
                "streaming_platforms": sp or [],
                "rental_platforms": rp or [],
            }, namespace="__default__")
            pushed += 1
        except Exception:
            pass
        if pushed % 500 == 0 and pushed:
            print(f"  Pinecone: {pushed} pushed")
            time.sleep(0.3)

    print(f"Done — {pushed} Pinecone records updated.")


def _apply_and_save(films, results, done_ids, data_path, checkpoint):
    for film in films:
        tid = film.get("tmdb_id")
        if tid in results:
            flatrate, rental = results[tid]
            film["streaming_platforms"] = flatrate
            film["rental_platforms"]    = rental
    with open(data_path, "w") as f:
        json.dump(films, f, indent=2)
    checkpoint.write_text(json.dumps(list(done_ids)))


if __name__ == "__main__":
    main()
