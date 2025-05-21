# app/core/db.py

from typing import Any

import asyncpg

from ..core.config import settings


class Database:
    """Wraps an asyncpg.Pool for raw SQL queries."""

    def __init__(self, dsn: str, min_size: int = 1, max_size: int = 5):
        self._dsn = dsn
        self._min = min_size
        self._max = max_size
        self._pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        """Initialize the connection pool (call on startup)."""
        if self._pool is None:
            self._pool = await asyncpg.create_pool(
                dsn=self._dsn, min_size=self._min, max_size=self._max
            )

    async def close(self) -> None:
        """Close the pool (call on shutdown)."""
        if self._pool:
            await self._pool.close()
            self._pool = None

    async def fetch(self, sql: str, *args: Any) -> list[asyncpg.Record]:
        """Fetch multiple rows."""
        assert self._pool, "Pool not initialized"
        async with self._pool.acquire() as conn:
            return await conn.fetch(sql, *args)

    async def execute(self, sql: str, *args: Any) -> None:
        """Fire-and-forget statements (INSERT/UPDATE/DELETE)."""
        assert self._pool, "Pool not initialized"
        async with self._pool.acquire() as conn:
            await conn.execute(sql, *args)


# create a single, global Database instance
db = Database(settings.ASYNC_PG_DSN)


async def get_db() -> Database:
    """
    Dependency that returns the Database wrapper.
    Its methods will acquire/release connections as needed.
    """
    return db
