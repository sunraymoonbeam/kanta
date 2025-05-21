from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from ..db.base import Base


class Image(Base):
    """
    Represents an uploaded image stored in Azure Blob and tracked in Postgres.

    Attributes:
        id (int): Auto-incrementing primary key.
        event_id (int): FK to Event.id.
        uuid (str): 32-char hex identifier, unique.
        azure_blob_url (str): Public URL in Azure Blob Storage.
        file_extension (str): e.g. 'jpg', parsed from URL or upload.
        faces (int): Number of detected faces.
        created_at (datetime): DB default NOW().
        last_modified (datetime): DB default NOW(), also on UPDATE.
        faces_rel (List[Face]): One-to-many to Face.
    """

    __tablename__ = "images"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        doc="Auto-incrementing PK for the image.",
    )
    event_id = Column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="FK linking to Event.id.",
    )
    uuid = Column(
        String(32),
        unique=True,
        nullable=False,
        index=True,
        doc="Unique image identifier (hex).",
    )
    azure_blob_url = Column(
        Text,
        nullable=False,
        doc="URL of the image in Azure Blob Storage.",
    )
    file_extension = Column(
        String(10),
        nullable=False,
        doc="File extension (e.g. 'jpg').",
    )
    faces = Column(
        Integer,
        nullable=False,
        default=0,
        doc="Count of faces detected in this image.",
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Row creation timestamp.",
    )
    last_modified = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Row last-modified timestamp.",
    )

    event = relationship(
        "Event",
        back_populates="images",
        doc="Parent Event object.",
    )
    faces_rel = relationship(
        "Face",
        back_populates="image",
        cascade="all, delete-orphan",
        lazy="selectin",
        doc="List of Face objects detected in this image.",
    )


class Face(Base):
    """
    A detected face within an image, with bounding box and vector embedding.

    Attributes:
        id (int): Auto-incrementing primary key.
        event_id (int): FK to Event.id for quick grouping.
        image_id (int): FK to Image.id.
        bbox (dict): JSON {'x','y','width','height'}.
        embedding (Vector): 128D pgvector field.
        cluster_id (int): Cluster label (-1 = unassigned).
    """

    __tablename__ = "faces"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        doc="Auto-incrementing PK for the face.",
    )
    event_id = Column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="FK linking to Event.id (denormalized for grouping).",
    )
    image_id = Column(
        Integer,
        ForeignKey("images.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="FK linking to Image.id.",
    )
    bbox = Column(
        JSON,
        nullable=False,
        doc="Bounding box coords as JSON: {'x','y','width','height'}.",
    )
    embedding = Column(
        Vector(128),
        nullable=False,
        doc="128-dimensional face embedding (pgvector).",
    )
    cluster_id = Column(
        Integer,
        nullable=False,
        default=-1,
        doc="Cluster label after clustering (-1 = unclustered).",
    )

    image = relationship(
        "Image",
        back_populates="faces_rel",
        doc="Parent Image object.",
    )
    event = relationship(
        "Event",
        doc="Parent Event object (denormalized).",
    )
