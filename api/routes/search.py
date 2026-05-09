from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from api.services.gemini import rerank_and_explain, generate_mood_query
from api.services.pinecone_client import search_films
from api.services.auth import get_optional_user_id
from api.services.database import get_session, WatchHistory

router = APIRouter(prefix="/api/search", tags=["search"])

# Fetch this many from Pinecone upfront — Gemini reranks once, frontend paginates
CANDIDATE_POOL = 10


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
    niche_min: int = Query(default=3, ge=1, le=10),
    niche_max: int = Query(default=10, ge=1, le=10),
    user_id: str | None = Depends(get_optional_user_id),
):
    niche_filter = {"niche_score": {"$gte": niche_min, "$lte": niche_max}}
    candidates = search_films(q, top_k=CANDIDATE_POOL, filter_dict=niche_filter)
    context = _get_user_context(user_id) if user_id else {}
    ranked = rerank_and_explain(q, candidates, context))
    return SearchResponse(films=ranked, total=len(ranked), query_used=q)


@router.get("/mood", response_model=SearchResponse)
def mood_search(
    mood: str = Query(..., min_length=3),
    niche_min: int = Query(default=3, ge=1, le=10),
    niche_max: int = Query(default=10, ge=1, le=10),
    user_id: str | None = Depends(get_optional_user_id),
):
    expanded_query = generate_mood_query(mood)
    niche_filter = {"niche_score": {"$gte": niche_min, "$lte": niche_max}}
    candidates = search_films(expanded_query, top_k=CANDIDATE_POOL, filter_dict=niche_filter)
    context = _get_user_context(user_id) if user_id else {}
    ranked = rerank_and_explain(expanded_query, candidates, context))
    return SearchResponse(films=ranked, total=len(ranked), query_used=expanded_query)
