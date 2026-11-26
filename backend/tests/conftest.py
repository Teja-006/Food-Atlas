"""Shared test setup. The env vars must be set BEFORE `app` is imported (settings are cached)."""
import os
import time
import uuid

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

_priv = Ed25519PrivateKey.generate()
PRIVATE_PEM = _priv.private_bytes(
    serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
).decode()
PUBLIC_PEM = _priv.public_key().public_bytes(
    serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
).decode()

os.environ.update(
    MONGO_URI="mongodb://localhost:27017",
    MONGO_DB="FoodAtlasTest",
    FIREBASE_PROJECT_ID="test-project",
    SECUREACCESS_PUBLIC_KEY=PUBLIC_PEM.replace("\n", "\\n"),
    APP_ENV="development",
)

USER = {"uid": "user-1", "email": "user1@example.com", "name": "User One", "email_verified": True}
BODY = {"name": "Spice Garden", "cuisine": "Indian", "category": "Indian", "lat": 17.4, "lng": 78.4,
        "description": "Nice place", "price_range": "₹₹"}


def admin_token(role="Administrator", username="alice", **over):
    now = int(time.time())
    claims = {"iss": "secureaccess", "aud": "food-atlas-admin", "sub": "admin-1", "username": username,
              "role": role, "iat": now, "exp": now + 60, "jti": str(uuid.uuid4())}
    claims.update(over)
    return jwt.encode(claims, PRIVATE_PEM, algorithm="EdDSA")


def admin_headers(**kw):
    return {"Authorization": f"Bearer {admin_token(**kw)}"}


@pytest.fixture
def client(monkeypatch):
    import mongomock
    from fastapi.testclient import TestClient

    from app import deps
    from app.main import app
    from app.routers import admin_submissions, restaurants, saved_places, submissions

    mdb = mongomock.MongoClient(tz_aware=True).db
    for module in (restaurants, saved_places, submissions, admin_submissions):
        for name in ("restaurants", "users", "submissions"):
            if hasattr(module, name):
                monkeypatch.setattr(module, name, mdb[{"submissions": "restaurant_submissions"}.get(name, name)])
    app.dependency_overrides[deps.current_user] = lambda: dict(USER)
    yield TestClient(app)
    app.dependency_overrides.clear()
