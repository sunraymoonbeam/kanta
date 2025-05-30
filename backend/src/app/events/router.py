from typing import Optional

from azure.storage.blob import BlobServiceClient, ContainerClient
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Path,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.azure_blob import get_blob_service, get_event_container
from ..db.base import get_db
from .exceptions import EventAlreadyExists, EventNotFound
from .schemas import (
    CreateEventInput,
    DeleteEventInput,
    EventInfo,
    EventListResponse,
    UpdateEventInput,
)
from .service import (
    create_event,
    delete_event,
    get_events,
    update_event,
    upsert_event_image,
)

router = APIRouter(prefix="/events", tags=["events"])


# --------------------------------------------------------------------
# GET EVENTS
# --------------------------------------------------------------------
@router.get(
    "",
    response_model=EventListResponse,
    summary="List events (optionally filter by code & running status)",
)
async def get_events_endpoint(
    event_code: Optional[str] = Query(
        None,
        pattern=r"^[a-zA-Z0-9_]+$",
        description="If set, return only the event with this code",
    ),
    running: Optional[bool] = Query(
        None,
        description="If set, return only events whose start_date_time ≤ now ≤ end_date_time",
    ),
    db: AsyncSession = Depends(get_db),
) -> EventListResponse:
    """
    Retrieve a list of events, optionally filtered by code and running status.

    Args:
        code (Optional[str]): Event code to filter a single event.
        running (Optional[bool]): If True, return only ongoing events; if False, only non-running events.
        db (AsyncSession): Async SQLAlchemy session for database access.

    Returns:
        EventListResponse: Wrapper containing a list of EventInfo objects under the key 'events'.
    """
    try:
        events = await get_events(db, event_code=event_code, running=running)
        return EventListResponse(events=events)

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


# --------------------------------------------------------------------
# CREATE EVENTS
# --------------------------------------------------------------------
@router.post(
    "",
    response_model=EventInfo,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new event (with optional image)",
)
async def create_event_endpoint(
    *,
    payload: CreateEventInput,
    db: AsyncSession = Depends(get_db),
    blob_service: BlobServiceClient = Depends(get_blob_service),
) -> EventInfo:
    """
    Create an Event, optionally uploading an image.
    Generates a QR code pointing to `/events/{code}`.
    """
    try:
        event = await create_event(db, payload, blob_service)
    except EventAlreadyExists as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    return event


# --------------------------------------------------------------------
# UPDATE EVENTS
# --------------------------------------------------------------------
@router.put(
    "",
    response_model=EventInfo,
    status_code=status.HTTP_200_OK,
    summary="Update an existing event",
)
async def update_event_endpoint(
    payload: UpdateEventInput,
    db: AsyncSession = Depends(get_db),
    blob_service: BlobServiceClient = Depends(get_blob_service),
) -> EventInfo:
    """
    Update fields of an existing event identified by its code.

    Args:
        payload (UpdateEventInput): Input data including code and fields to update.
        db (AsyncSession): Async SQLAlchemy session for database access.

    Returns:
        EventInfo: Details of the updated event.

    Raises:
        HTTPException 404: If no event with the given code is found.
    """
    try:
        event = await update_event(db, payload, blob_service)
    except EventNotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    return event


@router.put(
    "/image/{event_code}",
    response_model=EventInfo,
    status_code=status.HTTP_200_OK,
    summary="Upload or replace an event's image",
)
async def upsert_event_image_endpoint(
    event_code: str = Path(..., description="Event code whose image to set"),
    image_file: UploadFile = File(..., description="Image file (jpg/png)"),
    db: AsyncSession = Depends(get_db),
    container: ContainerClient = Depends(get_event_container),
) -> EventInfo:
    """
    Idempotently upload or overwrite the image for an existing event
    into the container under `assets/event_image.<ext>`.
    Returns 404 if the event code doesn’t exist.
    """
    try:
        event = await upsert_event_image(db, event_code, image_file, container)
    except EventNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return event


# --------------------------------------------------------------------
# DELETE EVENTS
# --------------------------------------------------------------------
@router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an event",
)
async def delete_event_endpoint(
    payload: DeleteEventInput,
    db: AsyncSession = Depends(get_db),
    blob_service: BlobServiceClient = Depends(get_blob_service),
) -> None:
    """
    Delete an event and all its associated images and faces.

    Args:
        payload (DeleteEventInput): Input containing the code of the event to remove.
        db (AsyncSession): Async SQLAlchemy session for database access.

    Raises:
        HTTPException 404: If no event with the given code is found.
    """
    try:
        await delete_event(db, payload.event_code, blob_service)
    except EventNotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
