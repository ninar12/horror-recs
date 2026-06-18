"""
Generate atmosphere descriptions for all films in raw_films.json using Gemini.

Atmosphere is a 1-sentence evocation of a film's mood, dread quality, and visual
texture — e.g. "Grimy 70s paranoia drenched in rural isolation and creeping dread."
It's included in the Pinecone text document, so populating it improves search quality
for vibe-based queries.

Run:
    python scripts/patch_atmosphere.py

Resumable — skips films that already have atmosphere set.
Batches 25 films per Gemini call to minimise cost (~$0.20 total for 9,536 films).
Checkpoint saved to data/atmosphere_done.json every 5 batches.

Estimated time: ~15 min (10 parallel Gemini calls × ~40s each)
Estimated cost: ~$0.20 (Gemini 2.5 Flash Lite)
"""
import json
import os
import re
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from dotenv import load_dotenv
from google import genai

load_dotenv()

DATA_PATH  = Path(__file__).resolve().parent.parent / "data" / "raw_films.json"
CHECKPOINT = Path(__file__).resolve().parent.parent / "data" / "atmosphere_done.json"

BATCH_SIZE   = 25    # films per Gemini call
WORKERS      = 8     # parallel Gemini calls
SAVE_EVERY   = 5     # save checkpoint every N batches
MODEL        = "gemini-2.5-flash-lite"


def get_client():
    return genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def build_prompt(batch: list[dict]) -> str:
    lines = []
    for i, f in enumerate(batch):
        synopsis  = (f.get("synopsis") or "")[:300]
        genres    = ", ".join(f.get("genres") or [])
        keywords  = ", ".join((f.get("keywords") or [])[:12])
        lines.append(f'{i+1}. "{f["title"]}" ({f.get("year","")})\n'
                     f'   Genres: {genres}\n'
                     f'   Keywords: {keywords}\n'
                     f'   Synopsis: {synopsis}')

    return f"""You are a horror film expert writing brief atmosphere tags for a film database.

For each film below, write ONE sentence (12-20 words) describing its atmosphere, mood, and dread quality.
Focus on: visual texture, emotional tone, pacing, and the specific flavour of horror.
Be evocative and specific — not generic. Avoid starting every line the same way.

Films:
{chr(10).join(lines)}

Return ONLY a JSON array of {len(batch)} strings, one per film, in the same order.
Example format: ["Greasy 70s paranoia in a rotting small town.", "Clinical slow-burn dread with a suffocating domestic tension."]
No markdown, no numbering, just the JSON array."""


def _call_gemini(client, prompt: str) -> str | None:
    """Single Gemini call, returns text or None."""
    try:
        resp = client.models.generate_content(model=MODEL, contents=prompt)
        if resp.text:
            return resp.text.strip()
    except Exception:
        pass
    return None


def _parse_list(text: str, expected: int) -> list[str] | None:
    text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s*```\s*$', '', text, flags=re.MULTILINE).strip()
    try:
        result = json.loads(text)
        if isinstance(result, list):
            padded = (result + [""] * expected)[:expected]
            return [str(s).strip() for s in padded]
    except Exception:
        pass
    return None


def generate_batch(client, batch: list[dict]) -> list[str]:
    """Try batch first; fall back to one-at-a-time for safety-filtered films."""
    # Attempt full batch
    for attempt in range(2):
        text = _call_gemini(client, build_prompt(batch))
        if text:
            result = _parse_list(text, len(batch))
            if result:
                return result
        if attempt == 0:
            time.sleep(1)

    # Batch failed — retry each film individually
    results = []
    for film in batch:
        single_prompt = (
            f'Write ONE sentence (12-20 words) describing the horror atmosphere, mood, and dread quality of:\n'
            f'"{film.get("title","")}" ({film.get("year","")})\n'
            f'Genres: {", ".join(film.get("genres") or [])}\n'
            f'Synopsis: {(film.get("synopsis") or "")[:200]}\n\n'
            f'Return only the sentence, no quotes, no explanation.'
        )
        text = _call_gemini(client, single_prompt)
        results.append(text.strip() if text else "")
        time.sleep(0.5)
    return results


def main():
    with open(DATA_PATH) as f:
        films: list[dict] = json.load(f)

    done_ids: set = set(json.loads(CHECKPOINT.read_text())) if CHECKPOINT.exists() else set()
    needs = [f for f in films if not f.get("atmosphere") and f.get("tmdb_id") not in done_ids]

    print(f"Total: {len(films)} | Need atmosphere: {len(needs)} | Done: {len(done_ids)}")
    print(f"Batches: {(len(needs) + BATCH_SIZE - 1) // BATCH_SIZE} × {BATCH_SIZE} films")
    print(f"Estimated cost: ~${len(needs) * 0.000022:.2f}\n")

    # Build batches
    batches = [needs[i:i + BATCH_SIZE] for i in range(0, len(needs), BATCH_SIZE)]

    client = get_client()
    # Build a fast index: tmdb_id → film dict
    film_index = {f.get("tmdb_id"): f for f in films}
    total_done = 0

    def process_batch(batch):
        atmospheres = generate_batch(client, batch)
        return batch, atmospheres

    batch_count = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futs = {pool.submit(process_batch, b): i for i, b in enumerate(batches)}
        for fut in as_completed(futs):
            batch, atmospheres = fut.result()
            for film, atm in zip(batch, atmospheres):
                tid = film.get("tmdb_id")
                if atm:
                    film_index[tid]["atmosphere"] = atm
                    done_ids.add(tid)
            total_done += len(batch)
            batch_count += 1

            if batch_count % SAVE_EVERY == 0:
                _save(films, done_ids, DATA_PATH, CHECKPOINT)
                has = sum(1 for f in films if f.get("atmosphere"))
                print(f"  {total_done}/{len(needs)} films — {has} atmosphere tags saved")

    _save(films, done_ids, DATA_PATH, CHECKPOINT)
    has = sum(1 for f in films if f.get("atmosphere"))
    print(f"\nAtmosphere populated: {has}/{len(films)}")

    # Push to Pinecone
    print("Pushing to Pinecone...")
    from pinecone import Pinecone
    pc  = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    idx = pc.Index(os.environ.get("PINECONE_INDEX_NAME", "horror-recs"))
    pushed = 0
    for film in films:
        atm = film.get("atmosphere")
        if not atm:
            continue
        film_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{film['title']}-{film['year']}"))
        try:
            idx.update(id=film_id, set_metadata={"atmosphere": atm}, namespace="__default__")
            pushed += 1
        except Exception:
            pass
        if pushed % 500 == 0 and pushed:
            print(f"  Pinecone: {pushed} updated")
            time.sleep(0.3)

    print(f"Done — {pushed} Pinecone records updated with atmosphere.")


def _save(films, done_ids, data_path, checkpoint):
    with open(data_path, "w") as f:
        json.dump(films, f, indent=2)
    checkpoint.write_text(json.dumps(list(done_ids)))


if __name__ == "__main__":
    main()
