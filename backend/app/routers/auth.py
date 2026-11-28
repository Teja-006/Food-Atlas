from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pymongo.errors import DuplicateKeyError

from ..db import users
from ..deps import current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me")
def me(user: dict | None = Depends(current_user)):
    """Called by the app after Firebase sign-in. Records the user and returns their profile."""
    if not user:
        return {"user": None}

    now = datetime.now(timezone.utc)
    try:
        users.update_one(
            {"firebase_uid": user["uid"]},
            {
                "$set": {"email": user["email"], "name": user["name"], "last_seen": now},
                "$setOnInsert": {"created_at": now, "profile": {}},
            },
            upsert=True,
        )
    except DuplicateKeyError:  # two first requests raced; the record exists now
        pass

    doc = users.find_one({"firebase_uid": user["uid"]}) or {}
    profile = doc.get("profile") or {}

    return {
        "user": {
            "id": user["uid"],
            # A saved profile name wins over the Firebase display name, once set.
            "name": profile.get("name") or user["name"],
            "email": user["email"],
            "email_verified": user["email_verified"],
            "photo_url": profile.get("photo_url") or None,
        }
    }