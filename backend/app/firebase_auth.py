"""Verify Firebase ID tokens using Google's public signing keys.

No service-account key is needed: tokens are RS256-signed JWTs, so the backend only
checks the signature, expiry, audience and issuer against your Firebase project ID.
"""
import jwt

from .config import get_settings

JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"

# PyJWKClient caches Google's keys, so we don't fetch them on every request.
_jwks = jwt.PyJWKClient(JWKS_URL, cache_keys=True)


def verify_id_token(token: str) -> dict | None:
    project_id = get_settings().firebase_project_id
    try:
        key = _jwks.get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"https://securetoken.google.com/{project_id}",
            leeway=10,  # tolerate small clock differences
            options={"require": ["exp", "iat", "sub"]},
        )
    except jwt.PyJWTError:
        return None
    return claims if isinstance(claims.get("sub"), str) and claims["sub"] else None
