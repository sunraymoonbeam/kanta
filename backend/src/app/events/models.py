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
