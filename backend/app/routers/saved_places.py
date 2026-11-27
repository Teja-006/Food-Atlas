from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from ..db import restaurants, users
from ..deps import require_user

router = APIRouter(prefix="/api/users/me/places", tags=["saved places"])


def get_user_places(uid: str) -> list[str]:
    user_doc = users.find_one(
        {"firebase_uid": uid},
        {"saved_places": 1},
    )
    return user_doc.get("saved_places", []) if user_doc else []


@router.get("")
def list_saved_places(user: dict = Depends(require_user)):
    ids = get_user_places(user["uid"])

    valid_ids = [ObjectId(value) for value in ids if ObjectId.is_valid(value)]
    docs = list(restaurants.find({"_id": {"$in": valid_ids}}))

    # Match the restaurant API's response format.
    from .restaurants import _serialize

    return {"items": [_serialize(doc) for doc in docs]}


@router.put("/{restaurant_id}")
def save_place(restaurant_id: str, user: dict = Depends(require_user)):
    if not ObjectId.is_valid(restaurant_id):
        raise HTTPException(status_code=400, detail="Invalid restaurant ID")

    if not restaurants.find_one({"_id": ObjectId(restaurant_id)}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Restaurant not found")

    users.update_one(
        {"firebase_uid": user["uid"]},
        {
            "$setOnInsert": {
                "firebase_uid": user["uid"],
                "email": user.get("email", ""),
                "name": user.get("name", ""),
            },
            "$addToSet": {"saved_places": restaurant_id},
        },
        upsert=True,
    )

    return {"saved": True, "restaurant_id": restaurant_id}


@router.delete("/{restaurant_id}")
def unsave_place(restaurant_id: str, user: dict = Depends(require_user)):
    users.update_one(
        {"firebase_uid": user["uid"]},
        {"$pull": {"saved_places": restaurant_id}},
    )
    return {"saved": False, "restaurant_id": restaurant_id}