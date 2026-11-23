from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import ensure_indexes
from .routers import auth, restaurants


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_indexes()  # fails fast if Atlas is unreachable
    yield


settings = get_settings()
app = FastAPI(title="Food Atlas API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(auth.router)
app.include_router(restaurants.router)
app.include_router(restaurants.stats_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
