from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # extra="ignore": old variables such as ADMIN_EMAILS in an existing .env are simply unused now.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"  # "production" turns off /docs and /openapi.json
    mongo_uri: str
    mongo_db: str = "FoodAtlas"
    firebase_project_id: str
    cors_origins: str = "http://localhost:5173"

    # --- Admin review (SecureAccess) -------------------------------------------------
    # PUBLIC half of the key pair SecureAccess signs admin tokens with. Safe to store in
    # the host's environment settings; useless for forging tokens. Empty = admin API off.
    secureaccess_public_key: str = ""
    secureaccess_issuer: str = "secureaccess"
    admin_token_audience: str = "food-atlas-admin"

    # --- Abuse limits for restaurant submissions ---------------------------------------
    max_pending_per_user: int = 5
    max_submissions_per_day: int = 10

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
