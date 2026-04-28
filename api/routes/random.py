import random
from fastapi import APIRouter, Depends, Query
from api.services.auth import get_current_user_id
from api.services.database import get_session, WatchlistItem, Watchlist
from api.services.gemini import embed_text, generate_mood_query
from api.services.pinecone_client import search_films

router = APIRouter(prefix="/api/random", tags=["random"])


@router.get("/from-watchlist/{watchlist_id}")
def random_from_watchlist(
    watchlist_id: str,
    user_id: str = Depends(get_current_user_id),
):
    session = get_session()
    wl = session.query(Watchlist).filter_by(id=watchlist_id, user_id=user_id).first()
    if not wl or not wl.items:
        session.close()
        return {"film": None, "message": "Watchlist is empty"}

    item = random.choice(wl.items)
    result = {
        "film_id": item.film_id,
        "film_title": item.film_title,
        "film_metadata": item.film_metadata,
    }
    session.close()
    return {"film": result}


@router.get("/from-mood")
def random_from_mood(
    mood: str = Query(..., min_length=3),
    user_id: str = Depends(get_current_user_id),
):
    expanded = generate_mood_query(mood)
    vector = embed_text(expanded)
    candidates = search_films(vector, top_k=20)

    if not candidates:
        return {"film": None, "message": "No results found"}

    # Weight by similarity score — higher score = more likely to be picked
    weights = [c["score"] for c in candidates]
    chosen = random.choices(candidates, weights=weights, k=1)[0]
    return {"film": chosen, "query_used": expanded}
