"""
tests/test_asyncpg_conn.py
==========================
Smoke‑tests an asynchronous **asyncpg** connection.
"""

from __future__ import annotations

import os
import urllib.parse
from typing import AsyncGenerator

import asyncpg
import pytest
import pytest_asyncio


def _build_dsn() -> str:
    """Return an asyncpg‑compatible DSN string."""
    return (
        f"postgresql://{urllib.parse.quote(os.getenv('DBUSER'))}:"
        f"{urllib.parse.quote(os.getenv('DBPASSWORD'))}@"
        f"{os.getenv('DBHOST')}:{os.getenv('DBPORT', 5432)}/"
        f"{os.getenv('DBNAME')}?sslmode={os.getenv('SSLMODE', 'require')}"
    )


@pytest_asyncio.fixture(scope="function")
async def conn() -> AsyncGenerator[asyncpg.Connection, None]:
    """Yield a single asyncpg connection and tear it down afterwards."""
    connection = await asyncpg.connect(_build_dsn())
    try:
        yield connection
    finally:
        await connection.close()


@pytest.mark.asyncio
async def test_async_select(conn: asyncpg.Connection) -> None:
    """Simple `SELECT 1` should succeed."""
    val = await conn.fetchval("SELECT 1;")
    assert val == 1, f"Expected 1, got {val}"


@pytest.mark.asyncio
async def test_async_temp_table(conn: asyncpg.Connection) -> None:
    """Create TEMP table, insert rows, verify count == 2."""
    await conn.execute(
        "CREATE TEMP TABLE t(id serial, name text);"
        "INSERT INTO t(name) VALUES('a'), ('b');"
    )
    rows = await conn.fetch("SELECT COUNT(*) AS c FROM t;")
    count = rows[0]["c"]
    assert count == 2, f"Expected 2 rows, got {count}"
