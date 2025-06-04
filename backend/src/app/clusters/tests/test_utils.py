"""
Unit tests for the clusters utils module.
"""
import json
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Tuple, Any

import numpy as np
import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..utils import recluster_event_faces
from ...images.models import Face


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
def sample_face_data():
    """Sample face data with embeddings."""
    return [
        (1, [0.1, 0.2, 0.3] + [0.0] * 125),  # Face ID 1 with 128-dim embedding
        (2, [0.15, 0.25, 0.35] + [0.0] * 125),  # Face ID 2, similar to face 1
        (3, [0.8, 0.9, 0.7] + [0.0] * 125),  # Face ID 3, different cluster
        (4, [0.85, 0.95, 0.75] + [0.0] * 125),  # Face ID 4, similar to face 3
        (5, [0.5, 0.5, 0.5] + [0.0] * 125),  # Face ID 5, potential noise
    ]


@pytest.fixture
def sample_face_data_json():
    """Sample face data with JSON string embeddings."""
    return [
        (1, json.dumps([0.1, 0.2, 0.3] + [0.0] * 125)),
        (2, json.dumps([0.15, 0.25, 0.35] + [0.0] * 125)),
        (3, json.dumps([0.8, 0.9, 0.7] + [0.0] * 125)),
    ]


class TestReclusterEventFaces:
    """Tests for the recluster_event_faces function."""

    @pytest.mark.asyncio
    async def test_recluster_event_faces_success(self, mock_db, mock_event, sample_face_data):
        """Test successful reclustering of event faces."""
        # Setup mocks
        mock_result = MagicMock()
        mock_result.all.return_value = sample_face_data
        mock_db.execute.return_value = mock_result

        # Mock DBSCAN clustering results
        # Assuming faces 1,2 cluster together (label 0), faces 3,4 together (label 1), face 5 is noise (label -1)
        mock_labels = np.array([0, 0, 1, 1, -1])

        with patch("app.clusters.utils.get_event", return_value=mock_event) as mock_get_event, \
             patch("app.clusters.utils.DBSCAN") as mock_dbscan_class:

            # Setup DBSCAN mock
            mock_dbscan_instance = MagicMock()
            mock_dbscan_instance.fit.return_value = mock_dbscan_instance
            mock_dbscan_instance.labels_ = mock_labels
            mock_dbscan_class.return_value = mock_dbscan_instance

            # Execute
            await recluster_event_faces(mock_db, "test-event", eps=0.4, min_samples=2)

            # Assert
            mock_get_event.assert_called_once_with(mock_db, "test-event")
            mock_db.execute.assert_called()  # Called for select query and updates
            
            # Check DBSCAN was configured correctly
            mock_dbscan_class.assert_called_once_with(eps=0.4, min_samples=2, metric="cosine")
            mock_dbscan_instance.fit.assert_called_once()
            
            # Check that face updates were called
            assert mock_db.execute.call_count >= len(sample_face_data)  # Select + updates
            mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_recluster_event_faces_json_embeddings(self, mock_db, mock_event, sample_face_data_json):
        """Test reclustering with JSON string embeddings."""
        # Setup mocks
        mock_result = MagicMock()
        mock_result.all.return_value = sample_face_data_json
        mock_db.execute.return_value = mock_result

        mock_labels = np.array([0, 0, 1])

        with patch("app.clusters.utils.get_event", return_value=mock_event), \
             patch("app.clusters.utils.DBSCAN") as mock_dbscan_class:

            # Setup DBSCAN mock
            mock_dbscan_instance = MagicMock()
            mock_dbscan_instance.fit.return_value = mock_dbscan_instance
            mock_dbscan_instance.labels_ = mock_labels
            mock_dbscan_class.return_value = mock_dbscan_instance

            # Execute
            await recluster_event_faces(mock_db, "test-event")

            # Assert that JSON strings were properly parsed
            fit_call_args = mock_dbscan_instance.fit.call_args[0][0]
            assert isinstance(fit_call_args, np.ndarray)
            assert fit_call_args.shape == (3, 128)
            # Check that first embedding was correctly parsed from JSON
            np.testing.assert_array_almost_equal(fit_call_args[0][:3], [0.1, 0.2, 0.3])

    @pytest.mark.asyncio
    async def test_recluster_event_faces_event_not_found(self, mock_db):
        """Test reclustering when event doesn't exist."""
        with patch("app.clusters.utils.DBSCAN", MagicMock()), \
             patch("app.clusters.utils.get_event", side_effect=HTTPException(404, "Event not found")):
            with pytest.raises(HTTPException) as excinfo:
                await recluster_event_faces(mock_db, "nonexistent-event")

            assert excinfo.value.status_code == 404

    @pytest.mark.asyncio
    async def test_recluster_event_faces_dbscan_not_available(self, mock_db):
        """Test reclustering when DBSCAN is not available."""
        with patch("app.clusters.utils.DBSCAN", None):
            with pytest.raises(HTTPException) as excinfo:
                await recluster_event_faces(mock_db, "test-event")

            assert excinfo.value.status_code == 500
            assert "DBSCAN clustering not available" in str(excinfo.value.detail)

    @pytest.mark.asyncio
    async def test_recluster_event_faces_no_faces(self, mock_db, mock_event):
        """Test reclustering when event has no faces."""
        # Setup mocks for empty result
        mock_result = MagicMock()
        mock_result.all.return_value = []
        mock_db.execute.return_value = mock_result

        with patch("app.clusters.utils.DBSCAN", MagicMock()), \
             patch("app.clusters.utils.get_event", return_value=mock_event):
            # Execute
            await recluster_event_faces(mock_db, "test-event")

            # Assert that function returns early without clustering
            mock_db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_recluster_event_faces_default_parameters(self, mock_db, mock_event, sample_face_data):
        """Test reclustering with default DBSCAN parameters."""
        # Setup mocks
        mock_result = MagicMock()
        mock_result.all.return_value = sample_face_data
        mock_db.execute.return_value = mock_result

        mock_labels = np.array([0, 0, 1, 1, -1])

        with patch("app.clusters.utils.get_event", return_value=mock_event), \
             patch("app.clusters.utils.DBSCAN") as mock_dbscan_class:

            # Setup DBSCAN mock
            mock_dbscan_instance = MagicMock()
            mock_dbscan_instance.fit.return_value = mock_dbscan_instance
            mock_dbscan_instance.labels_ = mock_labels
            mock_dbscan_class.return_value = mock_dbscan_instance

            # Execute with defaults
            await recluster_event_faces(mock_db, "test-event")

            # Assert default parameters
            mock_dbscan_class.assert_called_once_with(eps=0.5, min_samples=5, metric="cosine")

    @pytest.mark.asyncio
    async def test_recluster_event_faces_sql_queries(self, mock_db, mock_event, sample_face_data):
        """Test that correct SQL queries are executed."""
        # Setup mocks
        mock_result = MagicMock()
        mock_result.all.return_value = sample_face_data
        mock_db.execute.return_value = mock_result

        mock_labels = np.array([0, 0, 1, 1, -1])

        with patch("app.clusters.utils.get_event", return_value=mock_event), \
             patch("app.clusters.utils.DBSCAN") as mock_dbscan_class:

            # Setup DBSCAN mock
            mock_dbscan_instance = MagicMock()
            mock_dbscan_instance.fit.return_value = mock_dbscan_instance
            mock_dbscan_instance.labels_ = mock_labels
            mock_dbscan_class.return_value = mock_dbscan_instance

            # Execute
            await recluster_event_faces(mock_db, "test-event")

            # Assert SQL queries
            # Should be called for: 1) select faces, 2-6) update each face
            expected_call_count = 1 + len(sample_face_data)
            assert mock_db.execute.call_count == expected_call_count

    @pytest.mark.asyncio
    async def test_recluster_event_faces_embedding_matrix_construction(self, mock_db, mock_event):
        """Test proper construction of embedding matrix from mixed data types."""
        # Mix of list and JSON string embeddings
        mixed_face_data = [
            (1, [0.1, 0.2, 0.3] + [0.0] * 125),  # List
            (2, json.dumps([0.15, 0.25, 0.35] + [0.0] * 125)),  # JSON string
            (3, np.array([0.8, 0.9, 0.7] + [0.0] * 125).tolist()),  # List from numpy
        ]

        mock_result = MagicMock()
        mock_result.all.return_value = mixed_face_data
        mock_db.execute.return_value = mock_result

        mock_labels = np.array([0, 0, 1])

        with patch("app.clusters.utils.get_event", return_value=mock_event), \
             patch("app.clusters.utils.DBSCAN") as mock_dbscan_class:

            # Setup DBSCAN mock
            mock_dbscan_instance = MagicMock()
            mock_dbscan_instance.fit.return_value = mock_dbscan_instance
            mock_dbscan_instance.labels_ = mock_labels
            mock_dbscan_class.return_value = mock_dbscan_instance

            # Execute
            await recluster_event_faces(mock_db, "test-event")

            # Assert embedding matrix shape and values
            fit_call_args = mock_dbscan_instance.fit.call_args[0][0]
            assert isinstance(fit_call_args, np.ndarray)
            assert fit_call_args.shape == (3, 128)
            assert fit_call_args.dtype == float

            # Check specific values were correctly processed
            np.testing.assert_array_almost_equal(fit_call_args[0][:3], [0.1, 0.2, 0.3])
            np.testing.assert_array_almost_equal(fit_call_args[1][:3], [0.15, 0.25, 0.35])
            np.testing.assert_array_almost_equal(fit_call_args[2][:3], [0.8, 0.9, 0.7])

    @pytest.mark.asyncio
    async def test_recluster_event_faces_cluster_label_assignment(self, mock_db, mock_event, sample_face_data):
        """Test that cluster labels are correctly assigned to faces."""
        # Setup mocks
        mock_result = MagicMock()
        mock_result.all.return_value = sample_face_data
        mock_db.execute.return_value = mock_result

        # Specific label assignment: [1, 0, -1, 0, 1]
        mock_labels = np.array([1, 0, -1, 0, 1])

        captured_updates = []

        def capture_execute(query, *args, **kwargs):
            if hasattr(query, 'compile'):
                # This is an update query
                captured_updates.append((query, args, kwargs))
            return mock_result

        mock_db.execute.side_effect = capture_execute

        with patch("app.clusters.utils.get_event", return_value=mock_event), \
             patch("app.clusters.utils.DBSCAN") as mock_dbscan_class:

            # Setup DBSCAN mock
            mock_dbscan_instance = MagicMock()
            mock_dbscan_instance.fit.return_value = mock_dbscan_instance
            mock_dbscan_instance.labels_ = mock_labels
            mock_dbscan_class.return_value = mock_dbscan_instance

            # Execute
            await recluster_event_faces(mock_db, "test-event")

            # Assert that updates were made for each face with correct labels
            # First call is the select, subsequent calls are updates
            update_calls = captured_updates[1:]  # Skip the first select call
            assert len(update_calls) == 5

    @pytest.mark.asyncio
    async def test_recluster_event_faces_single_face(self, mock_db, mock_event):
        """Test reclustering with only one face (edge case)."""
        single_face_data = [(1, [0.1] * 128)]

        mock_result = MagicMock()
        mock_result.all.return_value = single_face_data
        mock_db.execute.return_value = mock_result

        # Single face will likely be labeled as noise (-1) with min_samples > 1
        mock_labels = np.array([-1])

        with patch("app.clusters.utils.get_event", return_value=mock_event), \
             patch("app.clusters.utils.DBSCAN") as mock_dbscan_class:

            # Setup DBSCAN mock
            mock_dbscan_instance = MagicMock()
            mock_dbscan_instance.fit.return_value = mock_dbscan_instance
            mock_dbscan_instance.labels_ = mock_labels
            mock_dbscan_class.return_value = mock_dbscan_instance

            # Execute
            await recluster_event_faces(mock_db, "test-event", min_samples=2)

            # Assert clustering still works with single face
            mock_dbscan_instance.fit.assert_called_once()
            fit_call_args = mock_dbscan_instance.fit.call_args[0][0]
            assert fit_call_args.shape == (1, 128)