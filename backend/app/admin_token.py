"""Verify the short-lived admin tokens that SecureAccess signs.

Why a signed token instead of a shared password/API key?
  * SecureAccess signs with a PRIVATE key that never leaves SecureAccess.
  * Food Atlas only holds the PUBLIC key, so even if Food Atlas is breached an attacker
    cannot mint admin tokens.
  * Each token lives about a minute and names the admin, so every decision can be
    attributed to a person ("who approved this?").

This module is deliberately free of FastAPI/Mongo imports so it is easy to test.
"""
import jwt

ALGORITHM = "EdDSA"  # Ed25519. Pinned: never accept the algorithm named inside the token.
MAX_LIFETIME_SECONDS = 120  # refuse tokens that were signed to live longer than this
REQUIRED_CLAIMS = ["exp", "iat", "iss", "aud", "sub", "jti"]
ALLOWED_ROLES = ("Administrator",)


class AdminTokenError(Exception):
    """The token is missing, forged, expired, or not for an allowed admin role."""


def normalize_pem(value: str) -> str:
    """Hosts often store PEM keys on one line with literal \\n; turn those back into newlines."""
    return value.replace("\\n", "\n").strip()


def verify_admin_token(
    token: str,
    *,
    public_key_pem: str,
    issuer: str,
    audience: str,
    allowed_roles: tuple[str, ...] = ALLOWED_ROLES,
) -> dict:
    try:
        claims = jwt.decode(
            token,
            normalize_pem(public_key_pem),
            algorithms=[ALGORITHM],
            audience=audience,
            issuer=issuer,
            leeway=10,  # tolerate small clock differences between the two servers
            options={"require": REQUIRED_CLAIMS},
        )
    except jwt.PyJWTError as exc:
        raise AdminTokenError("invalid admin token") from exc

    if claims["exp"] - claims["iat"] > MAX_LIFETIME_SECONDS:
        raise AdminTokenError("admin token lifetime too long")

    for key in ("sub", "username", "role", "jti"):
        if not isinstance(claims.get(key), str) or not claims[key]:
            raise AdminTokenError(f"admin token missing {key}")
    if claims["role"] not in allowed_roles:
        raise AdminTokenError("role not allowed")

    return {"id": claims["sub"], "username": claims["username"], "role": claims["role"], "jti": claims["jti"]}
