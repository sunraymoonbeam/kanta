"""
tests/test_psycopg2_conn.py
===========================
Smoke‑tests a synchronous psycopg2 connection.

Expected behaviour
------------------
* The connection opens and can run a trivial `SELECT 1`.
* A temporary table can be created, filled, and queried.
"""

from __future__ import annotations

import os
import urllib.parse
from contextlib import contextmanager

import psycopg2


def _build_conn_str() -> str:
    """Return a psycopg2 connection string assembled from env vars."""
    return (
        f"host={os.getenv('DBHOST')} "
        f"port={os.getenv('DBPORT', 5432)} "
        f"dbname={os.getenv('DBNAME')} "
        f"user={urllib.parse.quote(os.getenv('DBUSER'))} "
        f"password={os.getenv('DBPASSWORD')} "
        f"sslmode={os.getenv('SSLMODE', 'require')}"
    )


@contextmanager
def _cursor():
    """Context manager that yields a cursor and cleans up automatically."""
    conn = psycopg2.connect(_build_conn_str())
    conn.autocommit = True  # test isolation
    cur = conn.cursor()
    try:
        yield cur
    finally:
        cur.close()
        conn.close()


def test_basic_connection() -> None:
    """`SELECT 1` should return exactly *1*."""
    with _cursor() as cur:
        cur.execute("SELECT 1;")
        value = cur.fetchone()[0]
        assert value == 1, f"Expected 1, got {value}"


def test_temp_table_insert() -> None:
    """Create TEMP table, insert rows, verify count == 3."""
    with _cursor() as cur:
        cur.execute("CREATE TEMP TABLE inventory(id SERIAL, name TEXT, qty INT);")
        cur.executemany(
            "INSERT INTO inventory(name, qty) VALUES (%s, %s)",
            [("banana", 150), ("orange", 154), ("apple", 100)],
        )
        cur.execute("SELECT COUNT(*) FROM inventory;")
        count = cur.fetchone()[0]
        assert count == 3, f"Expected 3 rows, got {count}"
