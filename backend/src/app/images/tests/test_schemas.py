"""
Unit tests for the images schemas.
"""
from datetime import datetime, timezone
from typing import Sequence
import pytest
from pydantic import ValidationError

from ..schemas import (
    UploadImageResponse,
    ImageListItem,
    FaceSummary,
    ImageDetailResponse,
)


class TestUploadImageResponse:
    """Tests for the UploadImageResponse schema."""

    def test_valid_upload_image_response(self):
        """Test valid UploadImageResponse schema."""
        data = {
            "uuid": "test-uuid-123",
            "blob_url": "https://storage.test/images/test-uuid-123.jpg",
            "faces": 2,
            "boxes": [[10, 90, 110, 10], [20, 80, 120, 20]],
            "embeddings": [[0.1] * 128, [0.2] * 128],
        }
        
        response = UploadImageResponse(**data)
        
        assert response.uuid == data["uuid"]
        assert response.blob_url == data["blob_url"]
        assert response.faces == data["faces"]
        assert response.boxes == data["boxes"]
        assert response.embeddings == data["embeddings"]

    def test_upload_image_response_no_faces(self):
        """Test UploadImageResponse with no faces detected."""
        data = {
            "uuid": "no-faces-uuid",
            "blob_url": "https://storage.test/images/no-faces.jpg",
            "faces": 0,
            "boxes": [],
            "embeddings": [],
        }
        
        response = UploadImageResponse(**data)
        
        assert response.faces == 0
        assert response.boxes == []
        assert response.embeddings == []

    def test_upload_image_response_multiple_faces(self):
        """Test UploadImageResponse with multiple faces."""
        boxes = [[10, 90, 110, 10], [150, 240, 250, 150], [300, 400, 450, 320]]
        embeddings = [[0.1] * 128, [0.2] * 128, [0.3] * 128]
        
        data = {
            "uuid": "multi-faces-uuid",
            "blob_url": "https://storage.test/images/multi-faces.jpg",
            "faces": 3,
            "boxes": boxes,
            "embeddings": embeddings,
        }
        
        response = UploadImageResponse(**data)
        
        assert response.faces == 3
        assert len(response.boxes) == 3
        assert len(response.embeddings) == 3
        assert response.boxes == boxes
        assert response.embeddings == embeddings

    def test_upload_image_response_missing_fields(self):
        """Test UploadImageResponse with missing required fields."""
        incomplete_data = {
            "uuid": "test-uuid",
            "blob_url": "https://storage.test/test.jpg",
            # Missing faces, boxes, embeddings
        }
        
        with pytest.raises(ValidationError) as excinfo:
            UploadImageResponse(**incomplete_data)
        
        errors = excinfo.value.errors()
        missing_fields = [error["loc"][0] for error in errors if error["type"] == "missing"]
        assert "faces" in missing_fields
        assert "boxes" in missing_fields
        assert "embeddings" in missing_fields


class TestImageListItem:
    """Tests for the ImageListItem schema."""

    def test_valid_image_list_item(self, utc_now):
        """Test valid ImageListItem schema."""
        data = {
            "uuid": "list-item-uuid",
            "azure_blob_url": "https://storage.test/images/list-item.jpg",
            "file_extension": "jpg",
            "faces": 1,
            "created_at": utc_now,
            "last_modified": utc_now,
        }
        
        item = ImageListItem(**data)
        
        assert item.uuid == data["uuid"]
        assert item.azure_blob_url == data["azure_blob_url"]
        assert item.file_extension == data["file_extension"]
        assert item.faces == data["faces"]
        assert item.created_at == data["created_at"]
        assert item.last_modified == data["last_modified"]

    def test_image_list_item_different_extensions(self, utc_now):
        """Test ImageListItem with different file extensions."""
        extensions = ["jpg", "jpeg", "png", "gif", "bmp", "tiff"]
        
        for ext in extensions:
            data = {
                "uuid": f"test-{ext}",
                "azure_blob_url": f"https://storage.test/test.{ext}",
                "file_extension": ext,
                "faces": 0,
                "created_at": utc_now,
                "last_modified": utc_now,
            }
            
            item = ImageListItem(**data)
            assert item.file_extension == ext

    def test_image_list_item_zero_faces(self, utc_now):
        """Test ImageListItem with zero faces."""
        data = {
            "uuid": "zero-faces",
            "azure_blob_url": "https://storage.test/zero-faces.jpg",
            "file_extension": "jpg",
            "faces": 0,
            "created_at": utc_now,
            "last_modified": utc_now,
        }
        
        item = ImageListItem(**data)
        assert item.faces == 0

    def test_image_list_item_many_faces(self, utc_now):
        """Test ImageListItem with many faces."""
        data = {
            "uuid": "many-faces",
            "azure_blob_url": "https://storage.test/many-faces.jpg",
            "file_extension": "jpg",
            "faces": 50,
            "created_at": utc_now,
            "last_modified": utc_now,
        }
        
        item = ImageListItem(**data)
        assert item.faces == 50

    def test_image_list_item_from_orm_config(self):
        """Test that ImageListItem has from_attributes=True config."""
        assert ImageListItem.model_config.get('from_attributes', False) == True


class TestFaceSummary:
    """Tests for the FaceSummary schema."""

    def test_valid_face_summary(self):
        """Test valid FaceSummary schema."""
        data = {
            "face_id": 123,
            "cluster_id": 5,
            "bbox": {"x": 100, "y": 50, "width": 80, "height": 100},
        }
        
        face = FaceSummary(**data)
        
        assert face.face_id == data["face_id"]
        assert face.cluster_id == data["cluster_id"]
        assert face.bbox == data["bbox"]

    def test_face_summary_unclustered(self):
        """Test FaceSummary with unclustered face (cluster_id = -1)."""
        data = {
            "face_id": 456,
            "cluster_id": -1,
            "bbox": {"x": 200, "y": 150, "width": 60, "height": 80},
        }
        
        face = FaceSummary(**data)
        assert face.cluster_id == -1

    def test_face_summary_unassigned(self):
        """Test FaceSummary with unassigned face (cluster_id = -2)."""
        data = {
            "face_id": 789,
            "cluster_id": -2,
            "bbox": {"x": 300, "y": 250, "width": 70, "height": 90},
        }
        
        face = FaceSummary(**data)
        assert face.cluster_id == -2

    def test_face_summary_different_bbox_sizes(self):
        """Test FaceSummary with different bounding box sizes."""
        bboxes = [
            {"x": 0, "y": 0, "width": 10, "height": 10},
            {"x": 100, "y": 200, "width": 150, "height": 180},
            {"x": 500, "y": 300, "width": 75, "height": 90},
        ]
        
        for i, bbox in enumerate(bboxes):
            data = {
                "face_id": i + 1,
                "cluster_id": i,
                "bbox": bbox,
            }
            
            face = FaceSummary(**data)
            assert face.bbox == bbox

    def test_face_summary_bbox_validation(self):
        """Test FaceSummary bounding box structure validation."""
        # Valid bbox with all required keys
        valid_bbox = {"x": 10, "y": 20, "width": 30, "height": 40}
        data = {
            "face_id": 1,
            "cluster_id": 0,
            "bbox": valid_bbox,
        }
        
        face = FaceSummary(**data)
        assert face.bbox["x"] == 10
        assert face.bbox["y"] == 20
        assert face.bbox["width"] == 30
        assert face.bbox["height"] == 40

    def test_face_summary_from_orm_config(self):
        """Test that FaceSummary has from_attributes=True config."""
        assert FaceSummary.model_config.get('from_attributes', False) == True


class TestImageDetailResponse:
    """Tests for the ImageDetailResponse schema."""

    def test_valid_image_detail_response(self, utc_now):
        """Test valid ImageDetailResponse schema."""
        image_data = {
            "uuid": "detail-uuid",
            "azure_blob_url": "https://storage.test/images/detail.jpg",
            "file_extension": "jpg",
            "faces": 2,
            "created_at": utc_now,
            "last_modified": utc_now,
        }
        
        faces_data = [
            {
                "face_id": 1,
                "cluster_id": 0,
                "bbox": {"x": 100, "y": 50, "width": 80, "height": 100},
            },
            {
                "face_id": 2,
                "cluster_id": 1,
                "bbox": {"x": 200, "y": 150, "width": 70, "height": 90},
            },
        ]
        
        data = {
            "image": image_data,
            "faces": faces_data,
        }
        
        response = ImageDetailResponse(**data)
        
        assert response.image.uuid == image_data["uuid"]
        assert response.image.faces == image_data["faces"]
        assert len(response.faces) == 2
        assert response.faces[0].face_id == 1
        assert response.faces[1].face_id == 2

    def test_image_detail_response_no_faces(self, utc_now):
        """Test ImageDetailResponse with no faces."""
        image_data = {
            "uuid": "no-faces-detail",
            "azure_blob_url": "https://storage.test/images/no-faces.jpg",
            "file_extension": "jpg",
            "faces": 0,
            "created_at": utc_now,
            "last_modified": utc_now,
        }
        
        data = {
            "image": image_data,
            "faces": [],
        }
        
        response = ImageDetailResponse(**data)
        
        assert response.image.faces == 0
        assert len(response.faces) == 0

    def test_image_detail_response_many_faces(self, utc_now):
        """Test ImageDetailResponse with many faces."""
        image_data = {
            "uuid": "many-faces-detail",
            "azure_blob_url": "https://storage.test/images/many-faces.jpg",
            "file_extension": "jpg",
            "faces": 5,
            "created_at": utc_now,
            "last_modified": utc_now,
        }
        
        faces_data = [
            {
                "face_id": i + 1,
                "cluster_id": i,
                "bbox": {"x": i * 50, "y": i * 30, "width": 60, "height": 80},
            }
            for i in range(5)
        ]
        
        data = {
            "image": image_data,
            "faces": faces_data,
        }
        
        response = ImageDetailResponse(**data)
        
        assert response.image.faces == 5
        assert len(response.faces) == 5
        for i, face in enumerate(response.faces):
            assert face.face_id == i + 1
            assert face.cluster_id == i

    def test_image_detail_response_mixed_cluster_ids(self, utc_now):
        """Test ImageDetailResponse with mixed cluster IDs."""
        image_data = {
            "uuid": "mixed-clusters",
            "azure_blob_url": "https://storage.test/images/mixed.jpg",
            "file_extension": "jpg",
            "faces": 3,
            "created_at": utc_now,
            "last_modified": utc_now,
        }
        
        faces_data = [
            {
                "face_id": 1,
                "cluster_id": -1,  # Unclustered
                "bbox": {"x": 100, "y": 50, "width": 80, "height": 100},
            },
            {
                "face_id": 2,
                "cluster_id": 0,   # Cluster 0
                "bbox": {"x": 200, "y": 150, "width": 70, "height": 90},
            },
            {
                "face_id": 3,
                "cluster_id": -2,  # Unassigned
                "bbox": {"x": 300, "y": 250, "width": 75, "height": 95},
            },
        ]
        
        data = {
            "image": image_data,
            "faces": faces_data,
        }
        
        response = ImageDetailResponse(**data)
        
        assert len(response.faces) == 3
        assert response.faces[0].cluster_id == -1
        assert response.faces[1].cluster_id == 0
        assert response.faces[2].cluster_id == -2

    def test_image_detail_response_from_orm_config(self):
        """Test that ImageDetailResponse has from_attributes=True config."""
        assert ImageDetailResponse.model_config.get('from_attributes', False) == True