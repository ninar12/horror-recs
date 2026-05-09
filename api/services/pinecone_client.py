from pinecone import Pinecone
from functools import lru_cache
import os

FIELDS = [
    "title", "year", "director", "genres", "keywords", "themes",
    "atmosphere", "synopsis", "imdb_rating", "vote_count", "popularity",
    "original_language", "niche_score", "streaming_platforms", "rental_platforms",
    "rt_score", "lb_rating", "consensus_score", "poster_url",
]


@lru_cache
def get_pinecone_index():
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    return pc.Index(os.environ.get("PINECONE_INDEX_NAME", "horror-films"))


def search_films(
    query_text: str,
    top_k: int = 50,
    filter_dict: dict | None = None,
) -> list[dict]:
    """Query Pinecone using integrated embedding — send text, Pinecone embeds it."""
    index = get_pinecone_index()

    query: dict = {"inputs": {"text": query_text}, "top_k": top_k}

    results = index.search(namespace="__default__", query=query, fields=FIELDS)

    # Access hits via object attributes (SearchRecordsResponse)
    try:
        hits = results.result.hits
    except AttributeError:
        hits = []

    niche_min = (filter_dict or {}).get("niche_score", {}).get("$gte", 1)
    niche_max = (filter_dict or {}).get("niche_score", {}).get("$lte", 10)

    output = []
    for hit in hits:
        fields = hit["fields"] if "fields" in hit else {}
        niche_score = float(fields.get("niche_score", 5))
        if not (niche_min <= niche_score <= niche_max):
            continue
        similarity = hit.get("_score", 0.0)
        niche = niche_score / 10.0
        blended_score = similarity * 0.7 + niche * 0.3

        record = {
            "id": hit["_id"],
            "score": blended_score,
            "similarity": similarity,
            **{f: fields[f] for f in FIELDS if f in fields},
        }
        output.append(record)

    return output


def upsert_records(records: list[dict]) -> None:
    """
    Upsert film records with integrated embedding.
    Each record must have '_id' and 'text' (the field Pinecone embeds).
    All other keys are stored as metadata.
    """
    index = get_pinecone_index()
    batch_size = 90  # Pinecone integrated embed batch limit
    for i in range(0, len(records), batch_size):
        index.upsert_records(namespace="__default__", records=records[i : i + batch_size])
