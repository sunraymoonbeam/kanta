"""
Unit tests for the clusters schemas.
"""
import pytest
from pydantic import ValidationError

from app.clusters.schemas import ClusterSample, ClusterInfo, SimilarFaceOut

class TestClusterSample:
    """Tests for the ClusterSample schema."""

    def test_valid_cluster_sample(self):
        """Test valid ClusterSample schema."""
        data = {
            "face_id": 123,
            "sample_blob_url": "https://storage.test.com/container/image.jpg",
            "sample_bbox": {"x": 100, "y": 150, "width": 200, "height": 250},
        }
        
        sample = ClusterSample(**data)
        
        assert sample.face_id == data["face_id"]
        assert sample.sample_blob_url == data["sample_blob_url"]
        assert sample.sample_bbox == data["sample_bbox"]

    def test_missing_face_id(self):
        """Test missing face_id field."""
        data = {
            "sample_blob_url": "https://storage.test.com/container/image.jpg",
            "sample_bbox": {"x": 100, "y": 150, "width": 200, "height": 250},
        }
        
        with pytest.raises(ValidationError) as excinfo:
            ClusterSample(**data)
        
        error = excinfo.value.errors()[0]
        assert error["type"] == "missing"
        assert error["loc"] == ("face_id",)

    def test_missing_blob_url(self):
        """Test missing sample_blob_url field."""
        data = {
            "face_id": 123,
            "sample_bbox": {"x": 100, "y": 150, "width": 200, "height": 250},
        }
        
        with pytest.raises(ValidationError) as excinfo:
            ClusterSample(**data)
        
        error = excinfo.value.errors()[0]
        assert error["type"] == "missing"
        assert error["loc"] == ("sample_blob_url",)

    def test_missing_bbox(self):
        """Test missing sample_bbox field."""
        data = {
            "face_id": 123,
            "sample_blob_url": "https://storage.test.com/container/image.jpg",
        }
        
        with pytest.raises(ValidationError) as excinfo:
            ClusterSample(**data)
        
        error = excinfo.value.errors()[0]
        assert error["type"] == "missing"
        assert error["loc"] == ("sample_bbox",)

    def test_invalid_face_id_type(self):
        """Test invalid face_id type."""
        data = {
            "face_id": "not-an-int",
            "sample_blob_url": "https://storage.test.com/container/image.jpg",
            "sample_bbox": {"x": 100, "y": 150, "width": 200, "height": 250},
        }
        
        with pytest.raises(ValidationError) as excinfo:
            ClusterSample(**data)
        
        error = excinfo.value.errors()[0]
        assert error["type"] == "int_parsing"


class TestClusterInfo:
    """Tests for the ClusterInfo schema."""

    def test_valid_cluster_info(self):
        """Test valid ClusterInfo schema."""
        sample1 = {
            "face_id": 1,
            "sample_blob_url": "https://storage.test.com/container/image1.jpg",
            "sample_bbox": {"x": 100, "y": 150, "width": 200, "height": 250},
        }
        sample2 = {
            "face_id": 2,
            "sample_blob_url": "https://storage.test.com/container/image2.jpg",
            "sample_bbox": {"x": 50, "y": 75, "width": 180, "height": 220},
        }
        
        data = {
            "cluster_id": 5,
            "face_count": 25,
            "samples": [sample1, sample2],
        }
        
        cluster_info = ClusterInfo(**data)
        
        assert cluster_info.cluster_id == data["cluster_id"]
        assert cluster_info.face_count == data["face_count"]
        assert len(cluster_info.samples) == 2
        assert cluster_info.samples[0].face_id == sample1["face_id"]
        assert cluster_info.samples[1].face_id == sample2["face_id"]

    def test_empty_samples_list(self):
        """Test ClusterInfo with empty samples list."""
        data = {
            "cluster_id": 1,
            "face_count": 0,
            "samples": [],
        }
        
        cluster_info = ClusterInfo(**data)
        
        assert cluster_info.cluster_id == data["cluster_id"]
        assert cluster_info.face_count == data["face_count"]
        assert len(cluster_info.samples) == 0

    def test_missing_cluster_id(self):
        """Test missing cluster_id field."""
        data = {
            "face_count": 25,
            "samples": [],
        }
        
        with pytest.raises(ValidationError) as excinfo:
            ClusterInfo(**data)
        
        error = excinfo.value.errors()[0]
        assert error["type"] == "missing"
        assert error["loc"] == ("cluster_id",)

    def test_missing_face_count(self):
        """Test missing face_count field."""
        data = {
            "cluster_id": 5,
            "samples": [],
        }
        
        with pytest.raises(ValidationError) as excinfo:
            ClusterInfo(**data)
        
        error = excinfo.value.errors()[0]
        assert error["type"] == "missing"
        assert error["loc"] == ("face_count",)

    def test_invalid_sample_in_list(self):
        """Test invalid sample object in samples list."""
        invalid_sample = {
            "face_id": "not-an-int",
            "sample_blob_url": "https://storage.test.com/container/image.jpg",
            "sample_bbox": {"x": 100, "y": 150, "width": 200, "height": 250},
        }
        
        data = {
            "cluster_id": 5,
            "face_count": 1,
            "samples": [invalid_sample],
        }
        
        with pytest.raises(ValidationError) as excinfo:
            ClusterInfo(**data)
        
        error = excinfo.value.errors()[0]
        assert error["type"] == "int_parsing"
        assert error["loc"] == ("samples", 0, "face_id")


class TestSimilarFaceOut:
    """Tests for the SimilarFaceOut schema."""

    def test_valid_similar_face_out(self):
        """Test valid SimilarFaceOut schema."""
        embedding = [0.1] * 128  # 128-dimensional embedding
        data = {
            "face_id": 42,
            "image_uuid": "550e8400-e29b-41d4-a716-446655440000",
            "azure_blob_url": "https://storage.test.com/container/image.jpg",
            "cluster_id": 3,
            "bbox": {"x": 100, "y": 150, "width": 200, "height": 250},
            "embedding": embedding,
            "distance": 0.85,
        }
        
        similar_face = SimilarFaceOut(**data)
        
        assert similar_face.face_id == data["face_id"]
        assert similar_face.image_uuid == data["image_uuid"]
        assert similar_face.azure_blob_url == data["azure_blob_url"]
        assert similar_face.cluster_id == data["cluster_id"]
        assert similar_face.bbox == data["bbox"]
        assert similar_face.embedding == data["embedding"]
        assert similar_face.distance == data["distance"]

    def test_missing_face_id(self):
        """Test missing face_id field."""
        embedding = [0.1] * 128
        data = {
            "image_uuid": "550e8400-e29b-41d4-a716-446655440000",
            "azure_blob_url": "https://storage.test.com/container/image.jpg",
            "cluster_id": 3,
            "bbox": {"x": 100, "y": 150, "width": 200, "height": 250},
            "embedding": embedding,
            "distance": 0.85,
        }
        
        with pytest.raises(ValidationError) as excinfo:
            SimilarFaceOut(**data)
        
        error = excinfo.value.errors()[0]
        assert error["type"] == "missing"
        assert error["loc"] == ("face_id",)

    def test_missing_image_uuid(self):
        """Test missing image_uuid field."""
        embedding = [0.1] * 128
        data = {
            "face_id": 42,
            "azure_blob_url": "https://storage.test.com/container/image.jpg",
            "cluster_id": 3,
            "bbox": {"x": 100, "y": 150, "width": 200, "height": 250},
            "embedding": embedding,
            "distance": 0.85,
        }
        
        with pytest.raises(ValidationError) as excinfo:
            SimilarFaceOut(**data)
        
        error = excinfo.value.errors()[0]
        assert error["type"] == "missing"
        assert error["loc"] == ("image_uuid",)

    def test_invalid_embedding_type(self):
        """Test invalid embedding type."""
        data = {
            "face_id": 42,
            "image_uuid": "550e8400-e29b-41d4-a716-446655440000",
            "azure_blob_url": "https://storage.test.com/container/image.jpg",
            "cluster_id": 3,
            "bbox": {"x": 100, "y": 150, "width": 200, "height": 250},
            "embedding": "not-a-list",
            "distance": 0.85,
        }
        
        with pytest.raises(ValidationError) as excinfo:
            SimilarFaceOut(**data)
        
        error = excinfo.value.errors()[0]
        assert error["type"] == "list_type"
        assert error["loc"] == ("embedding",)

    def test_invalid_distance_type(self):
        """Test invalid distance type."""
        embedding = [0.1] * 128
        data = {
            "face_id": 42,
            "image_uuid": "550e8400-e29b-41d4-a716-446655440000",
            "azure_blob_url": "https://storage.test.com/container/image.jpg",
            "cluster_id": 3,
            "bbox": {"x": 100, "y": 150, "width": 200, "height": 250},
            "embedding": embedding,
            "distance": "not-a-float",
        }
        
        with pytest.raises(ValidationError) as excinfo:
            SimilarFaceOut(**data)
        
        error = excinfo.value.errors()[0]
        assert error["type"] == "float_parsing"
        assert error["loc"] == ("distance",)

    def test_short_embedding_list(self):
        """Test embedding list with fewer than expected dimensions."""
        short_embedding = [0.1] * 64  # Only 64 dimensions instead of 128
        data = {
            "face_id": 42,
            "image_uuid": "550e8400-e29b-41d4-a716-446655440000",
            "azure_blob_url": "https://storage.test.com/container/image.jpg",
            "cluster_id": 3,
            "bbox": {"x": 100, "y": 150, "width": 200, "height": 250},
            "embedding": short_embedding,
            "distance": 0.85,
        }
        
        # Should still be valid since we don't enforce length constraint
        similar_face = SimilarFaceOut(**data)
        assert len(similar_face.embedding) == 64

    def test_negative_cluster_id(self):
        """Test negative cluster_id (valid for noise cluster in DBSCAN)."""
        embedding = [0.1] * 128
        data = {
            "face_id": 42,
            "image_uuid": "550e8400-e29b-41d4-a716-446655440000",
            "azure_blob_url": "https://storage.test.com/container/image.jpg",
            "cluster_id": -1,  # Noise cluster
            "bbox": {"x": 100, "y": 150, "width": 200, "height": 250},
            "embedding": embedding,
            "distance": 0.85,
        }
        
        similar_face = SimilarFaceOut(**data)
        assert similar_face.cluster_id == -1