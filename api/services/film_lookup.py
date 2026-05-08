"""
In-memory poster lookup — loads raw_films.json once on startup.
Avoids re-indexing Pinecone just to add poster_path.
"""
import json
from functools import lru_cache
from pathlib import Path

TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


@lru_cache(maxsize=1)
def _load_lookup() -> dict[str, str]:
    """Returns {title|year: poster_url} map."""
    path = _PROJECT_ROOT / "data" / "raw_films.json"
    if not path.exists():
        return {}
    with open(path) as f:
        films = json.load(f)
    lookup = {}
    for film in films:
        key = f"{film.get('title', '')}|{film.get('year', '')}"
        poster = film.get("poster_path", "")
        lookup[key] = f"{TMDB_IMAGE_BASE}{poster}" if poster else ""
    return lookup


def get_poster_url(title: str, year) -> str:
    key = f"{title}|{int(year) if year else ''}"
    return _load_lookup().get(key, "")


def enrich_with_posters(films: list[dict]) -> list[dict]:
    for film in films:
        if not film.get("poster_url"):
            film["poster_url"] = get_poster_url(
                film.get("title", ""), film.get("year")
            )
    return films
