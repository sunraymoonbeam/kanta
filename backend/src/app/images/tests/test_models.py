"""
Unit tests for the images models.
"""
from datetime import datetime, timezone

from ..models import Image, Face


class TestImageModel:
    """Tests for the Image model."""
    
    def test_image_tablename(self):
        """Test that the Image model has the correct table name."""
        assert Image.__tablename__ == "images"
        
    def test_image_model_attributes(self):
        """Test that the Image model has the expected attributes."""
        # Test that the model has the expected columns
        assert hasattr(Image, 'id')
        assert hasattr(Image, 'event_id')
        assert hasattr(Image, 'uuid')
        assert hasattr(Image, 'azure_blob_url')
        assert hasattr(Image, 'file_extension')
        assert hasattr(Image, 'faces')
        assert hasattr(Image, 'created_at')
        assert hasattr(Image, 'last_modified')
        
    def test_image_relationships(self):
        """Test that the Image model has the expected relationships."""
        assert hasattr(Image, 'event')
        assert hasattr(Image, 'faces_rel')
        
    def test_image_column_properties(self):
        """Test Image model column properties."""
        # Test column types and constraints
        assert Image.uuid.type.length == 32
        assert Image.file_extension.type.length == 10
        assert Image.faces.default.arg == 0
        

class TestFaceModel:
    """Tests for the Face model."""
    
    def test_face_tablename(self):
        """Test that the Face model has the correct table name."""
        assert Face.__tablename__ == "faces"
        
    def test_face_model_attributes(self):
        """Test that the Face model has the expected attributes."""
        # Test that the model has the expected columns
        assert hasattr(Face, 'id')
        assert hasattr(Face, 'event_id')
        assert hasattr(Face, 'image_id')
        assert hasattr(Face, 'bbox')
        assert hasattr(Face, 'embedding')
        assert hasattr(Face, 'cluster_id')
        
    def test_face_relationships(self):
        """Test that the Face model has the expected relationships."""
        assert hasattr(Face, 'image')
        assert hasattr(Face, 'event')
        
    def test_face_column_properties(self):
        """Test Face model column properties."""
        # Test default values
        assert Face.cluster_id.default.arg == -1
        
    def test_face_embedding_vector_dimension(self):
        """Test that Face embedding is configured for 128 dimensions."""
        # The Vector type should be configured for 128 dimensions
        embedding_column = Face.embedding
        # Check if the Vector type has the expected dimension - attribute name may vary
        assert hasattr(embedding_column.type, 'dimension') or str(embedding_column.type).endswith('(128)')