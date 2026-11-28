from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import ensure_indexes
from .routers import admin_submissions, auth, restaurants, saved_places, submissions

from .routers import admin_submissions, auth, profile, restaurants, saved_places, submissions

@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_indexes()  # fails fast if Atlas is unreachable
    yield


settings = get_settings()
prod = settings.is_production
app = FastAPI(
    title="Food Atlas API",
    version="3.0.0",
    lifespan=lifespan,
    # In production the interactive docs would advertise the private admin routes.
    docs_url=None if prod else "/docs",
    redoc_url=None if prod else "/redoc",
    openapi_url=None if prod else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

# Responses that involve a person's identity or admin data must never be cached.
_NO_STORE = ("/api/auth", "/api/submissions", "/api/users", "/api/internal")


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    if request.url.path.startswith(_NO_STORE):
        response.headers["Cache-Control"] = "no-store"
    return response


app.include_router(auth.router)
app.include_router(restaurants.router)
app.include_router(restaurants.stats_router)
app.include_router(saved_places.router)
app.include_router(submissions.router)
app.include_router(admin_submissions.router)
app.include_router(submissions.router)
app.include_router(profile.router)
app.include_router(admin_submissions.router)

@app.get("/api/health")
def health():
    return {"status": "ok"}
