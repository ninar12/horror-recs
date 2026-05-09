"""
Patch poster_path into existing Pinecone records using metadata update.
Run: python scripts/patch_pinecone_posters.py
"""
import json, uuid, os, time
from dotenv import load_dotenv
load_dotenv()

from pinecone import Pinecone

TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
NAMESPACE = "__default__"
BATCH = 100

def main():
    with open("data/raw_films.json") as f:
        films = json.load(f)

    films_with_poster = [f for f in films if f.get("poster_path")]
    print(f"Patching {len(films_with_poster)} films with poster URLs into Pinecone...")

    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    idx = pc.Index(os.environ.get("PINECONE_INDEX_NAME", "horror-films"))

    updated = 0
    for i, film in enumerate(films_with_poster):
        film_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{film['title']}-{film['year']}"))
        poster_url = f"{TMDB_IMAGE_BASE}{film['poster_path']}"
        try:
            idx.update(
                id=film_id,
                set_metadata={"poster_url": poster_url},
                namespace=NAMESPACE,
            )
            updated += 1
        except Exception as e:
            pass

        if (i + 1) % 500 == 0:
            print(f"  {i+1}/{len(films_with_poster)} done")
            time.sleep(0.5)

    print(f"Done. Updated {updated} records.")

if __name__ == "__main__":
    main()
