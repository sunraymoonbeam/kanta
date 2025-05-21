# app/core/db.py

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base

from ..core.config import settings

# e.g. "postgresql+asyncpg://user:pass@host:5432/dbname"
engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, echo=False, pool_size=5)

# expire_on_commit=False prevents attributes being expired after commit
AsyncSessionLocal = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that yields a SQLAlchemy AsyncSession and ensures
    it is closed/released back to the pool.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
