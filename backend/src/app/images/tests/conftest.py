"""
Pytest configuration for image tests.

This file contains common fixtures and configuration for testing the images module.
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, List

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from azure.storage.blob import ContainerClient

from ..models import Image, Face


@pytest.fixture
def utc_now():
    """Return current UTC datetime."""
    return datetime.now(timezone.utc)


@pytest.fixture
def mock_async_session():
    """Return a mock async SQLAlchemy session."""
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def mock_container_client():
    """Return a mock Azure ContainerClient."""
    return MagicMock(spec=ContainerClient)


@pytest.fixture
def sample_image_dict(utc_now):
    """Return sample image data as dict."""
    return {
        "id": 1,
        "event_id": 10,
        "uuid": "test-uuid-123",
        "azure_blob_url": "https://storage.test/images/test-uuid-123.jpg",
        "file_extension": "jpg",
        "faces": 2,
        "created_at": utc_now,
        "last_modified": utc_now,
    }


@pytest.fixture
def sample_face_dict(utc_now):
    """Return sample face data as dict."""
    return {
        "id": 1,
        "event_id": 10,
        "image_id": 1,
        "bbox": {"x": 100, "y": 50, "width": 80, "height": 100},
        "embedding": [0.1] * 128,
        "cluster_id": -1,
    }


@pytest.fixture
def sample_image(sample_image_dict):
    """Return a sample Image instance."""
    return Image(**sample_image_dict)


@pytest.fixture
def sample_face(sample_face_dict):
    """Return a sample Face instance."""
    return Face(**sample_face_dict)


@pytest.fixture
def sample_upload_file():
    """Return a mock UploadFile."""
    mock_file = MagicMock()
    mock_file.content_type = "image/jpeg"
    mock_file.filename = "test_image.jpg"
    mock_file.read = AsyncMock(return_value=b"fake_image_data")
    return mock_file


@pytest.fixture
def mock_face_recognition():
    """Mock face_recognition module functions."""
    with patch('app.images.service.face_recognition') as mock_fr:
        mock_fr.face_locations.return_value = [(10, 90, 110, 10)]  # (top, right, bottom, left)
        mock_fr.face_encodings.return_value = [[0.1] * 128]
        yield mock_fr


@pytest.fixture
def mock_pil_image():
    """Mock PIL Image operations."""
    with patch('app.images.service.PILImage') as mock_pil:
        mock_img = MagicMock()
        mock_pil.open.return_value.convert.return_value = mock_img
        yield mock_pil