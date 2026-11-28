from fastapi import Depends, HTTPException, Request

from .admin_token import AdminTokenError, verify_admin_token
from .config import get_settings
from .firebase_auth import verify_id_token


def _bearer(request: Request) -> str:
    scheme, _, token = request.headers.get("Authorization", "").partition(" ")
    return token if scheme.lower() == "bearer" else ""


def current_user(request: Request) -> dict | None:
    """The signed-in user from the Firebase ID token, or None."""
    token = _bearer(request)
    if not token:
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


def require_admin(request: Request) -> dict:
    """For the private admin API. Accepts ONLY a short-lived token signed by SecureAccess.
    A Firebase token (even one belonging to someone with an admin-looking email) is not enough."""
    s = get_settings()
    if not s.secureaccess_public_key.strip():
        raise HTTPException(status_code=503, detail="Admin review is not configured")
    token = _bearer(request)
    if not token:
        raise HTTPException(status_code=401, detail="Admin credentials required")
    try:
        return verify_admin_token(
            token,
            public_key_pem=s.secureaccess_public_key,
            issuer=s.secureaccess_issuer,
            audience=s.admin_token_audience,
        )
    except AdminTokenError:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

def require_login(user: dict | None = Depends(current_user)) -> dict:
    """For actions any signed-in user can do, verified email or not (unlike require_user)."""
    if not user:
        raise HTTPException(status_code=401, detail="Please log in first")
    return user