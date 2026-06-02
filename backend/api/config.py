from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "PIC 1746 API"
    auth_mode: str = "mock"
    jwt_secret: str = "dev-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_minutes: int = 1440
    oidc_issuer: str = "http://localhost:8000/auth"
    oidc_audience: str = "pic-api"
    duckdb_path: str = "data/pic.duckdb"
    cache_ttl_seconds: int = 600 # tempo de vida no cache da api (filtros e queries)
    cors_origins: str = "http://localhost:3000"

    @property
    def duckdb_file(self) -> Path:
        path = Path(self.duckdb_path)
        if path.is_absolute():
            return path
        project_root = Path(__file__).resolve().parents[2]
        return (project_root / path).resolve()

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
