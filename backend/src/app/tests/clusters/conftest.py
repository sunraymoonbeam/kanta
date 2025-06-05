"""
Pytest configuration for clusters tests.

This file contains common fixtures and configuration for testing the clusters module.
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

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


@pytest.fixture
def sample_event():
    """Sample event object for testing."""
    event = MagicMock()
    event.id = 1
    event.code = "test-event"
    event.name = "Test Event"
    return event


@pytest.fixture
def sample_face_embedding():
    """Sample 128-dimensional face embedding."""
    return [0.1] * 128


@pytest.fixture
def sample_bbox():
    """Sample bounding box dictionary."""
    return {"x": 100, "y": 150, "width": 200, "height": 250}