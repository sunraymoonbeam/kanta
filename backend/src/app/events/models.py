"""
SQLAlchemy declarative models for events, images, and faces
"""

from sqlalchemy import Column, DateTime, Integer, String, Text, func
from sqlalchemy.orm import relationship

from ..db.base import Base


class Event(Base):
    """
    Represents an event with a unique code, name, and start/end time.

    Attributes:
        id (int): Auto-incrementing primary key.
        code (str): Unique code for the event.
        name (str): Name of the event.
        description (str): Description of the event.
        start_date_time (datetime): Start time of the event.
        end_date_time (datetime): End time of the event.
        created_at (datetime): Timestamp when the row was created (server default NOW()).
        images (List[Image]): List of associated Image objects (one-to-many relationship).
        running (bool): Indicates if the event is currently running (property).
    """

    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(32), unique=True, nullable=False, index=True)
    name = Column(Text)
    description = Column(Text, nullable=True)
    start_date_time = Column(
        DateTime(timezone=True), nullable=True, doc="Event start time (UTC)"
    )
    end_date_time = Column(
        DateTime(timezone=True), nullable=True, doc="Event end time (UTC)"
    )
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Ren Hwa: this made life a little hard. Even though we can store images in the database,
    # it is not recommended for large files. Instead, we should store images in a blob storage
    # GET methods are also a little easier to implement if we store the image as a URL rather than a binary blob.
    # New columns: binary blobs
    # event_image = Column(LargeBinary, nullable=True)
    # qr_code_image = Column(LargeBinary, nullable=True)

    event_image_url = Column(
        String(256), nullable=True, doc="URL of the event image in blob storage"
    )
    qr_code_image_url = Column(
        String(256), nullable=True, doc="URL of the QR code image in blob storage"
    )

    images = relationship(
        "Image", back_populates="event", cascade="all, delete-orphan", lazy="selectin"
    )

    @property
    def running(self) -> bool:
        """Return True if the current UTC time is between start_date_time and end_date_time."""
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc)
        if self.start_date_time and self.end_date_time:
            return self.start_date_time <= now <= self.end_date_time
        return False
