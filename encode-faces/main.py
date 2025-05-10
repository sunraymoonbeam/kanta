"""
Face Encoding Service – FastAPI
===============================

A micro‑service to:

1. **POST /upload-image** – Upload an image (any picture), detect faces
   and bounding boxes (if present), store the file in Azure Blob Storage,
   and return metadata.
2. **GET /pics** – List stored pictures with optional filters and
   stateless pagination.
3. **GET /pics/{uuid}** – Retrieve metadata for a single picture.
4. **GET /health** – Liveness / readiness probe.
"""

from __future__ import annotations

import json
import os
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, List, Optional

import face_recognition
import numpy as np
import uvicorn
from azure.core.exceptions import ResourceExistsError
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from PIL import Image

from src.utils.azure_blob_storage import setup_blob_service_client

# environment variables and global resources
load_dotenv()

CONTAINER_NAME: str = os.getenv("AZURE_CONTAINER_NAME", "images")
_resources: Dict[str, Any] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise and dispose of the Azure Blob client."""
    logger.info("Initialising Azure Blob client…")
    _resources["blob"] = setup_blob_service_client(
        connection_string=os.getenv("AZURE_STORAGE_CONNECTION_STRING") or None,
    )
    logger.info("Azure Blob client sucessfully initialised")
    try:
        yield
    finally:
        logger.info("Shutting down – releasing Azure Blob client")
        _resources.clear()


app = FastAPI(
    title="Face Encoding API",
    description="Upload pictures, get face metadata, and browse stored photos.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # lock down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# endpoints


@app.post("/upload-image/", response_model=Dict[str, Any])
async def upload_image(image: UploadFile = File(...)) -> Dict[str, Any]:
    """Upload an image, detect faces, and persist to Azure.

    Workflow:
        1. **Validate** the incoming file is an image.
        2. **Load** bytes into memory and convert to NumPy array.
        3. **Detect** faces & bounding boxes (`face_recognition` HOG model).
        4. **Generate** 128‑D embeddings for each detected face.
        5. **Upload** raw bytes to Azure Blob Storage under a UUID path.
        6. **Return** the blob URL + metadata (face count, embeddings, boxes).

    Args:
        image: Multipart file sent by the client.

    Returns:
        Dict with keys:
            * `uuid` – unique ID assigned to the image.
            * `blob_url` – absolute Azure URL.
            * `faces` – number of faces detected.
            * `boxes` – list of [top, right, bottom, left] ints.
            * `embeddings` – list of 128‑float lists.

    Raises:
        HTTPException: 400 for bad input; 500 for upload failure.
    """
    if not image.content_type.startswith("image/"):
        logger.warning("Rejected upload – file is not an image")
        raise HTTPException(status_code=400, detail="File must be an image")

    # Load image into memory
    logger.info("Loading image…")
    load_t0 = time.perf_counter()
    data: bytes = await image.read()
    try:
        pil_img = Image.open(BytesIO(data))
    except (OSError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid image data")
    img_np = np.array(pil_img.convert("RGB"))
    load_time = time.perf_counter() - load_t0

    # Detect faces & embeddings
    logger.info("Detecting faces & generating embeddings…")
    detect_t0 = time.perf_counter()
    boxes: List[List[int]] = face_recognition.face_locations(img_np, model="hog")
    embeddings = face_recognition.face_encodings(img_np, boxes) if boxes else []
    detect_time = time.perf_counter() - detect_t0

    if len(boxes) != len(embeddings):
        logger.warning(
            "Mismatch between boxes (%d) and embeddings (%d)",
            len(boxes),
            len(embeddings),
        )

    # Prepare Azure container
    blob_service = _resources["blob"]
    container = blob_service.get_container_client(CONTAINER_NAME)
    try:
        container.create_container()
    except ResourceExistsError:
        pass  # already exists

    # Blob details
    uuid_ = uuid.uuid4().hex
    ext = (image.filename or "upload").split(".")[-1].lower()
    blob_name = f"uploads/{uuid_}.{ext}"
    metadata = {
        "uuid": uuid_,
        "faces": str(len(embeddings)),
        "boxes": json.dumps(boxes),
    }

    # Upload
    logger.info("Uploading image to Azure Blob Storage…")
    try:
        container.upload_blob(
            name=blob_name, data=data, overwrite=True, metadata=metadata
        )
    except Exception as exc:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail="Failed to upload image") from exc
    upload_time = time.perf_counter() - detect_t0 - detect_time

    logger.info(
        "Upload successful – load: %.2fs | detect: %.2fs | upload: %.2fs | faces: %d | uuid: %s",
        load_time,
        detect_time,
        upload_time,
        len(embeddings),
        uuid_,
    )

    return {
        "uuid": uuid_,
        "blob_url": container.get_blob_client(blob_name).url,
        "faces": len(embeddings),
        "boxes": boxes,
        "embeddings": [e.tolist() for e in embeddings],
    }


@app.get("/blob/pics", response_model=Dict[str, Any])
async def list_pics(
    limit: int = Query(50, ge=1, le=200),
    continuation_token: Optional[str] = Query(
        None, description="Opaque cursor returned by the previous page"
    ),
) -> Dict[str, Any]:
    """List stored pictures with optional filters & pagination.

    #     Args:
    #         limit: Max number of blobs to return (1‑200).
    #         continuation_token: Cursor for the next page (from previous response).
    #         date_from / date_to: Server‑side filtering by blob `last_modified`.
    #         faces_min / faces_max: Filter using blob metadata (`faces`).

    #     Returns:
    #         {
    #           "items": [ {uuid, blob_url, faces, boxes, last_modified}, … ],
    #           "next_token": str | null
    #         }
    #"""
    blob_service = _resources["blob"]
    container = blob_service.get_container_client(CONTAINER_NAME)

    # Build a page iterator
    list_paged = container.list_blobs(
        name_starts_with="uploads/",
        results_per_page=limit,
        include=["metadata", "tags"],
    ).by_page(continuation_token)

    try:
        # Step 2 ── fetch the *first* page only
        first_page = next(list_paged)
    except StopIteration:
        # Empty container or continuation token was beyond the end
        return {"items": [], "next_token": None}

    items: List[Dict[str, Any]] = []
    for blob in first_page:
        # For now. don't implement client-side filtering, default to no filters so frontend can scroll infintely.
        # Azure Blob Sotrage is not a database, so we can't filter on metadata or tags easily
        # We index blobs in a DB when filtering is needed, since we can filter, sort and paginate easily.

        # # ------------------ server‑side properties ----------------------- #
        # if date_from and blob.last_modified < date_from:
        #     continue
        # if date_to and blob.last_modified > date_to:
        #     continue

        # # ------------------ metadata filters ---------------------------- #
        # if faces_min is not None and faces < faces_min:
        #     continue
        # if faces_max is not None and faces > faces_max:
        #     continue

        meta = blob.metadata or {}
        items.append(
            {
                "uuid": meta.get("uuid") or blob.name.split("/")[-1].split(".")[0],
                "blob_url": container.get_blob_client(blob).url,
                "faces": int(meta.get("faces", "0")),
                "boxes": json.loads(meta.get("boxes", "[]")),
                "creation_time": blob.creation_time,
                "last_modified": blob.last_modified,
            }
        )

    # Expose the continuation token for the next page
    # If the page is empty, the token will be None
    next_token = list_paged.continuation_token
    return {"items": items, "next_token": next_token}


@app.get("/blob/pics/{uuid}", response_model=Dict[str, Any])
async def get_pic(uuid: str) -> Dict[str, Any]:
    """Retrieve a single picture's metadata by UUID.

    Args:
        uuid: The 32‑char hex ID generated on upload.

    Returns:
        Dict with `uuid`, `blob_url`, `faces`, `boxes`, `creation_time`, `last_modified`.
    """
    blob_service = _resources["blob"]
    container = blob_service.get_container_client(CONTAINER_NAME)
    blob_client = container.get_blob_client(f"uploads/{uuid}")

    # The blob could have any extension; iterate over common ones
    for extension in ("jpg", "jpeg", "png", "gif", "webp"):
        bc = container.get_blob_client(f"uploads/{uuid}.{extension}")
        if bc.exists():
            blob_client = bc
            break
    else:
        raise HTTPException(status_code=404, detail="Picture not found")

    props = blob_client.get_blob_properties()
    meta = props.metadata or {}

    return {
        "uuid": uuid,
        "blob_url": blob_client.url,
        "faces": int(meta.get("faces", "0")),
        "boxes": json.loads(meta.get("boxes", "[]")),
        "creation_time": props.creation_time,
        "last_modified": props.last_modified,
    }


@app.get("/health", response_model=Dict[str, str])
async def get_health_status() -> Dict[str, str]:
    """Liveness / readiness probe.

    Returns:
        Simple JSON object indicating API and Azure connection status.
    """
    azure_status = "connected" if "blob" in _resources else "disconnected"
    return {
        "status": "healthy",
        "message": "Face Encoding API is operational",
        "azure_connection": azure_status,
    }


if __name__ == "__main__":  # pragma: no cover
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8005)),
        reload=os.getenv("DEV") == "1",
    )
