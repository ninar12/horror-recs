"""
Data pipeline step 2: Upsert films to Pinecone with integrated embedding.
Pinecone embeds the 'text' field automatically using llama-text-embed-v2 (1024 dims).
Run after scrape_films.py: python scripts/embed_and_index.py
"""
import json
import os
import time
import uuid
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "horror-films")
BATCH_SIZE = 40   # smaller batches to stay under 250k tokens/min rate limit
BATCH_SLEEP = 12  # seconds between batches (~40 films * ~300 tokens = 12k tokens, safe at 250k TPM)


def build_film_document(film: dict) -> str:
    """Build a rich text document — Pinecone embeds this field via llama-text-embed-v2."""
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


def already_indexed(index, film_ids: list[str]) -> set[str]:
    """Return subset of film_ids already present in Pinecone."""
    try:
        result = index.fetch(ids=film_ids)
        return set(result.vectors.keys())
    except Exception:
        return set()


def main():
    with open("data/raw_films.json") as f:
        films = json.load(f)

    print(f"Indexing {len(films)} films into Pinecone (integrated embedding)...")
    index = pc.Index(INDEX_NAME)

    film_ids = [
        str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{f.get('title')}-{f.get('year')}"))
        for f in films
    ]

    # Dedup — skip already-indexed films
    existing_ids: set[str] = set()
    for i in range(0, len(film_ids), 100):
        existing_ids |= already_indexed(index, film_ids[i : i + 100])

    if existing_ids:
        print(f"  Skipping {len(existing_ids)} already indexed")

    batch = []
    upserted = 0
    for film, film_id in zip(films, film_ids):
        if film_id in existing_ids:
            continue

        record = {
            "_id": film_id,
            "text": build_film_document(film),  # field Pinecone embeds
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
        batch.append(record)

        if len(batch) >= BATCH_SIZE:
            for attempt in range(4):
                try:
                    index.upsert_records(namespace="__default__", records=batch)
                    break
                except Exception as e:
                    if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                        wait = 30 * (attempt + 1)
                        print(f"  Rate limited — waiting {wait}s...")
                        time.sleep(wait)
                    else:
                        raise
            upserted += len(batch)
            print(f"  Upserted {upserted} films so far...")
            batch = []
            time.sleep(BATCH_SLEEP)

    if batch:
        index.upsert_records(namespace="__default__", records=batch)
        upserted += len(batch)

    print(f"\nDone. {upserted} films upserted to Pinecone.")


if __name__ == "__main__":
    main()
