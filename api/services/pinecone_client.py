from pinecone import Pinecone
from functools import lru_cache
import os


@lru_cache
def get_pinecone_index():
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    return pc.Index(os.environ.get("PINECONE_INDEX_NAME", "horror-films"))


def search_films(
    query_vector: list[float],
    top_k: int = 30,
    filter_dict: dict | None = None,
) -> list[dict]:
    index = get_pinecone_index()
    kwargs = {"vector": query_vector, "top_k": top_k, "include_metadata": True}
    if filter_dict:
        kwargs["filter"] = filter_dict

    results = index.query(**kwargs)
    return [
        {
            "id": match.id,
            "score": match.score,
            **match.metadata,
        }
        for match in results.matches
    ]


def upsert_film(film_id: str, vector: list[float], metadata: dict) -> None:
    index = get_pinecone_index()
    index.upsert(vectors=[{"id": film_id, "values": vector, "metadata": metadata}])


def bulk_upsert_films(records: list[dict]) -> None:
    """records: list of {id, values, metadata}"""
    index = get_pinecone_index()
    batch_size = 100
    for i in range(0, len(records), batch_size):
        index.upsert(vectors=records[i : i + batch_size])
