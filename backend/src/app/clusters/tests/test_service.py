"""
Unit tests for the clusters service module.
"""
import json
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest
from fastapi import HTTPException
from PIL import Image as PILImage
from sqlalchemy.ext.asyncio import AsyncSession

from ..schemas import ClusterInfo, SimilarFaceOut
from ..service import get_cluster_summary, find_similar_faces


@pytest.fixture
def mock_db():
    """Mock AsyncSession for testing."""
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def mock_event():
    """Mock event object."""
    event = MagicMock()
    event.id = 1
    event.code = "test-event"
    return event


@pytest.fixture
def sample_cluster_data():
    """Sample cluster query results."""
    return [
        {
            "cluster_id": 0,
            "face_count": 3,
            "face_id": 1,
            "sample_blob_url": "https://storage.test/event/image1.jpg",
            "sample_bbox": '{"x": 100, "y": 150, "width": 200, "height": 250}',
        },
        {
            "cluster_id": 0,
            "face_count": 3,
            "face_id": 2,
            "sample_blob_url": "https://storage.test/event/image2.jpg",
            "sample_bbox": {"x": 120, "y": 160, "width": 180, "height": 240},
        },
        {
            "cluster_id": 1,
            "face_count": 5,
            "face_id": 3,
            "sample_blob_url": "https://storage.test/event/image3.jpg",
            "sample_bbox": {"x": 80, "y": 90, "width": 220, "height": 280},
        },
    ]


@pytest.fixture
def sample_similar_faces_data():
    """Sample similar faces query results."""
    embedding = [0.1] * 128
    return [
        {
            "face_id": 1,
            "image_uuid": "550e8400-e29b-41d4-a716-446655440000",
            "azure_blob_url": "https://storage.test/event/image1.jpg",
            "cluster_id": 0,
            "bbox": '{"x": 100, "y": 150, "width": 200, "height": 250}',
            "embedding": json.dumps(embedding),
            "distance": 0.25,
        },
        {
            "face_id": 2,
            "image_uuid": "550e8400-e29b-41d4-a716-446655440001",
            "azure_blob_url": "https://storage.test/event/image2.jpg",
            "cluster_id": 0,
            "bbox": {"x": 120, "y": 160, "width": 180, "height": 240},
            "embedding": embedding,
            "distance": 0.45,
        },
    ]


@pytest.fixture
def test_image_bytes():
    """Generate test image bytes."""
    img = PILImage.new("RGB", (300, 300), color="red")
    img_bytes = BytesIO()
    img.save(img_bytes, format="JPEG")
    return img_bytes.getvalue()


class TestGetClusterSummary:
    """Tests for the get_cluster_summary function."""

    @pytest.mark.asyncio
    async def test_get_cluster_summary_success(self, mock_db, mock_event, sample_cluster_data):
        """Test successful cluster summary retrieval."""
        # Setup mocks
        mock_result = MagicMock()
        mock_result.mappings().all.return_value = sample_cluster_data
        mock_db.execute.return_value = mock_result

        with patch("app.clusters.service.get_event", return_value=mock_event) as mock_get_event:
            # Execute
            result = await get_cluster_summary(mock_db, "test-event", 2)

            # Assert
            mock_get_event.assert_called_once_with(mock_db, "test-event")
            mock_db.execute.assert_called_once()
            
            assert len(result) == 2  # Two clusters
            
            # Check first cluster
            cluster_0 = next(c for c in result if c.cluster_id == 0)
            assert cluster_0.face_count == 3
            assert len(cluster_0.samples) == 2
            assert cluster_0.samples[0].face_id == 1
            assert cluster_0.samples[1].face_id == 2
            
            # Check bbox parsing (string to dict)
            assert cluster_0.samples[0].sample_bbox == {"x": 100, "y": 150, "width": 200, "height": 250}
            # Check bbox already as dict
            assert cluster_0.samples[1].sample_bbox == {"x": 120, "y": 160, "width": 180, "height": 240}
            
            # Check second cluster
            cluster_1 = next(c for c in result if c.cluster_id == 1)
            assert cluster_1.face_count == 5
            assert len(cluster_1.samples) == 1
            assert cluster_1.samples[0].face_id == 3

    @pytest.mark.asyncio
    async def test_get_cluster_summary_event_not_found(self, mock_db):
        """Test cluster summary when event doesn't exist."""
        with patch("app.clusters.service.get_event", side_effect=HTTPException(404, "Event not found")):
            with pytest.raises(HTTPException) as excinfo:
                await get_cluster_summary(mock_db, "nonexistent-event", 2)
            
            assert excinfo.value.status_code == 404

    @pytest.mark.asyncio
    async def test_get_cluster_summary_empty_result(self, mock_db, mock_event):
        """Test cluster summary with no clusters."""
        # Setup mocks
        mock_result = MagicMock()
        mock_result.mappings().all.return_value = []
        mock_db.execute.return_value = mock_result

        with patch("app.clusters.service.get_event", return_value=mock_event):
            # Execute
            result = await get_cluster_summary(mock_db, "test-event", 2)

            # Assert
            assert len(result) == 0

    @pytest.mark.asyncio
    async def test_get_cluster_summary_sql_parameters(self, mock_db, mock_event, sample_cluster_data):
        """Test that SQL parameters are correctly passed."""
        # Setup mocks
        mock_result = MagicMock()
        mock_result.mappings().all.return_value = sample_cluster_data
        mock_db.execute.return_value = mock_result

        with patch("app.clusters.service.get_event", return_value=mock_event):
            # Execute
            await get_cluster_summary(mock_db, "test-event", 5)

            # Assert SQL parameters
            call_args = mock_db.execute.call_args
            sql_params = call_args[0][1]
            assert sql_params["event_id"] == mock_event.id
            assert sql_params["limit"] == 5


class TestFindSimilarFaces:
    """Tests for the find_similar_faces function."""

    @pytest.mark.asyncio
    async def test_find_similar_faces_success_cosine(self, mock_db, mock_event, test_image_bytes, sample_similar_faces_data):
        """Test successful similar faces search with cosine metric."""
        # Setup mocks
        mock_result = MagicMock()
        mock_result.mappings().all.return_value = sample_similar_faces_data
        mock_db.execute.return_value = mock_result

        # Mock face recognition
        mock_boxes = [(150, 250, 350, 50)]  # (top, right, bottom, left)
        mock_embedding = np.array([0.1] * 128)

        with patch("app.clusters.service.get_event", return_value=mock_event) as mock_get_event, \
             patch("face_recognition.face_locations", return_value=mock_boxes) as mock_face_locations, \
             patch("face_recognition.face_encodings", return_value=[mock_embedding]) as mock_face_encodings:

            # Execute
            result = await find_similar_faces(mock_db, "test-event", test_image_bytes, "cosine", 2)

            # Assert
            mock_get_event.assert_called_once_with(mock_db, "test-event")
            mock_face_locations.assert_called_once()
            mock_face_encodings.assert_called_once()
            mock_db.execute.assert_called_once()
            
            assert len(result) == 2
            
            # Check first result
            assert result[0].face_id == 1
            assert result[0].image_uuid == "550e8400-e29b-41d4-a716-446655440000"
            assert result[0].cluster_id == 0
            assert result[0].distance == 0.25
            assert result[0].bbox == {"x": 100, "y": 150, "width": 200, "height": 250}
            assert len(result[0].embedding) == 128
            
            # Check second result
            assert result[1].face_id == 2
            assert result[1].distance == 0.45

    @pytest.mark.asyncio
    async def test_find_similar_faces_success_l2(self, mock_db, mock_event, test_image_bytes, sample_similar_faces_data):
        """Test successful similar faces search with L2 metric."""
        # Setup mocks
        mock_result = MagicMock()
        mock_result.mappings().all.return_value = sample_similar_faces_data
        mock_db.execute.return_value = mock_result

        mock_boxes = [(150, 250, 350, 50)]
        mock_embedding = np.array([0.1] * 128)

        with patch("app.clusters.service.get_event", return_value=mock_event), \
             patch("face_recognition.face_locations", return_value=mock_boxes), \
             patch("face_recognition.face_encodings", return_value=[mock_embedding]):

            # Execute
            result = await find_similar_faces(mock_db, "test-event", test_image_bytes, "l2", 2)

            # Assert SQL query uses correct operator
            call_args = mock_db.execute.call_args
            sql_query = str(call_args[0][0])
            assert "<->" in sql_query  # L2 operator

    @pytest.mark.asyncio
    async def test_find_similar_faces_sql_parameters(self, mock_db, mock_event, test_image_bytes, sample_similar_faces_data):
        """Test that SQL parameters are correctly passed."""
        # Setup mocks
        mock_result = MagicMock()
        mock_result.mappings().all.return_value = sample_similar_faces_data
        mock_db.execute.return_value = mock_result

        mock_boxes = [(150, 250, 350, 50)]
        mock_embedding = np.array([0.1, 0.2, 0.3] + [0.0] * 125)

        with patch("app.clusters.service.get_event", return_value=mock_event), \
             patch("face_recognition.face_locations", return_value=mock_boxes), \
             patch("face_recognition.face_encodings", return_value=[mock_embedding]):

            # Execute
            await find_similar_faces(mock_db, "test-event", test_image_bytes, "cosine", 5)

            # Assert SQL parameters
            call_args = mock_db.execute.call_args
            sql_params = call_args[0][1]
            assert sql_params["event_id"] == mock_event.id
            assert sql_params["limit"] == 5
            
            # Check vector literal format
            vector_literal = sql_params["vector"]
            assert vector_literal.startswith("[")
            assert vector_literal.endswith("]")
            assert "0.1,0.2,0.3" in vector_literal

    @pytest.mark.asyncio
    async def test_find_similar_faces_invalid_image(self, mock_db):
        """Test find similar faces with invalid image data."""
        invalid_image_bytes = b"not-an-image"

        with pytest.raises(HTTPException) as excinfo:
            await find_similar_faces(mock_db, "test-event", invalid_image_bytes, "cosine", 2)

        assert excinfo.value.status_code == 400
        assert "Invalid image data" in str(excinfo.value.detail)

    @pytest.mark.asyncio
    async def test_find_similar_faces_no_face_detected(self, mock_db, test_image_bytes):
        """Test find similar faces when no face is detected."""
        with patch("face_recognition.face_locations", return_value=[]):
            with pytest.raises(HTTPException) as excinfo:
                await find_similar_faces(mock_db, "test-event", test_image_bytes, "cosine", 2)

            assert excinfo.value.status_code == 400
            assert "No face detected" in str(excinfo.value.detail)

    @pytest.mark.asyncio
    async def test_find_similar_faces_multiple_faces_detected(self, mock_db, test_image_bytes):
        """Test find similar faces when multiple faces are detected."""
        mock_boxes = [
            (150, 250, 350, 50),
            (200, 300, 400, 100),
        ]

        with patch("face_recognition.face_locations", return_value=mock_boxes):
            with pytest.raises(HTTPException) as excinfo:
                await find_similar_faces(mock_db, "test-event", test_image_bytes, "cosine", 2)

            assert excinfo.value.status_code == 400
            assert "Multiple faces detected" in str(excinfo.value.detail)

    @pytest.mark.asyncio
    async def test_find_similar_faces_event_not_found(self, mock_db, test_image_bytes):
        """Test find similar faces when event doesn't exist."""
        mock_boxes = [(150, 250, 350, 50)]
        mock_embedding = np.array([0.1] * 128)

        with patch("app.clusters.service.get_event", side_effect=HTTPException(404, "Event not found")), \
             patch("face_recognition.face_locations", return_value=mock_boxes), \
             patch("face_recognition.face_encodings", return_value=[mock_embedding]):

            with pytest.raises(HTTPException) as excinfo:
                await find_similar_faces(mock_db, "nonexistent-event", test_image_bytes, "cosine", 2)

            assert excinfo.value.status_code == 404

    @pytest.mark.asyncio
    async def test_find_similar_faces_empty_result(self, mock_db, mock_event, test_image_bytes):
        """Test find similar faces with no matches."""
        # Setup mocks
        mock_result = MagicMock()
        mock_result.mappings().all.return_value = []
        mock_db.execute.return_value = mock_result

        mock_boxes = [(150, 250, 350, 50)]
        mock_embedding = np.array([0.1] * 128)

        with patch("app.clusters.service.get_event", return_value=mock_event), \
             patch("face_recognition.face_locations", return_value=mock_boxes), \
             patch("face_recognition.face_encodings", return_value=[mock_embedding]):

            # Execute
            result = await find_similar_faces(mock_db, "test-event", test_image_bytes, "cosine", 2)

            # Assert
            assert len(result) == 0

    @pytest.mark.asyncio
    async def test_find_similar_faces_pil_image_conversion(self, mock_db, mock_event):
        """Test PIL image conversion and face detection workflow."""
        # Create a simple test image
        img = PILImage.new("RGB", (100, 100), color="blue")
        img_bytes = BytesIO()
        img.save(img_bytes, format="PNG")
        test_bytes = img_bytes.getvalue()

        mock_boxes = [(25, 75, 75, 25)]
        mock_embedding = np.array([0.5] * 128)
        mock_result = MagicMock()
        mock_result.mappings().all.return_value = []
        mock_db.execute.return_value = mock_result

        with patch("app.clusters.service.get_event", return_value=mock_event), \
             patch("face_recognition.face_locations", return_value=mock_boxes) as mock_face_locations, \
             patch("face_recognition.face_encodings", return_value=[mock_embedding]):

            # Execute
            await find_similar_faces(mock_db, "test-event", test_bytes, "cosine", 1)

            # Assert face_recognition was called with numpy array
            args, kwargs = mock_face_locations.call_args
            img_array = args[0]
            assert isinstance(img_array, np.ndarray)
            assert img_array.shape == (100, 100, 3)  # Height, Width, Channels
            assert kwargs.get("model") == "hog"