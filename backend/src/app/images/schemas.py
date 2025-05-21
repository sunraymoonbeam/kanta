# app/images/schemas.py

from datetime import datetime
from typing import Dict, List, Sequence

from pydantic import BaseModel, Field


class UploadImageResponse(BaseModel):
    """
    Response schema for the `/upload-image` endpoint.

    Attributes:
        uuid (str): Assigned 32-character UUID for the newly uploaded image.
        blob_url (str): Public Azure Blob Storage URL of the image.
        faces (int): Number of faces detected in the image.
        boxes (List[Sequence[int]]): Face-location boxes, each as [top, right, bottom, left].
        embeddings (List[Sequence[float]]): List of 128-dimensional face embedding vectors.
    """

    uuid: str = Field(..., description="Assigned image UUID.")
    blob_url: str = Field(..., description="URL of the image in Azure Blob Storage.")
    faces: int = Field(..., description="Number of faces detected.")
    boxes: List[Sequence[int]] = Field(
        ..., description="Face-location boxes [top, right, bottom, left]."
    )
    embeddings: List[Sequence[float]] = Field(
        ..., description="128-dimensional face embeddings."
    )


class ImageListItem(BaseModel):
    """
    Summary metadata for an image, used in the `/pics` listing.

    Attributes:
        uuid (str): Unique image identifier.
        azure_blob_url (str): Public Azure Blob URL.
        file_extension (str): File extension (e.g., 'jpg').
        faces (int): Number of faces detected.
        created_at (datetime): Record creation timestamp.
        last_modified (datetime): Record last-modified timestamp.
    """

    uuid: str = Field(..., description="Image UUID.")
    azure_blob_url: str = Field(..., description="Azure Blob URL.")
    file_extension: str = Field(..., example="jpg", description="File extension.")
    faces: int = Field(..., description="Detected face count.")
    created_at: datetime = Field(..., description="Record creation time.")
    last_modified: datetime = Field(..., description="Record last-modified time.")

    class Config:
        from_attributes = True


class FaceSummary(BaseModel):
    """
    Summary metadata for a detected face, used in detail views.

    Attributes:
        face_id (int): Primary key of the face row.
        cluster_id (int): Cluster label assigned to this face.
        bbox (Dict[str, int]): Bounding-box dict with keys 'x', 'y', 'width', 'height'.
    """

    face_id: int = Field(..., description="Face row primary key.")
    cluster_id: int = Field(..., description="Cluster label.")
    bbox: Dict[str, int] = Field(
        ..., description="Bounding box as {'x','y','width','height'}."
    )

    class Config:
        from_attributes = True


class ImageDetailResponse(BaseModel):
    """
    Detailed metadata for an image plus all its detected faces.

    Attributes:
        image (ImageListItem): Summary metadata for the image.
        faces (List[FaceSummary]): List of detected faces in this image.
    """

    image: ImageListItem = Field(..., description="Basic image metadata.")
    faces: List[FaceSummary] = Field(..., description="List of detected faces.")

    class Config:
        from_attributes = True
