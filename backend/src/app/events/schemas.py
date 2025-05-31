import re
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, model_validator

AZURE_CONTAINER_NAME_REGEX = re.compile(r"^[a-z0-9](?:[a-z0-9\-]{1,61}[a-z0-9])?$")


class CreateEventInput(BaseModel):
    """
    Input schema for creating a new event.

    Attributes:
        event_code (str): Unique code for the event.
        name (Optional[str]): Human-readable event name.
        description (Optional[str]): Description of the event.
        start_date_time (Optional[datetime]): Start timestamp (UTC).
        end_date_time (Optional[datetime]): End timestamp (UTC).

    Raises:
        ValueError: If start_date_time is not before end_date_time.
    """

    event_code: str = Field(
        ...,
        min_length=3,
        max_length=63,
        example="my-event-123",
        description=(
            "Unique event code – must match Azure Blob container rules: "
            "3–63 chars, lowercase letters/numbers/hyphens, no __-__ at ends nor consecutive hyphens."
        ),
    )
    name: Optional[str] = Field(None, example="Shafiq's & Shira's Wedding")
    description: Optional[str] = Field(
        None, example="Shafiq's & Shira's Wedding details."
    )
    start_date_time: Optional[datetime] = Field(
        None, description="Event start time (UTC)."
    )
    end_date_time: Optional[datetime] = Field(None, description="Event end time (UTC).")

    @model_validator(mode="before")
    def validate_time_range(cls, values):
        start, end = values.get("start_date_time"), values.get("end_date_time")
        if start and end and start >= end:
            raise ValueError("start_date_time must be before end_date_time")
        return values


class UpdateEventInput(BaseModel):
    """
    Input schema for updating an existing event.

    Attributes:
        event_code (str): Unique code of the event to update.
        new_event_code (Optional[str]): New unique code for the event.
        name (Optional[str]): New name for the event.
        description (Optional[str]): New description for the event.
        start_date_time (Optional[datetime]): Updated start timestamp.
        end_date_time (Optional[datetime]): Updated end timestamp.
    """

    event_code: str = Field(..., description="Unique code of the event to update.")
    new_event_code: Optional[str] = Field(
        None,
        example="new_shirashafiq26",
        description="New unique code for the event (if changing).",
    )
    name: Optional[str] = Field(None, example="Updated Wedding Name")
    description: Optional[str] = Field(
        None, example="Updated description of the event."
    )
    start_date_time: Optional[datetime] = Field(
        None, description="Updated start time (UTC)."
    )
    end_date_time: Optional[datetime] = Field(
        None, description="Updated end time (UTC)."
    )

    @model_validator(mode="before")
    def validate_time_range(cls, values):
        start, end = values.get("start_date_time"), values.get("end_date_time")
        if start and end and start >= end:
            raise ValueError("start_date_time must be before end_date_time")
        return values


class DeleteEventInput(BaseModel):
    """
    Schema for identifying an event to delete.

    Attributes:
        code (str): Unique event code.
    """

    event_code: str = Field(..., description="Unique event code to delete.")


class EventInfo(BaseModel):
    """
    Output schema representing an event.
    This schema is used for returning event details in API responses.

    Attributes:
        event_code (str): Unique event code.
        name (Optional[str]): Event name.
        description (Optional[str]): Event description.
        start_date_time (Optional[datetime]): Start time (UTC).
        end_date_time (Optional[datetime]): End time (UTC).
        created_at (datetime): Event creation time.
        running (bool): Whether the event is currently ongoing.
        event_image_url (Optional[str]): Base64-encoded image of the event.
        qr_code_image_url (Optional[str]): Base64-encoded QR code image for the event.
    """

    code: str
    name: Optional[str]
    description: Optional[str]
    start_date_time: Optional[datetime]
    end_date_time: Optional[datetime]
    created_at: datetime
    running: bool

    # New fields: Base64-encoded strings or URLs
    event_image_url: Optional[str] = None
    qr_code_image_url: Optional[str] = None

    class Config:
        from_attributes = True


class EventListResponse(BaseModel):
    """
    A page (or full list) of EventInfo objects.
    """

    events: List[EventInfo] = Field(..., description="List of events")

    class Config:
        from_attributes = True
