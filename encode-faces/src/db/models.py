"""
SQLAlchemy declarative models for events, images, and faces
"""

from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Event(Base):
    """
    Represents an event with a unique code, name, and start time.
    Attributes:
        id (int): Auto-incrementing primary key.
        code (str): Unique code for the event.
        name (str): Name of the event.
        start_time (datetime): Start time of the event.
        created_at (datetime): Timestamp when the row was created (server default NOW()).
        images (List[Image]): List of associated Image objects (one-to-many relationship).
    """

    __tablename__ = "events"
    id = Column(Integer, primary_key=True)
    code = Column(String(32), unique=True, nullable=False, index=True)
    name = Column(Text)
    start_time = Column(DateTime(timezone=True))
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    images = relationship(
        "Image", back_populates="event", cascade="all, delete-orphan", lazy="selectin"
    )


class Image(Base):
    """
    Represents an image stored in Azure Blob Storage and tracked in the database.

    Attributes:
        id (int): Auto-incrementing primary key.
        event_id (int): Foreign key referencing Event.id.
        uuid (str): 32-character hex string uniquely identifying the image.
        azure_blob_url (str): URL of the image in Azure Blob Storage.
        faces (int): Number of faces detected in the image.
        file_extension (str): File extension derived from the blob URL (e.g., 'jpg').
        created_at (datetime): Timestamp when the row was created (server default NOW()).
        last_modified (datetime): Timestamp when the row was last modified (server default NOW()).
        faces_rel (List[Face]): List of associated Face objects (one-to-many relationship).
    """

    __tablename__ = "images"
    id = Column(
        Integer, primary_key=True, doc="Auto-incrementing primary key of the image row."
    )
    event_id = Column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Foreign key linking to the parent event's numeric id.",
    )
    uuid = Column(
        String(32),
        unique=True,
        nullable=False,
        index=True,
        doc="32-character UUID for external reference.",
    )
    azure_blob_url = Column(
        Text, nullable=False, doc="Azure Blob Storage URL where the image is stored."
    )
    file_extension = Column(
        String,
        nullable=False,
        doc="File extension parsed from the blob URL (e.g. 'jpg').",
    )
    faces = Column(
        Integer, nullable=False, default=0, doc="Number of detected faces in the image."
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Record creation timestamp, set by the database.",
    )
    last_modified = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Record last modification timestamp, set by the database.",
    )

    event = relationship("Event", back_populates="images")
    faces_rel = relationship(
        "Face",
        back_populates="image",
        cascade="all, delete-orphan",
        lazy="selectin",
        doc="List of Face objects associated with this image.",
    )


class Face(Base):
    """
    Represents a detected face within an image, including its bounding box and embedding.

    Attributes:
        id (int): Auto-incrementing primary key.
        event_id (int): Foreign key referencing Event.id.
        image_id (int): Foreign key referencing Image.id.
        image_uuid (str): UUID of the parent Image for quick lookup.
        bbox (dict): Bounding box with keys 'x', 'y', 'width', 'height'.
        embedding (Vector): 128-dimensional face embedding vector.
        cluster_id (int): Cluster label for grouping similar faces.
        image (Image): Parent Image object (many-to-one relationship).
    """

    __tablename__ = "faces"
    id = Column(
        Integer, primary_key=True, doc="Auto-incrementing primary key of the face row."
    )
    event_id = Column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Foreign key linking to the parent event's numeric id.",
    )
    image_id = Column(
        Integer,
        ForeignKey("images.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Foreign key linking to the parent image's numeric id.",
    )
    image_uuid = Column(
        String(32),
        nullable=False,
        index=True,
        doc="UUID of the parent image for external lookups.",
    )
    bbox = Column(
        JSON,
        nullable=False,
        doc="Bounding box coordinates as JSON: {'x', 'y', 'width', 'height'}.",
    )
    embedding = Column(
        Vector(128),
        nullable=False,
        doc="128-dimensional pgvector embedding for the face.",
    )
    cluster_id = Column(
        Integer,
        nullable=False,
        default=-1,
        doc="Cluster label assigned after face clustering (default -1 = unclustered).",
    )

    image = relationship(
        "Image",
        back_populates="faces_rel",
        doc="List of Face objects associated with this image.",
    )
    event = relationship("Event")



