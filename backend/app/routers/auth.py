from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pymongo.errors import DuplicateKeyError

from ..db import users
from ..deps import current_user, is_admin

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
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
    except DuplicateKeyError:  # two first requests raced; the record exists now
        pass

    return {
        "user": {
            "id": user["uid"],
            "name": user["name"],
            "email": user["email"],
            "email_verified": user["email_verified"],
            "is_admin": is_admin(user),
        }
    }
