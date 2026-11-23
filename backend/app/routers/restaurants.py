import re
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pymongo import ReturnDocument

from ..db import restaurants, users
from ..deps import is_admin, require_user
from ..schemas import RestaurantIn

router = APIRouter(prefix="/api/restaurants", tags=["restaurants"])
stats_router = APIRouter(prefix="/api", tags=["stats"])

EARTH_RADIUS_KM = 6378.1
NOT_FOUND = HTTPException(status_code=404, detail="Restaurant not found")


def _oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise NOT_FOUND


def _contains(text: str) -> dict:
    return {"$regex": re.escape(text), "$options": "i"}


def _serialize(doc: dict) -> dict:
    lng, lat = doc["location"]["coordinates"]
    out = {k: v for k, v in doc.items() if k not in ("_id", "location")}
    out.update(id=str(doc["_id"]), lat=lat, lng=lng)
    for key in ("created_at", "updated_at"):
        if isinstance(out.get(key), datetime):
            out[key] = out[key].isoformat()
    return out


def _editable(body: RestaurantIn) -> dict:
    data = body.model_dump(mode="json", exclude={"lat", "lng"})
    data["location"] = {"type": "Point", "coordinates": [body.lng, body.lat]}
    return data


def _check_owner(doc: dict, user: dict) -> None:
    if doc.get("added_by") != user["uid"] and not is_admin(user):
        raise HTTPException(status_code=403, detail="You can only change restaurants you added")


@router.get("")
def list_restaurants(
    q: str | None = Query(None, max_length=100),
    category: str | None = Query(None, max_length=60),
    cuisine: str | None = Query(None, max_length=60),
    min_rating: float = Query(0, ge=0, le=5),
    lat: float | None = Query(None, ge=-90, le=90),
    lng: float | None = Query(None, ge=-180, le=180),
    radius_km: float = Query(10, gt=0, le=500),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
):
    query: dict = {}
    if category and category.lower() != "all":
        query["category"] = {"$regex": f"^{re.escape(category)}$", "$options": "i"}
    if cuisine:
        query["cuisine"] = _contains(cuisine)
    if min_rating:
        query["rating"] = {"$gte": min_rating}
    if q:
        query["$or"] = [
            {f: _contains(q)} for f in ("name", "description", "cuisine", "address", "category")
        ]
    if lat is not None and lng is not None:
        query["location"] = {
            "$geoWithin": {"$centerSphere": [[lng, lat], radius_km / EARTH_RADIUS_KM]}
        }

    total = restaurants.count_documents(query)
    cursor = restaurants.find(query).sort([("rating", -1), ("name", 1)]).skip(skip).limit(limit)
    return {"items": [_serialize(d) for d in cursor], "total": total}


# Declared before "/{restaurant_id}" so it isn't treated as an id.
@router.get("/categories")
def categories():
    pipeline = [
        {"$match": {"category": {"$nin": [None, ""]}}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1, "_id": 1}},
    ]
    return [{"name": d["_id"], "count": d["count"]} for d in restaurants.aggregate(pipeline)]


@router.get("/{restaurant_id}")
def get_restaurant(restaurant_id: str):
    doc = restaurants.find_one({"_id": _oid(restaurant_id)})
    if not doc:
        raise NOT_FOUND
    return _serialize(doc)


@router.post("", status_code=201)
def create_restaurant(body: RestaurantIn, user: dict = Depends(require_user)):
    now = datetime.now(timezone.utc)
    doc = _editable(body)
    doc.update(review_count=0, added_by=user["uid"], created_at=now, updated_at=now)
    restaurants.insert_one(doc)
    return _serialize(doc)


@router.put("/{restaurant_id}")
def update_restaurant(restaurant_id: str, body: RestaurantIn, user: dict = Depends(require_user)):
    oid = _oid(restaurant_id)
    existing = restaurants.find_one({"_id": oid})
    if not existing:
        raise NOT_FOUND
    _check_owner(existing, user)

    changes = _editable(body)
    changes["updated_at"] = datetime.now(timezone.utc)
    updated = restaurants.find_one_and_update(
        {"_id": oid}, {"$set": changes}, return_document=ReturnDocument.AFTER
    )
    if not updated:
        raise NOT_FOUND
    return _serialize(updated)


@router.delete("/{restaurant_id}", status_code=204)
def delete_restaurant(restaurant_id: str, user: dict = Depends(require_user)):
    oid = _oid(restaurant_id)
    existing = restaurants.find_one({"_id": oid}, {"added_by": 1})
    if not existing:
        raise NOT_FOUND
    _check_owner(existing, user)
    restaurants.delete_one({"_id": oid})
    return Response(status_code=204)


@stats_router.get("/stats")
def stats():
    avg = list(
        restaurants.aggregate(
            [{"$match": {"rating": {"$gt": 0}}}, {"$group": {"_id": None, "avg": {"$avg": "$rating"}}}]
        )
    )
    top = restaurants.find({}, {"name": 1, "rating": 1}).sort("rating", -1).limit(5)
    return {
        "total_restaurants": restaurants.estimated_document_count(),
        "total_users": users.estimated_document_count(),
        "avg_rating": round(avg[0]["avg"], 1) if avg else 0,
        "top_rated": [
            {"id": str(d["_id"]), "name": d["name"], "rating": d.get("rating", 0)} for d in top
        ],
    }
