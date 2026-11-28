"""A user's own profile (name, phone, location, photo, notification prefs).

Stored as a `profile` sub-document on their `users` record, kept separate from the
`name`/`email` fields that /api/auth/me syncs from Firebase on every login, so editing
one never overwrites the other."""
from fastapi import APIRouter, Depends

from ..db import users
from ..deps import require_login
from ..schemas import ProfileIn

router = APIRouter(prefix="/api/users/me", tags=["profile"])

DEFAULTS = {
    "name": "", "username": "", "phone": "", "dob": "", "gender": "Prefer not to say",
    "city": "", "area": "", "photo_url": None,
    "notify_near_me": True, "notify_weekly": False,
}


def _view(doc: dict | None) -> dict:
    profile = (doc or {}).get("profile") or {}
    return {**DEFAULTS, **profile}


@router.get("/profile")
def get_profile(user: dict = Depends(require_login)):
    doc = users.find_one({"firebase_uid": user["uid"]})
    return _view(doc)


@router.put("/profile")
def update_profile(body: ProfileIn, user: dict = Depends(require_login)):
    changes = body.model_dump(mode="json")
    users.update_one(
        {"firebase_uid": user["uid"]},
        {"$set": {f"profile.{k}": v for k, v in changes.items()}},
        upsert=True,
    )
    doc = users.find_one({"firebase_uid": user["uid"]})
    return _view(doc)