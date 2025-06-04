"""
Pytest configuration for event tests.

This file contains common fixtures and configuration for testing the events module.
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
def utc_now():
    """Return current UTC datetime."""
    return datetime.now(timezone.utc)


@pytest.fixture
def mock_async_session():
    """Return a mock async SQLAlchemy session."""
    return AsyncMock(spec=AsyncSession)


class Image:
    pass
