"""Watch history endpoints — log films as seen, retrieve history, remove entries."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from api.services.auth import get_current_user_id
from api.services.database import get_session, WatchHistory
import uuid

router = APIRouter(prefix="/api/history", tags=["history"])


class LogFilmRequest(BaseModel):
    film_id: str
    film_title: str
    rating: float | None = None


@router.get("")
def get_history(user_id: str = Depends(get_current_user_id)):
    """Return all watched films for the current user, newest first."""
    session = get_session()
    rows = (
        session.query(WatchHistory)
        .filter_by(user_id=user_id)
        .order_by(WatchHistory.watched_at.desc())
        .all()
    )
    result = [
        {
            "id": r.id,
            "film_id": r.film_id,
            "film_title": r.film_title,
            "rating": r.rating,
            "watched_at": r.watched_at.isoformat() if r.watched_at else None,
        }
        for r in rows
    ]
    session.close()
    return result


@router.post("")
def log_film(body: LogFilmRequest, user_id: str = Depends(get_current_user_id)):
    """Mark a film as watched. Idempotent — updates rating if already logged."""
    session = get_session()
    existing = session.query(WatchHistory).filter_by(user_id=user_id, film_id=body.film_id).first()
    if existing:
        if body.rating is not None:
            existing.rating = body.rating
            session.commit()
        session.close()
        return {"message": "Already logged", "id": existing.id}

    entry = WatchHistory(
        id=str(uuid.uuid4()),
        user_id=user_id,
        film_id=body.film_id,
        film_title=body.film_title,
        rating=body.rating,
    )
    session.add(entry)
    session.commit()
    result = {"message": "Logged", "id": entry.id}
    session.close()
    return result


@router.delete("/{film_id}")
def remove_from_history(film_id: str, user_id: str = Depends(get_current_user_id)):
    """Remove a film from watch history."""
    session = get_session()
    row = session.query(WatchHistory).filter_by(user_id=user_id, film_id=film_id).first()
    if row:
        session.delete(row)
        session.commit()
    session.close()
    return {"message": "Removed"}


@router.get("/ids")
def get_watched_ids(user_id: str = Depends(get_current_user_id)):
    """Return just the set of watched film IDs — lightweight for UI state checks."""
    session = get_session()
    rows = session.query(WatchHistory.film_id).filter_by(user_id=user_id).all()
    session.close()
    return [r.film_id for r in rows]
