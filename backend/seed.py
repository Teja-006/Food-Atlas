"""Clean data/restaurants.csv and load it into MongoDB Atlas.

Usage (from backend/):  python seed.py          # upsert by name
                        python seed.py --reset  # wipe restaurants first
"""
import csv
import sys
from datetime import datetime, timezone
from pathlib import Path

from app.db import ensure_indexes, restaurants

CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "restaurants.csv"


def clean(value) -> str:
    return (value or "").strip()


def tidy(value: str) -> str:
    """'italian' -> 'Italian'; leaves already-cased values alone."""
    return value.title() if value.islower() else value


def to_float(value, default=0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def build_doc(row: dict) -> dict | None:
    name = clean(row.get("name"))
    lat, lng = to_float(row.get("lat")), to_float(row.get("lng"))
    if not name or (lat == 0 and lng == 0):
        return None

    cuisine = tidy(clean(row.get("cuisine")))
    # The old export had a misspelled "catergory" column; use it as a fallback.
    category = clean(row.get("category")) or clean(row.get("catergory")) or cuisine.split(",")[0]
    images = []
    for url in (clean(row.get("image")), clean(row.get("Images"))):
        if url and url not in images:
            images.append(url)

    return {
        "name": name,
        "description": clean(row.get("description")),
        "cuisine": cuisine or "Other",
        "category": tidy(category.strip()) or "Other",
        "location": {"type": "Point", "coordinates": [lng, lat]},
        "address": clean(row.get("address")),
        "phone": clean(row.get("phone")),
        "hours": clean(row.get("hours")),
        "price_range": clean(row.get("price_range")) or None,
        "image": images[0] if images else None,
        "images": images,
        "rating": to_float(row.get("rating")),
        "review_count": int(to_float(row.get("review_count"))),
    }


def main(reset: bool) -> None:
    ensure_indexes()
    if reset:
        print(f"Removed {restaurants.delete_many({}).deleted_count} existing restaurants")

    now = datetime.now(timezone.utc)
    loaded, skipped = 0, []
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as fh:
        for row in csv.DictReader(fh):
            doc = build_doc(row)
            if doc is None:
                skipped.append(clean(row.get("name")) or "(unnamed)")
                continue
            restaurants.update_one(
                {"name": doc["name"]},
                {"$set": {**doc, "updated_at": now}, "$setOnInsert": {"created_at": now}},
                upsert=True,
            )
            loaded += 1

    print(f"Loaded {loaded} restaurants")
    if skipped:
        print("Skipped (missing name or 0,0 coordinates):", ", ".join(skipped))


if __name__ == "__main__":
    main(reset="--reset" in sys.argv)
