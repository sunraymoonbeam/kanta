"""
Unit tests for the images service.
"""
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch, call
import pytest
from fastapi import HTTPException

from ..service import (
    get_images,
    get_image_detail,
    do_face_recognition,
    full_processing_job,
    delete_image,
)
from ..models import Image, Face
from ..schemas import ImageListItem, ImageDetailResponse, FaceSummary


class TestGetImages:
    """Tests for the get_images service function."""

    @pytest.mark.asyncio
    async def test_get_images_basic(self, mock_async_session, utc_now):
        """Test basic get_images functionality."""
        # Mock event lookup
        mock_event = MagicMock()
        mock_event.id = 1
        
        # Mock database query result with proper attributes for Pydantic
        mock_images = [
            MagicMock(
                id=1, 
                uuid="img1", 
                faces=2,
                azure_blob_url="https://storage.test/img1.jpg",
                file_extension="jpg",
                created_at=utc_now,
                last_modified=utc_now
            ),
            MagicMock(
                id=2, 
                uuid="img2", 
                faces=1,
                azure_blob_url="https://storage.test/img2.png",
                file_extension="png",
                created_at=utc_now,
                last_modified=utc_now
            ),
        ]
        
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = mock_images
        mock_async_session.execute.return_value = mock_result
        
        with patch('app.events.service.get_event') as mock_get_event:
            mock_get_event.return_value = mock_event
            
            result = await get_images(
                db=mock_async_session,
                event_code="test-event",
                limit=10,
                offset=0,
                date_from=None,
                date_to=None,
                min_faces=None,
                max_faces=None,
                cluster_list_id=None,
            )
        
        assert len(result) == 2
        assert result[0].uuid == "img1"
        assert result[1].uuid == "img2"
        mock_async_session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_images_with_filters(self, mock_async_session, utc_now):
        """Test get_images with various filters."""
        mock_event = MagicMock()
        mock_event.id = 1
        
        mock_images = [MagicMock(
            id=1, 
            uuid="filtered", 
            faces=3,
            azure_blob_url="https://storage.test/filtered.jpg",
            file_extension="jpg",
            created_at=utc_now,
            last_modified=utc_now
        )]
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = mock_images
        mock_async_session.execute.return_value = mock_result
        
        with patch('app.events.service.get_event') as mock_get_event:
            mock_get_event.return_value = mock_event
            
            result = await get_images(
                db=mock_async_session,
                event_code="test-event",
                limit=5,
                offset=10,
                date_from=utc_now - timedelta(days=1),
                date_to=utc_now + timedelta(days=1),
                min_faces=1,
                max_faces=5,
                cluster_list_id=[1, 2, 3],
            )
        
        assert len(result) == 1
        assert result[0].uuid == "filtered"
        mock_async_session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_images_event_not_found(self, mock_async_session):
        """Test get_images when event is not found."""
        from app.events.exceptions import EventNotFound
        
        with patch('app.events.service.get_event') as mock_get_event:
            mock_get_event.side_effect = EventNotFound("nonexistent")
            
            with pytest.raises(EventNotFound):
                await get_images(
                    db=mock_async_session,
                    event_code="nonexistent",
                    limit=10,
                    offset=0,
                    date_from=None,
                    date_to=None,
                    min_faces=None,
                    max_faces=None,
                    cluster_list_id=None,
                )


class TestGetImageDetail:
    """Tests for the get_image_detail service function."""

    @pytest.mark.asyncio
    async def test_get_image_detail_success(self, mock_async_session, sample_image, sample_face):
        """Test successful image detail retrieval."""
        # Setup image with faces
        sample_image.faces_rel = [sample_face]
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_image
        mock_async_session.execute.return_value = mock_result
        
        result = await get_image_detail(mock_async_session, "test-uuid-123")
        
        assert isinstance(result, ImageDetailResponse)
        assert result.image.uuid == "test-uuid-123"
        assert len(result.faces) == 1
        assert result.faces[0].face_id == sample_face.id

    @pytest.mark.asyncio
    async def test_get_image_detail_not_found(self, mock_async_session):
        """Test image detail retrieval when image not found."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_async_session.execute.return_value = mock_result
        
        with pytest.raises(HTTPException) as excinfo:
            await get_image_detail(mock_async_session, "nonexistent-uuid")
        
        assert excinfo.value.status_code == 404
        assert "not found" in str(excinfo.value.detail)

    @pytest.mark.asyncio
    async def test_get_image_detail_no_faces(self, mock_async_session, sample_image):
        """Test image detail retrieval for image with no faces."""
        sample_image.faces_rel = []
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_image
        mock_async_session.execute.return_value = mock_result
        
        result = await get_image_detail(mock_async_session, "test-uuid-123")
        
        assert isinstance(result, ImageDetailResponse)
        assert len(result.faces) == 0


class TestDoFaceRecognition:
    """Tests for the do_face_recognition function."""

    def test_do_face_recognition_success(self, mock_face_recognition, mock_pil_image):
        """Test successful face recognition."""
        fake_image_data = b"fake_image_bytes"
        
        # Mock PIL Image operations
        mock_img = MagicMock()
        mock_pil_image.open.return_value.convert.return_value = mock_img
        
        # Mock numpy array conversion
        with patch('app.images.service.np.array', return_value=mock_img):
            boxes, embeddings = do_face_recognition(fake_image_data)
        
        assert boxes == [(10, 90, 110, 10)]
        assert embeddings == [[0.1] * 128]
        mock_face_recognition.face_locations.assert_called_once()
        mock_face_recognition.face_encodings.assert_called_once()

    def test_do_face_recognition_no_faces(self, mock_face_recognition, mock_pil_image):
        """Test face recognition when no faces are found."""
        fake_image_data = b"fake_image_bytes"
        
        # Mock no faces detected
        mock_face_recognition.face_locations.return_value = []
        mock_face_recognition.face_encodings.return_value = []
        
        mock_img = MagicMock()
        mock_pil_image.open.return_value.convert.return_value = mock_img
        
        with patch('app.images.service.np.array', return_value=mock_img):
            boxes, embeddings = do_face_recognition(fake_image_data)
        
        assert boxes == []
        assert embeddings == []

    def test_do_face_recognition_multiple_faces(self, mock_face_recognition, mock_pil_image):
        """Test face recognition with multiple faces."""
        fake_image_data = b"fake_image_bytes"
        
        # Mock multiple faces
        mock_face_recognition.face_locations.return_value = [
            (10, 90, 110, 10),
            (150, 240, 250, 150)
        ]
        mock_face_recognition.face_encodings.return_value = [
            [0.1] * 128,
            [0.2] * 128
        ]
        
        mock_img = MagicMock()
        mock_pil_image.open.return_value.convert.return_value = mock_img
        
        with patch('app.images.service.np.array', return_value=mock_img):
            boxes, embeddings = do_face_recognition(fake_image_data)
        
        assert len(boxes) == 2
        assert len(embeddings) == 2


class TestFullProcessingJob:
    """Tests for the full_processing_job function."""

    @pytest.mark.asyncio
    async def test_full_processing_job_success(self, mock_async_session, mock_container_client):
        """Test successful full processing job."""
        # Mock event
        mock_event = MagicMock()
        mock_event.id = 1
        
        # Mock Azure blob operations
        mock_blob_client = MagicMock()
        mock_props = MagicMock()
        mock_props.creation_time = datetime.now(timezone.utc)
        mock_props.last_modified = datetime.now(timezone.utc)
        
        mock_blob_client.get_blob_properties = AsyncMock(return_value=mock_props)
        mock_container_client.upload_blob = AsyncMock()
        mock_container_client.get_blob_client.return_value = mock_blob_client
        mock_container_client.url = "https://storage.test"
        
        # Mock face recognition
        mock_boxes = [(10, 90, 110, 10)]
        # Mock embeddings as numpy arrays so .tolist() works
        import numpy as np
        mock_embeddings = [np.array([0.1] * 128)]
        
        with patch('app.images.service.get_event', return_value=mock_event), \
             patch('asyncio.get_running_loop') as mock_loop:
            
            mock_loop.return_value.run_in_executor = AsyncMock(
                return_value=(mock_boxes, mock_embeddings)
            )
            
            await full_processing_job(
                db=mock_async_session,
                container=mock_container_client,
                event_code="test-event",
                image_uuid="test-uuid",
                raw_bytes=b"fake_image_data",
                original_filename="test.jpg"
            )
        
        # Verify Azure upload was called
        mock_container_client.upload_blob.assert_called_once()
        
        # Verify database operations
        assert mock_async_session.add.call_count >= 1  # Image + Face records
        assert mock_async_session.commit.call_count >= 2  # Multiple commits

    @pytest.mark.asyncio
    async def test_full_processing_job_event_not_found(self, mock_async_session, mock_container_client):
        """Test full processing job when event is not found."""
        with patch('app.images.service.get_event', return_value=None):
            await full_processing_job(
                db=mock_async_session,
                container=mock_container_client,
                event_code="nonexistent",
                image_uuid="test-uuid",
                raw_bytes=b"fake_image_data",
                original_filename="test.jpg"
            )
        
        # Should not proceed with uploads if event not found
        mock_container_client.upload_blob.assert_not_called()

    @pytest.mark.asyncio
    async def test_full_processing_job_azure_upload_failure(self, mock_async_session, mock_container_client):
        """Test full processing job when Azure upload fails."""
        mock_event = MagicMock()
        mock_event.id = 1
        
        # Mock Azure upload failure
        mock_container_client.upload_blob = AsyncMock(side_effect=Exception("Upload failed"))
        
        with patch('app.images.service.get_event', return_value=mock_event):
            await full_processing_job(
                db=mock_async_session,
                container=mock_container_client,
                event_code="test-event",
                image_uuid="test-uuid",
                raw_bytes=b"fake_image_data",
                original_filename="test.jpg"
            )
        
        # Should not proceed with database operations if upload fails
        mock_async_session.add.assert_not_called()

    @pytest.mark.asyncio
    async def test_full_processing_job_different_extensions(self, mock_async_session, mock_container_client):
        """Test full processing job with different file extensions."""
        mock_event = MagicMock()
        mock_event.id = 1
        
        mock_blob_client = MagicMock()
        mock_props = MagicMock()
        mock_props.creation_time = datetime.now(timezone.utc)
        mock_props.last_modified = datetime.now(timezone.utc)
        
        mock_blob_client.get_blob_properties = AsyncMock(return_value=mock_props)
        mock_container_client.upload_blob = AsyncMock()
        mock_container_client.get_blob_client.return_value = mock_blob_client
        mock_container_client.url = "https://storage.test"
        
        test_files = [
            ("test.jpg", "jpg"),
            ("test.png", "png"),
            ("test.JPEG", "jpeg"),
            ("no_extension", "png"),  # Default case
            ("test.invalid", "png"),  # Invalid extension defaults to png
        ]
        
        for filename, expected_ext in test_files:
            with patch('app.images.service.get_event', return_value=mock_event), \
                 patch('asyncio.get_running_loop') as mock_loop:
                
                mock_loop.return_value.run_in_executor = AsyncMock(
                    return_value=([], [])  # No faces for simplicity
                )
                
                # Reset mock calls
                mock_container_client.upload_blob.reset_mock()
                
                await full_processing_job(
                    db=mock_async_session,
                    container=mock_container_client,
                    event_code="test-event",
                    image_uuid="test-uuid",
                    raw_bytes=b"fake_image_data",
                    original_filename=filename
                )
                
                # Check that the correct blob name was used
                upload_call = mock_container_client.upload_blob.call_args
                blob_name = upload_call[1]['name']  # keyword argument
                assert blob_name == f"images/test-uuid.{expected_ext}"


class TestDeleteImage:
    """Tests for the delete_image service function."""

    @pytest.mark.asyncio
    async def test_delete_image_success(self, mock_async_session, mock_container_client, sample_image):
        """Test successful image deletion."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_image
        mock_async_session.execute.return_value = mock_result
        
        # Mock container operations
        mock_container_client.url = "https://storage.test"
        mock_container_client.delete_blob = MagicMock()
        
        await delete_image(mock_async_session, mock_container_client, "test-uuid-123")
        
        # Verify blob deletion
        mock_container_client.delete_blob.assert_called_once()
        
        # Verify database deletion
        mock_async_session.delete.assert_called_once_with(sample_image)
        mock_async_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_image_not_found(self, mock_async_session, mock_container_client):
        """Test image deletion when image not found."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_async_session.execute.return_value = mock_result
        
        with pytest.raises(HTTPException) as excinfo:
            await delete_image(mock_async_session, mock_container_client, "nonexistent-uuid")
        
        assert excinfo.value.status_code == 404
        assert "not found" in str(excinfo.value.detail)

    @pytest.mark.asyncio
    async def test_delete_image_blob_not_found(self, mock_async_session, mock_container_client, sample_image):
        """Test image deletion when blob is not found (should not fail)."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_image
        mock_async_session.execute.return_value = mock_result
        
        # Mock blob deletion failure (blob not found)
        mock_container_client.url = "https://storage.test"
        mock_container_client.delete_blob = MagicMock(side_effect=Exception("Blob not found"))
        
        # Should not raise exception - deletion should continue
        await delete_image(mock_async_session, mock_container_client, "test-uuid-123")
        
        # Database deletion should still proceed
        mock_async_session.delete.assert_called_once_with(sample_image)
        mock_async_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_image_url_parsing(self, mock_async_session, mock_container_client):
        """Test correct blob name parsing from Azure URL."""
        # Create image with various URL formats
        test_cases = [
            {
                "azure_blob_url": "https://storage.test/images/test-uuid.jpg",
                "container_url": "https://storage.test",
                "expected_blob_name": "images/test-uuid.jpg"
            },
            {
                "azure_blob_url": "https://storage.test/subfolder/images/test-uuid.png",
                "container_url": "https://storage.test",
                "expected_blob_name": "subfolder/images/test-uuid.png"
            }
        ]
        
        for case in test_cases:
            mock_image = MagicMock()
            mock_image.azure_blob_url = case["azure_blob_url"]
            
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_image
            mock_async_session.execute.return_value = mock_result
            
            mock_container_client.url = case["container_url"]
            mock_container_client.delete_blob = MagicMock()
            
            # Reset session mocks
            mock_async_session.delete.reset_mock()
            mock_async_session.commit.reset_mock()
            
            await delete_image(mock_async_session, mock_container_client, "test-uuid")
            
            # Verify correct blob name was used
            mock_container_client.delete_blob.assert_called_with(case["expected_blob_name"])