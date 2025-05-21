from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

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
async def list_events(
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
    events = await get_events(db, event_code=event_code, running=running)
    return EventListResponse(events=events)


# --------------------------------------------------------------------
# CREATE EVENTS
# --------------------------------------------------------------------
@router.post(
    "",
    response_model=EventInfo,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new event",
)
async def create_event_endpoint(
    payload: CreateEventInput,
    db: AsyncSession = Depends(get_db),
) -> EventInfo:
    """
    Create a new event in the system.

    Args:
        payload (CreateEventInput): Input data including code, name, description, and timestamps.
        db (AsyncSession): Async SQLAlchemy session for database access.

    Returns:
        EventInfo: Details of the newly created event.

    Raises:
        HTTPException 400: If an event with the same code already exists.
    """
    try:
        event = await create_event(db, payload)
    except EventAlreadyExists as exc:
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
        event = await update_event(db, payload)
    except EventNotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
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
        await delete_event(db, payload.code)
    except EventNotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
