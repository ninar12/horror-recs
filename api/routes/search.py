from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from api.services.gemini import rerank_and_explain, generate_mood_query
from api.services.pinecone_client import search_films
from api.services.auth import get_current_user_id
from api.services.database import get_session, WatchHistory

router = APIRouter(prefix="/api/search", tags=["search"])

# Fetch this many from Pinecone upfront — Gemini reranks once, frontend paginates
CANDIDATE_POOL = 50


class SearchResponse(BaseModel):
    films: list[dict]
    total: int
    query_used: str


def _get_user_context(user_id: str) -> dict:
    session = get_session()
    history = (
        session.query(WatchHistory)
        .filter_by(user_id=user_id)
        .order_by(WatchHistory.watched_at.desc())
        .limit(20)
        .all()
    )
    session.close()
    return {"watched_titles": [h.film_title for h in history]}


@router.get("", response_model=SearchResponse)
def search(
    q: str = Query(..., min_length=2),
    user_id: str = Depends(get_current_user_id),
):
    candidates = search_films(q, top_k=CANDIDATE_POOL)
    ranked = rerank_and_explain(q, candidates, _get_user_context(user_id))
    return SearchResponse(films=ranked, total=len(ranked), query_used=q)


@router.get("/mood", response_model=SearchResponse)
def mood_search(
    mood: str = Query(..., min_length=3),
    user_id: str = Depends(get_current_user_id),
):
    expanded_query = generate_mood_query(mood)
    candidates = search_films(expanded_query, top_k=CANDIDATE_POOL)
    ranked = rerank_and_explain(expanded_query, candidates, _get_user_context(user_id))
    return SearchResponse(films=ranked, total=len(ranked), query_used=expanded_query)
