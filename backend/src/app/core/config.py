# app/core/config.py
from functools import lru_cache
from typing import List, Optional, Union

from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Kanta"
    PROJECT_DESCRIPTION: str = "API for uploading faces."

    # PostgreSQL
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_PORT: Union[int, str] = 5432
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

    # Validators to ensure correct types for environment variables
    @field_validator('POSTGRES_PORT', mode='before')
    @classmethod
    def parse_postgres_port(cls, v):
        """Convert POSTGRES_PORT to int if it's a string."""
        if isinstance(v, str):
            try:
                return int(v)
            except ValueError:
                raise ValueError("POSTGRES_PORT must be an integer.")

@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
