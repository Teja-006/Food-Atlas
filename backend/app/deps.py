from fastapi import Depends, HTTPException, Request

from .config import get_settings
from .firebase_auth import verify_id_token


def current_user(request: Request) -> dict | None:
    """The signed-in user from the Firebase ID token, or None."""
    scheme, _, token = request.headers.get("Authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    claims = verify_id_token(token)
    if not claims:
        return None
    return {
        "uid": claims["sub"],
        "email": (claims.get("email") or "").lower(),
        "name": claims.get("name") or "",
        "email_verified": bool(claims.get("email_verified")),
    }


def require_user(user: dict | None = Depends(current_user)) -> dict:
    """For write actions: signed in AND email verified (stops throwaway sign-ups)."""
    if not user:
        raise HTTPException(status_code=401, detail="Please log in first")
    if not user["email_verified"]:
        raise HTTPException(status_code=403, detail="Please verify your email address first")
    return user


def is_admin(user: dict) -> bool:
    return user["email_verified"] and user["email"] in get_settings().admin_set
