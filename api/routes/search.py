from fastapi import APIRouter, Depends, Query, UploadFile, File
import re
from pydantic import BaseModel
from api.services.gemini import rerank_and_explain, generate_mood_query, expand_search_query, image_to_horror_query
from api.services.pinecone_client import search_films
from api.services.auth import get_optional_user_id
from api.services.database import get_session, WatchHistory
from api.services.film_lookup import enrich_with_posters

router = APIRouter(prefix="/api/search", tags=["search"])

# Larger pool gives Gemini more obscure options to pick from during reranking
CANDIDATE_POOL = 30

_VIBE_WORDS = {
    "horror", "scary", "terrifying", "film", "movie", "movies", "films",
    "vibe", "vibes", "feel", "atmosphere", "like", "similar", "recommend",
    "watching", "watch", "show", "about", "with", "that", "kind", "type",
    "slow", "burn", "psychological", "supernatural", "creature", "found",
    "footage", "slasher", "gothic", "obscure", "indie",
}

def _is_title_query(q: str) -> bool:
    """Short query with no vibe/genre words — likely a film title."""
    words = q.lower().split()
    return 2 <= len(words) <= 5 and not any(w in _VIBE_WORDS for w in words)


class SearchResponse(BaseModel):
    films: list[dict]
    total: int
    query_used: str


class SimilarRequest(BaseModel):
    film_id: str
    title: str
    synopsis: str | None = None
    genres: list[str] | None = None
    themes: list[str] | None = None
    atmosphere: str | None = None


def _extract_decade(q: str) -> tuple[int, int] | None:
    """Return (year_min, year_max) if the query references a decade, else None."""
    m = re.search(r"\b(19|20)?([2-9]0)s\b", q, re.IGNORECASE)
    if not m:
        return None
    century = int(m.group(1)) * 100 if m.group(1) else (1900 if int(m.group(2)) >= 20 else 2000)
    decade = int(m.group(2))
    return century + decade, century + decade + 9


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
    exclude: str = Query(default=""),
    user_id: str | None = Depends(get_optional_user_id),
):
    exclude_ids = set(exclude.split(",")) if exclude else set()
    expanded = q if _is_title_query(q) else expand_search_query(q)
    loose_keywords = {"nostalgia", "nostalgic", "vibe", "vibes", "feel", "aesthetic", "style", "inspired"}
    is_loose = any(w in q.lower() for w in loose_keywords)
    decade = None if is_loose else _extract_decade(q)
    niche_filter = {"niche_score": {"$gte": niche_min, "$lte": niche_max}}
    # Fetch more when decade filter or exclude list reduces the pool
    base_top_k = CANDIDATE_POOL + len(exclude_ids)
    top_k = min(base_top_k * 4 if decade else base_top_k, 200)
    candidates = search_films(
        expanded, top_k=top_k, filter_dict=niche_filter,
        year_min=decade[0] if decade else None,
        year_max=decade[1] if decade else None,
    )
    if exclude_ids:
        candidates = [c for c in candidates if c["id"] not in exclude_ids]
    context = _get_user_context(user_id) if user_id else {}
    ranked = rerank_and_explain(q, candidates, context)
    return SearchResponse(films=ranked, total=len(ranked), query_used=expanded)


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
    ranked = rerank_and_explain(expanded_query, candidates, context)
    return SearchResponse(films=ranked, total=len(ranked), query_used=expanded_query)


@router.post("/similar", response_model=SearchResponse)
def similar_search(
    body: SimilarRequest,
    niche_min: int = Query(default=1, ge=1, le=10),
    niche_max: int = Query(default=10, ge=1, le=10),
    user_id: str | None = Depends(get_optional_user_id),
):
    """Find films with the same tone and atmosphere as a given film."""
    # Build a rich description from available film fields
    parts: list[str] = []
    if body.atmosphere:
        parts.append(body.atmosphere)
    if body.genres:
        parts.append(" ".join(body.genres))
    if body.synopsis:
        parts.append(body.synopsis[:200])
    if body.themes:
        parts.append(" ".join(body.themes[:5]))
    query = f"{body.title}: " + " ".join(parts) if parts else body.title

    niche_filter = {"niche_score": {"$gte": niche_min, "$lte": niche_max}}
    # Pull extra candidates so we can drop the source film itself
    candidates = search_films(query, top_k=CANDIDATE_POOL + 5, filter_dict=niche_filter)
    candidates = [c for c in candidates if c["id"] != body.film_id][:CANDIDATE_POOL]

    context = _get_user_context(user_id) if user_id else {}
    ranked = enrich_with_posters(
        rerank_and_explain(query, candidates, context, similar_to=body.title)
    )
    return SearchResponse(films=ranked, total=len(ranked), query_used=f"similar to: {body.title}")


@router.post("/image", response_model=SearchResponse)
async def image_search(
    file: UploadFile = File(...),
    niche_min: int = Query(default=3, ge=1, le=10),
    niche_max: int = Query(default=10, ge=1, le=10),
    user_id: str | None = Depends(get_optional_user_id),
):
    """Analyse an uploaded image with Gemini Vision, then search for horror films that match its atmosphere."""
    image_bytes = await file.read()
    horror_query = image_to_horror_query(image_bytes, file.content_type or "image/jpeg")
    niche_filter = {"niche_score": {"$gte": niche_min, "$lte": niche_max}}
    candidates = search_films(horror_query, top_k=CANDIDATE_POOL, filter_dict=niche_filter)
    context = _get_user_context(user_id) if user_id else {}
    ranked = enrich_with_posters(rerank_and_explain(horror_query, candidates, context))
    return SearchResponse(films=ranked, total=len(ranked), query_used=horror_query)
