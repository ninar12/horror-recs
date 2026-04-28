from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from api.services.auth import get_current_user_id
from api.services.database import get_session, Watchlist, WatchlistItem
import uuid

router = APIRouter(prefix="/api/watchlists", tags=["watchlists"])


class CreateWatchlistRequest(BaseModel):
    name: str


class AddFilmRequest(BaseModel):
    film_id: str
    film_title: str
    film_metadata: dict = {}


@router.get("")
def get_watchlists(user_id: str = Depends(get_current_user_id)):
    session = get_session()
    lists = session.query(Watchlist).filter_by(user_id=user_id).all()
    result = [
        {
            "id": wl.id,
            "name": wl.name,
            "item_count": len(wl.items),
            "created_at": wl.created_at.isoformat(),
        }
        for wl in lists
    ]
    session.close()
    return result


@router.post("")
def create_watchlist(body: CreateWatchlistRequest, user_id: str = Depends(get_current_user_id)):
    session = get_session()
    wl = Watchlist(id=str(uuid.uuid4()), user_id=user_id, name=body.name)
    session.add(wl)
    session.commit()
    result = {"id": wl.id, "name": wl.name}
    session.close()
    return result


@router.get("/{watchlist_id}")
def get_watchlist(watchlist_id: str, user_id: str = Depends(get_current_user_id)):
    session = get_session()
    wl = session.query(Watchlist).filter_by(id=watchlist_id, user_id=user_id).first()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    result = {
        "id": wl.id,
        "name": wl.name,
        "items": [
            {
                "id": item.id,
                "film_id": item.film_id,
                "film_title": item.film_title,
                "film_metadata": item.film_metadata,
                "added_at": item.added_at.isoformat(),
            }
            for item in wl.items
        ],
    }
    session.close()
    return result


@router.post("/{watchlist_id}/items")
def add_to_watchlist(
    watchlist_id: str,
    body: AddFilmRequest,
    user_id: str = Depends(get_current_user_id),
):
    session = get_session()
    wl = session.query(Watchlist).filter_by(id=watchlist_id, user_id=user_id).first()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")

    existing = session.query(WatchlistItem).filter_by(watchlist_id=watchlist_id, film_id=body.film_id).first()
    if existing:
        session.close()
        return {"message": "Already in watchlist"}

    item = WatchlistItem(
        id=str(uuid.uuid4()),
        watchlist_id=watchlist_id,
        film_id=body.film_id,
        film_title=body.film_title,
        film_metadata=body.film_metadata,
    )
    session.add(item)
    session.commit()
    session.close()
    return {"message": "Added", "item_id": item.id}


@router.delete("/{watchlist_id}/items/{item_id}")
def remove_from_watchlist(
    watchlist_id: str,
    item_id: str,
    user_id: str = Depends(get_current_user_id),
):
    session = get_session()
    wl = session.query(Watchlist).filter_by(id=watchlist_id, user_id=user_id).first()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    item = session.query(WatchlistItem).filter_by(id=item_id, watchlist_id=watchlist_id).first()
    if item:
        session.delete(item)
        session.commit()
    session.close()
    return {"message": "Removed"}
