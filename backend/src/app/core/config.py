# app/core/config.py
from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Kanta"
    PROJECT_DESCRIPTION: str = "API for uploading faces."

    # PostgreSQL
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_PORT: int = 5432
    SQLALCHEMY_DATABASE_URI: Optional[str] = None

    # Azure Blob
    AZURE_STORAGE_CONNECTION_STRING: str | None = None
    AZURE_ACCOUNT_URL: str | None = None

    # JWT_SECRET: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    BACKEND_CORS_ORIGINS: List[str] = []

    class Config:
        env_file = ".env"
        case_sensitive = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.SQLALCHEMY_DATABASE_URI = (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"
        )


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
