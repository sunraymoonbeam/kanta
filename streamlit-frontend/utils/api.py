import os
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests
import streamlit as st
from requests import HTTPError

API_BASE_URL: str = os.getenv("BACKEND_SERVER_URL", "http://backend:8000/api/v1")
SYSTEM_HEALTH_URL = f"{API_BASE_URL}/system/health"
EVENT_URL = f"{API_BASE_URL}/events"
IMAGE_URL = f"{API_BASE_URL}/pics"
CLUSTER_URL = f"{API_BASE_URL}/clusters"
FACE_SIMILARITY_URL = f"{API_BASE_URL}/find-similar"


def wait_for_backend(timeout=30, interval=2):
    """
    Wait for the backend service to be ready.

    Args:
        url: The URL to check for readiness.
        timeout: Maximum time to wait in seconds.
        interval: Time to wait between checks in seconds.

    Returns:
        True if the backend is ready, otherwise raises an error.
    """
    start = time.time()
    with st.spinner("Waiting for backend to spin up...this could take a few seconds."):
        while time.time() - start < timeout:
            try:
                r = requests.get(SYSTEM_HEALTH_URL, timeout=5)
                if r.status_code == 200:
                    return True
            except Exception:
                pass
            time.sleep(interval)
    st.error("Backend not ready. Exiting application.")
    st.stop()


# --------------------------------------------------------------------
# EVENTS
# - get_events: Fetch all events or a specific event by code.
# - create_event: Create a new event.
# - update_event: Update an existing event.
# - delete_event: Delete an event by code.
# --------------------------------------------------------------------


def get_events(event_code: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch all events or a specific event by code.

    Args:
        event_code: Optional code to filter the events.

    Returns:
        A list of event dictionaries.

    Raises:
        HTTPError: If the API returns a non-200 status.
    """
    # Build query parameters
    params: Dict[str, str] = {}
    if event_code:
        params["event_code"] = event_code

    response = requests.get(url=EVENT_URL, params=params, timeout=30)
    try:
        response.raise_for_status()
    except HTTPError:
        # Propagate HTTP errors to be handled by the caller
        raise

    payload = response.json()
    return payload.get("events", [])


def create_event(
    event_code: str,
    name: str,
    description: str,
    start_date_time: datetime,
    end_date_time: datetime,
) -> Dict[str, Any]:
    """
    Create a new event.

    Args:
        event_code: Unique identifier for the event.
        name: Human-readable name.
        description: Description of the event.
        start_date_time: Starting datetime.
        end_date_time: Ending datetime.

    Returns:
        The created event as a dictionary.

    Raises:
        HTTPError: If the API returns a non-201 status.
    """
    payload: Dict[str, Any] = {
        "event_code": event_code,
        "name": name,
        "description": description,
        "start_date_time": start_date_time.isoformat(),
        "end_date_time": end_date_time.isoformat(),
    }

    response = requests.post(url=EVENT_URL, json=payload, timeout=30)
    response.raise_for_status()

    return response.json()


def update_event(
    event_code: str,
    name: str,
    description: str,
    start_date_time: datetime,
    end_date_time: datetime,
) -> Dict[str, Any]:
    """
    Update an existing event.

    Args:
        event_code: Code of the event to update.
        name: Updated name.
        description: Updated description.
        start_date_time: New start datetime.
        end_date_time: New end datetime.

    Returns:
        The updated event as a dictionary.

    Raises:
        HTTPError: If the API returns a non-200 status.
    """
    url = f"{API_BASE_URL}/events"
    payload: Dict[str, Any] = {
        "event_code": event_code,
        "name": name,
        "description": description,
        "start_date_time": start_date_time.isoformat(),
        "end_date_time": end_date_time.isoformat(),
    }

    response = requests.put(url, json=payload, timeout=30)
    response.raise_for_status()

    return response.json()


def upload_event_image(event_code: str, image_file: Any) -> Dict[str, Any]:
    """
    Upload an image file to a specific event.

    Args:
        event_code: The event code to associate the image with.
        image_file: File-like object (e.g., io.BytesIO or uploaded file).

    Returns:
        API response as a dictionary.

    Raises:
        HTTPError: If the API returns a non-2xx status.
    """
    url = f"{API_BASE_URL}/events/image/{event_code}"
    files = {"image_file": (image_file.name, image_file, "image/jpeg")}

    response = requests.put(url, files=files, timeout=30)
    response.raise_for_status()

    return response.json()


def delete_event(event_code: str) -> None:
    """
    Delete an event by its code.

    Args:
        event_code: The code of the event to delete.

    Returns:
        API response as a dictionary.

    Raises:
        HTTPError: If the API returns a non-204 status.
    """
    payload: Dict[str, str] = {"event_code": event_code}

    response = requests.delete(url=EVENT_URL, json=payload, timeout=30)
    response.raise_for_status()


# --------------------------------------------------------------------
# IMAGES
# - get_images: Fetch images with optional filters.
# - get_image_detail: Fetch detailed information for a given image UUID.
# - upload_image: Upload an image file to a specific event.
# - delete_image: Delete an image by its UUID.
# --------------------------------------------------------------------
def get_images(
    event_code: str, limit: int = 50, offset: int = 0, **filter_params: Optional[str]
) -> Dict[str, Any]:
    """
    Fetch images with optional filters.

    Args:
        event_code: Filter by event code.
        limit: Maximum images to retrieve.
        offset: Pagination offset.
        date: Filter by date (YYYY-MM-DD).
        face_uuid: Filter by face UUID.

    Returns:
        API response as a dictionary containing images.

    Raises:
        HTTPError: If the API returns a non-200 status.
    """
    # Build query parameters
    params = {
        "event_code": event_code,
        "limit": limit,
        "offset": offset,
        **{k: v for k, v in filter_params.items() if v is not None},
    }

    response = requests.get(url=IMAGE_URL, params=params, timeout=30)
    response.raise_for_status()

    return response.json()


def get_image_detail(image_uuid: str) -> Dict[str, Any]:
    """
    Fetch detailed information for a given image UUID.

    Args:
        image_uuid: UUID of the image.

    Returns:
        API response as a dictionary with image details.

    Raises:
        HTTPError: If the API returns a non-200 status.
    """
    url = f"{IMAGE_URL}/{image_uuid}"

    response = requests.get(url, timeout=30)
    response.raise_for_status()

    return response.json()


def upload_image(event_code: str, image_file: Any) -> Dict[str, Any]:
    """
    Upload an image file to a specific event.

    Args:
        event_code: The event code to associate the image with.
        image_file: File-like object (e.g., io.BytesIO or uploaded file).

    Returns:
        API response as a dictionary.

    Raises:
        HTTPError: If the API returns a non-201 status.
    """
    url = f"{IMAGE_URL}/{event_code}"
    files = {"image_file": (image_file.name, image_file, "image/jpeg")}

    response = requests.post(url, files=files, timeout=30)
    response.raise_for_status()

    return response.json()


def delete_image(event_code: str, image_uuid: str) -> None:
    """
    Delete an image by its UUID.

    Args:
        image_uuid: The UUID of the image to delete.

    Raises:
        HTTPError: If the API returns a non-204 status.
    """
    url = f"{IMAGE_URL}/{event_code}/{image_uuid}"

    response = requests.delete(url, timeout=30)
    response.raise_for_status()


# --------------------------------------------------------------------
# CLUSTERS
# - get_clusters: Fetch clustering information for an event.
# - find_similar_faces: Find similar faces by uploading an image.
# --------------------------------------------------------------------
def get_clusters(event_code: str, sample_size: int = 5) -> Dict[str, Any]:
    """
    Fetch clustering information for an event.

    Args:
        event_code: Event code to filter clusters.
        sample_size: Number of images to sample for clustering.

    Returns:
        API response as a dictionary containing clusters.

    Raises:
        HTTPError: If the API returns a non-200 status.
    """
    params = {"event_code": event_code, "sample_size": sample_size}

    response = requests.get(url=CLUSTER_URL, params=params, timeout=30)
    response.raise_for_status()

    return response.json()


def find_similar_faces(
    event_code: str,
    image_bytes: bytes,
    image_filename: str,
    metric: str = "cosine",
    top_k: int = 10,
) -> List[Dict[str, Any]]:
    """
    Find similar faces by uploading an image.

    Args:
        event_code: Filter by event code.
        image_bytes: Raw bytes of the image file.
        image_filename: Filename to use for the upload.
        metric: Similarity metric (default: 'cosine').
        top_k: Number of closest matches to return.

    Returns:
        A list of dictionaries representing similar faces.

    Raises:
        HTTPError: If the API returns a non-200 status.
    """
    files = {
        # must match the parameter name "image" in FastAPI
        "image": (image_filename, image_bytes, "image/jpeg")
    }
    # pass your Query args in the multipart body
    params = {
        "event_code": event_code,
        "metric": metric,
        "top_k": top_k,
    }

    response = requests.post(
        url=FACE_SIMILARITY_URL,
        files=files,
        params=params,
        timeout=30,
    )
    response.raise_for_status()
    return response.json()
