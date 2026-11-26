import time
import uuid

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from app.admin_token import AdminTokenError, verify_admin_token


def _pem_pair():
    priv = Ed25519PrivateKey.generate()
    return (
        priv.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode(),
        priv.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode(),
    )


PRIV, PUB = _pem_pair()
OTHER_PRIV, _ = _pem_pair()
KW = dict(public_key_pem=PUB, issuer="secureaccess", audience="food-atlas-admin")


def make(priv=PRIV, **over):
    now = int(time.time())
    claims = {"iss": "secureaccess", "aud": "food-atlas-admin", "sub": "a1", "username": "alice",
              "role": "Administrator", "iat": now, "exp": now + 60, "jti": str(uuid.uuid4())}
    claims.update(over)
    return jwt.encode({k: v for k, v in claims.items() if v is not None}, priv, algorithm="EdDSA")


def rejects(token, **kw):
    try:
        verify_admin_token(token, **{**KW, **kw})
    except AdminTokenError:
        return True
    return False


def test_valid_token_returns_admin_identity():
    who = verify_admin_token(make(), **KW)
    assert who["id"] == "a1" and who["username"] == "alice" and who["role"] == "Administrator"


def test_pem_with_escaped_newlines_is_accepted():
    verify_admin_token(make(), **{**KW, "public_key_pem": PUB.replace("\n", "\\n")})


def test_forged_signature_rejected():
    assert rejects(make(OTHER_PRIV))


def test_wrong_audience_and_issuer_rejected():
    assert rejects(make(aud="something-else")) and rejects(make(iss="evil"))


def test_expired_rejected():
    now = int(time.time())
    assert rejects(make(iat=now - 300, exp=now - 200))


def test_long_lived_token_rejected():
    now = int(time.time())
    assert rejects(make(iat=now, exp=now + 3600))


def test_non_admin_role_rejected():
    for role in ("Viewer", "Developer", "Security Analyst"):
        assert rejects(make(role=role))


def test_missing_claims_rejected():
    for missing in ("sub", "jti", "username", "role", "exp", "iat", "aud", "iss"):
        assert rejects(make(**{missing: None})), missing


def test_algorithm_confusion_rejected():
    import base64, hashlib, hmac, json

    def b64(b):
        return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

    now = int(time.time())
    payload = {"iss": "secureaccess", "aud": "food-atlas-admin", "sub": "x", "username": "mallory",
               "role": "Administrator", "iat": now, "exp": now + 60, "jti": "j"}
    # Hand-crafted HS256 token whose HMAC secret is the PUBLIC key text (the classic attack;
    # built by hand because PyJWT itself refuses to create it).
    head = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body = b64(json.dumps(payload).encode())
    sig = b64(hmac.new(PUB.encode(), f"{head}.{body}".encode(), hashlib.sha256).digest())
    assert rejects(f"{head}.{body}.{sig}")
    # and an unsigned ("alg": "none") token
    head = b64(json.dumps({"alg": "none", "typ": "JWT"}).encode())
    assert rejects(f"{head}.{body}.")


def test_garbage_rejected():
    assert rejects("not.a.jwt") and rejects("")


if __name__ == "__main__":
    import inspect, sys
    bad = 0
    for n, f in sorted(globals().items()):
        if n.startswith("test_") and inspect.isfunction(f):
            try:
                f(); print("PASS", n)
            except Exception as e:  # noqa
                bad += 1; print("FAIL", n, "->", repr(e))
    sys.exit(1 if bad else 0)
