import re
from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Query

from ..db import restaurants, users

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


# Only these stored fields are ever sent to the public. A whitelist (not "everything except
# a few") means a field added to the database later cannot leak by accident. Older records
# created before the review workflow still carry an `added_by` user id; it is not listed here.
PUBLIC_FIELDS = (
    "name", "description", "cuisine", "category", "address", "phone", "hours",
    "price_range", "image", "images", "rating", "review_count", "created_at", "updated_at",
)


def _serialize(doc: dict) -> dict:
    lng, lat = doc["location"]["coordinates"]
    out = {k: doc[k] for k in PUBLIC_FIELDS if k in doc}
    out.update(id=str(doc["_id"]), lat=lat, lng=lng)
    for key in ("created_at", "updated_at"):
        if isinstance(out.get(key), datetime):
            out[key] = out[key].isoformat()
    return out


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
    bbox: str | None = Query(None, max_length=120),
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
    if bbox:
        try:
            min_lng, min_lat, max_lng, max_lat = (float(v) for v in bbox.split(","))
        except ValueError:
            raise HTTPException(status_code=422, detail="bbox must be minLng,minLat,maxLng,maxLat")
        query["location"] = {"$geoWithin": {"$box": [[min_lng, min_lat], [max_lng, max_lat]]}}

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


# There is deliberately NO create/update/delete endpoint here. Restaurants enter this
# collection only when an admin approves a submission (see routers/admin_submissions.py).


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
