"""
Data pipeline step 2: Embed films with Gemini and upsert to Pinecone.
Run after scrape_films.py: python scripts/embed_and_index.py

Creates Pinecone index if it doesn't exist (dimension=768, metric=cosine).
"""
import json
import os
import time
import uuid
from pathlib import Path
import google.generativeai as genai
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "horror-films")


def build_film_document(film: dict) -> str:
    """Build a rich text document for embedding — more context = better recall."""
    parts = [
        f"Title: {film.get('title', '')}",
        f"Year: {film.get('year', '')}",
        f"Director: {film.get('director', '')}",
        f"Subgenres: {', '.join(film.get('subgenres', []))}",
        f"Themes: {', '.join(film.get('themes', []))}",
        f"Atmosphere: {film.get('atmosphere', '')}",
        f"Synopsis: {film.get('synopsis', '')}",
        f"Cast: {', '.join(film.get('cast', [])[:5])}",
    ]
    return "\n".join(p for p in parts if not p.endswith(": "))


def embed_document(text: str) -> list[float]:
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type="retrieval_document",
    )
    return result["embedding"]


def ensure_index():
    existing = [i.name for i in pc.list_indexes()]
    if INDEX_NAME not in existing:
        print(f"Creating Pinecone index '{INDEX_NAME}'...")
        pc.create_index(
            name=INDEX_NAME,
            dimension=768,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )
        time.sleep(10)
    return pc.Index(INDEX_NAME)


def main():
    with open("data/raw_films.json") as f:
        films = json.load(f)

    print(f"Embedding {len(films)} films...")
    index = ensure_index()

    batch = []
    for i, film in enumerate(films):
        film_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{film.get('title')}-{film.get('year')}"))
        doc = build_film_document(film)

        try:
            vector = embed_document(doc)
        except Exception as e:
            print(f"  Skip '{film.get('title')}': {e}")
            time.sleep(2)
            continue

        metadata = {
            "title": film.get("title", ""),
            "year": film.get("year") or 0,
            "director": film.get("director", ""),
            "subgenres": film.get("subgenres", []),
            "themes": film.get("themes", []),
            "atmosphere": film.get("atmosphere", ""),
            "synopsis": (film.get("synopsis", ""))[:1000],
            "imdb_rating": film.get("imdb_rating") or 0.0,
            "streaming_platforms": film.get("streaming_platforms", []),
        }

        batch.append({"id": film_id, "values": vector, "metadata": metadata})

        # Upsert in batches of 100
        if len(batch) >= 100:
            index.upsert(vectors=batch)
            print(f"  Upserted {i + 1}/{len(films)}")
            batch = []
            time.sleep(0.5)

    if batch:
        index.upsert(vectors=batch)

    print(f"\nDone. {len(films)} films indexed in Pinecone.")


if __name__ == "__main__":
    main()
