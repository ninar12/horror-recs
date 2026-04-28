from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from api.services.gemini import embed_text, rerank_and_explain, generate_mood_query
from api.services.pinecone_client import search_films
from api.services.auth import get_current_user_id
from api.services.database import get_session, WatchHistory

router = APIRouter(prefix="/api/search", tags=["search"])


class SearchResponse(BaseModel):
    films: list[dict]
    query_used: str


@router.get("", response_model=SearchResponse)
def search(
    q: str = Query(..., min_length=2),
    limit: int = Query(10, le=20),
    user_id: str = Depends(get_current_user_id),
):
    vector = embed_text(q)
    candidates = search_films(vector, top_k=30)

    session = get_session()
    history = session.query(WatchHistory).filter_by(user_id=user_id).order_by(WatchHistory.watched_at.desc()).limit(20).all()
    session.close()

    user_context = {
        "watched_titles": [h.film_title for h in history],
    }

    ranked = rerank_and_explain(q, candidates, user_context)
    return SearchResponse(films=ranked[:limit], query_used=q)


@router.get("/mood", response_model=SearchResponse)
def mood_search(
    mood: str = Query(..., min_length=3),
    limit: int = Query(10, le=20),
    user_id: str = Depends(get_current_user_id),
):
    expanded_query = generate_mood_query(mood)
    vector = embed_text(expanded_query)
    candidates = search_films(vector, top_k=30)

    session = get_session()
    history = session.query(WatchHistory).filter_by(user_id=user_id).order_by(WatchHistory.watched_at.desc()).limit(20).all()
    session.close()

    user_context = {"watched_titles": [h.film_title for h in history]}
    ranked = rerank_and_explain(expanded_query, candidates, user_context)
    return SearchResponse(films=ranked[:limit], query_used=expanded_query)
