# app/clusters/schemas.py

from typing import Dict, List

from pydantic import BaseModel, Field


class ClusterSample(BaseModel):
    """
    A single sample face within a cluster.

    Attributes:
        face_id (int): Primary key of the sample face.
        sample_blob_url (str): Azure Blob URL for that face's image.
        sample_bbox (Dict[str, int]): Bounding-box dict for that sample face.
    """

    face_id: int = Field(..., description="Sample face primary key.")
    sample_blob_url: str = Field(..., description="URL of the sample face image.")
    sample_bbox: Dict[str, int] = Field(
        ..., description="Bounding box: {'x','y','width','height'}."
    )


class ClusterInfo(BaseModel):
    """
    Summary information for a single face cluster.

    Attributes:
        cluster_id (int): Cluster label.
        face_count (int): Total faces in this cluster.
        samples (List[ClusterSample]): Random face samples for this cluster.
    """

    cluster_id: int = Field(..., description="Cluster label.")
    face_count: int = Field(..., description="Total faces in this cluster.")
    samples: List[ClusterSample] = Field(
        ..., description="List of random sample faces."
    )


class SimilarFaceOut(BaseModel):
    """
    A single "similar face" result for the `/find-similar` endpoint.

    Attributes:
        face_id (int): Matching face's primary key.
        image_uuid (str): UUID of the parent image.
        azure_blob_url (str): URL of the image containing the face.
        cluster_id (int): Cluster label of this face.
        bbox (Dict[str, int]): Bounding box of the face.
        embedding (List[float]): Full 128-dimensional embedding.
        distance (float): Distance metric (lower = more similar).
    """

    face_id: int = Field(..., description="Matching face primary key.")
    image_uuid: str = Field(..., description="Parent image UUID.")
    azure_blob_url: str = Field(
        ..., description="URL of the image containing the face."
    )
    cluster_id: int = Field(..., description="Cluster label.")
    bbox: Dict[str, int] = Field(
        ..., description="Bounding box: {'x','y','width','height'}."
    )
    embedding: List[float] = Field(
        ..., description="128-dimensional face embedding vector."
    )
    distance: float = Field(..., description="Distance metric for similarity.")
