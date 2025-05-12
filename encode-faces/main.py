"""
main.py – Face Encoding Service
===============================

FastAPI micro-service to:

1. **POST /upload-image**      – Detect faces, upload image to Azure Blob, persist to Azure Postgres DB.
2. **POST /events**            – Create a new event (code, optional name & start_time).
3. **GET /events/{code}**      – Retrieve an event’s details by its code.
4. **DELETE /events/{code}**   – Delete an event (and all associated data).
5. **GET /pics**               – List stored images with optional filters (incl. clusters).
6. **GET /pics/{uuid}**        – Metadata for a single image and its faces.
7. **DELETE /pics/{uuid}**     – Delete an image (rows + blob).
8. **GET /clusters**           – Summary per cluster (counts + samples).
9. **GET /health**             – Liveness / readiness probe.

Deprecated:
- **GET /blob/pics**          – Infinite‐scroll listing of raw Azure blobs.
- **GET /blob/pics/{uuid}**   – Metadata for a single raw Azure blob.
"""

from __future__ import annotations

import json
import os
import re
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from io import BytesIO
from typing import Any, Dict, List, Optional, Sequence, Union

import face_recognition
import numpy as np
import uvicorn
from azure.core.exceptions import ResourceExistsError
from dotenv import load_dotenv
from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    Query,
    # RedirectResponse,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from PIL import Image
from pydantic import BaseModel, Field

from src.db.database import Database
from src.utils.azure_blob_storage import setup_blob_service_client

load_dotenv()


EVENT_CODE = os.getenv("EVENT_CODE", "spring2026_salt_shira")
CONTAINER_NAME: str = os.getenv("AZURE_CONTAINER_NAME", "images")
_resources: Dict[str, Any] = {}


# Pydantic response models
class EventIn(BaseModel):
    """
    Input model for creating an event.
    """

    code: str = Field(..., example="spring24")
    name: Optional[str] = Field(None, example="Alice & Bob Wedding")
    start_time: Optional[datetime] = Field(
        None, description="ISO-8601 timestamp of event start, e.g. 2025-06-01T15:00:00Z"
    )


class EventInfo(BaseModel):
    """
    Output model for event data.
    """

    id: int
    code: str
    name: Optional[str]
    start_time: Optional[datetime]
    created_at: datetime


class ImageInfo(BaseModel):
    """
    Image metadata returned from the database.

    Attributes:
        uuid:           32-character hex identifier.
        azure_blob_url: URL of the image in Azure Blob Storage.
        file_extension: e.g. 'jpg', derived by DB trigger.
        faces:          Number of faces detected.
        created_at:     Record creation timestamp.
        last_modified:  Record last-modified timestamp.
    """

    uuid: str
    azure_blob_url: str
    file_extension: str = Field(..., example="jpg")
    faces: int
    created_at: datetime
    last_modified: datetime


class FaceInfo(BaseModel):
    """
    Face metadata returned in image-details & similarity responses.

    Attributes:
        face_id:    Primary key of the face row.
        image_uuid: Parent image UUID.
        cluster_id: Cluster label of this face.
        bbox:       Bounding box dict with keys 'x','y','width','height'.
    """

    face_id: int
    image_uuid: str
    cluster_id: int
    bbox: Dict[str, int]


class ImageDetails(BaseModel):
    """
    Combined image + all its faces.

    Attributes:
        image: ImageOut metadata.
        faces: List of FaceOut entries.
    """

    image: ImageInfo
    faces: List[FaceInfo]


class UploadResp(BaseModel):
    """
    Response model for `/upload-image`.

    Attributes:
        uuid:       Assigned image UUID.
        blob_url:   Public Azure Blob URL.
        faces:      Number of faces detected.
        boxes:      List of face-location boxes [top, right, bottom, left].
        embeddings: List of 128-D float vectors.
    """

    uuid: str
    blob_url: str
    faces: int
    boxes: List[Sequence[int]]
    embeddings: List[Sequence[float]]


class ClusterSample(BaseModel):
    """
    One random sample face within a cluster.

    Attributes:
        face_id:         Primary key of the sample face.
        sample_blob_url: Azure Blob URL for that face's image.
        sample_bbox:     Bounding-box dict for that sample face.
    """

    face_id: int
    sample_blob_url: str
    sample_bbox: Dict[str, int]


class ClusterInfo(BaseModel):
    """
    Summary information for a single cluster.

    Attributes:
        cluster_id:  Integer label of the cluster.
        face_count:  Total faces in this cluster.
        samples:     Up to `sample_size` ClusterSample entries.
    """

    cluster_id: int
    face_count: int
    samples: List[ClusterSample]


class SimilarFaceOut(BaseModel):
    """
    A single “similar face” result from `/find-similar`.

    Attributes:
        face_id:        Matching face's primary key.
        image_uuid:     Parent image UUID.
        azure_blob_url: URL of that image.
        cluster_id:     Cluster label.
        bbox:           Bounding box of the face.
        embedding:      Full 128-D embedding.
        distance:       Distance metric (lower = more similar).
    """

    face_id: int
    image_uuid: str
    azure_blob_url: str
    cluster_id: int
    bbox: Dict[str, int]
    embedding: List[float]
    distance: float


# Lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize Azure blob client and database pool on startup; clean up on shutdown."""

    logger.info("⏳ Starting up – Azure Blob Storage Client…")
    _resources["blob"] = setup_blob_service_client(
        connection_string=os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    )
    logger.success("✅ Azure Blob Storage Client ready")

    logger.info("⏳ Starting up – Database Connection Pool…")
    try:
        db = Database(
            host=os.getenv("DBHOST", "localhost"),
            port=int(os.getenv("DBPORT", 5432)),
            user=os.getenv("DBUSER", "kanta_admin"),
            password=os.getenv("DBPASSWORD", "password"),
            database=os.getenv("DBNAME", "postgres"),
            ssl=os.getenv("SSLMODE", "require"),
        )
        await db.connect()
        _resources["db"] = db
        logger.success("✅ Database Connection Pool ready")
    except Exception as e:
        logger.error(f"❌ Failed to connect to database: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

    # Ensure the default event row exists
    await db.insert_event(
        event_code=EVENT_CODE,
        name="Event for testing",
        start_time=datetime.now(timezone.utc).replace(tzinfo=None),
    )

    try:
        yield
    finally:
        logger.info("⏳ Shutting down…")
        await db.close()
        _resources.clear()
        logger.success("✅ Clean shutdown complete")


app = FastAPI(
    title="Face Encoding API",
    description="Upload images, compute face embeddings, and query stored data.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Resource dependencies
def get_db() -> Database:
    """Dependency to retrieve our shared Database instance."""
    return _resources["db"]  # type: ignore


def get_container():
    """Return (and create, if needed) our Azure container."""
    blob_service = _resources["blob"]
    container = blob_service.get_container_client(CONTAINER_NAME)
    try:
        container.create_container()
    except ResourceExistsError:
        pass
    return container


# Endpoints
@app.post(
    "/events/create", response_model=EventInfo, status_code=status.HTTP_201_CREATED
)
async def create_event(
    event_code: str = Query(
        EVENT_CODE,
        description="Event code to associate with this image",
        regex=r"^[a-zA-Z0-9_]+$",
    ),
    event_name: str = Query(
        "Event Name",
        description="Name of the event",
        regex=r"^[a-zA-Z0-9_ ]+$",
    ),
    start_time: Optional[datetime] = Query(
        None,
        description="ISO-8601 timestamp of event start, e.g. 2025-06-01T15:00:00Z",
    ),
    db: Database = Depends(get_db),
):
    """
    Create a new event. Error if `code` is already used.
    """
    # check for pre-existence
    exists = await db.string_query(
        "SELECT 1 FROM events WHERE code = $1",
        event_code,
    )
    if exists:
        raise HTTPException(
            status_code=400,
            detail=f"Event code '{event_code}' already exists",
        )
    try:
        await db.insert_event(
            event_code=event_code,
            name=event_name,
            start_time=start_time,
        )
        row = await db.get_event_by_code(event_code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return EventInfo(**row)


@app.get("/events/{code}", response_model=EventInfo)
async def read_event(
    code: str,
    db: Database = Depends(get_db),
):
    """
    Retrieve an event by its code.
    """
    try:
        row = await db.get_event_by_code(code)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return EventInfo(**row)


@app.delete("/events/{code}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    code: str,
    db: Database = Depends(get_db),
):
    """
    Delete an event by its code.
    """
    await db.delete_event_by_code(code)


@app.post(
    "/upload-image",
    response_model=UploadResp,
    status_code=status.HTTP_201_CREATED,  # indicates successful creation (usually used with POST)
    summary="Upload an image, detect faces, store in Azure + DB",
)
async def upload_image(
    event_code: str = Query(
        EVENT_CODE,
        description="Event code to associate with this image",
        regex=r"^[a-zA-Z0-9_]+$",
    ),
    image: UploadFile = File(...),
    db: Database = Depends(get_db),
):
    """
    Detect faces in the uploaded image, store the file in Azure Blob Storage,
    persist metadata to PostgreSQL, and return face locations & embeddings.
    """
    # 0) Validate the image
    if not image.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    # 1) Load image into memory → NumPy
    logger.info("Loading image into memory…")
    t0 = time.perf_counter()
    raw = await image.read()
    try:
        pil = Image.open(BytesIO(raw)).convert("RGB")
        img_np = np.array(pil)
    except Exception:
        raise HTTPException(400, "Invalid image data")
    load_time = time.perf_counter() - t0

    # 2) Detect faces & embeddings
    boxes = []
    embeddings = []
    logger.info("Detecting faces and generating embeddings…")
    try:
        t1 = time.perf_counter()
        boxes = face_recognition.face_locations(img_np, model="hog")
        embeddings = face_recognition.face_encodings(img_np, boxes)
    except Exception as e:
        logger.error(f"Face detection failed: {e}")
        raise HTTPException(400, "Face detection failed")
    detect_time = time.perf_counter() - t1
    logger.info(
        f"Detected {len(embeddings)} faces (load {load_time:.2f}s, detect {detect_time:.2f}s)"
    )

    # 3) Upload the raw image to Azure Blob
    container = get_container()
    uid = uuid.uuid4().hex
    ext = (image.filename or "upload").split(".")[-1].lower()
    event_code_sanitized = re.sub(
        r"[^a-z0-9]", "_", event_code
    )  # Sanitize EVENT_CODE to lowercase and remove special characters
    blob_name = f"{event_code_sanitized}/{uid}.{ext}"
    try:
        logger.info(f"Uploading image with uuid: {uid} to Azure Blob Storage")
        container.upload_blob(
            name=blob_name,
            data=raw,
            overwrite=True,
            metadata={
                "event_code": event_code,
                "uuid": uid,
                "faces": str(len(embeddings)),
                "boxes": json.dumps(boxes),
            },
        )
        logger.success(
            f"Succesfully uploaded image with uuid: {uid} to Azure Blob Storage"
        )
    except Exception:
        logger.exception("Blob upload failed")
        raise HTTPException(500, "Failed to upload to Azure")

    blob_client = container.get_blob_client(blob_name)
    props = blob_client.get_blob_properties()
    blob_url = blob_client.url

    # 4) Persist image row
    logger.info(f"Inserting image with uuid: {uid} into DB")
    try:
        await db.insert_image(
            event_code=event_code,
            image_uuid=uid,
            azure_blob_url=blob_url,
            faces=len(embeddings),
            created_at=props.creation_time,
            last_modified=props.last_modified,
        )
        logger.success(f"Succesfully inserted image with uuid: {uid} into DB")
    except Exception as e:
        logger.error(f"Failed to insert image into DB: {e}")
        raise HTTPException(500, "Failed to insert image into DB")

    # 5) Persist face rows
    logger.info(f"Inserting {len(embeddings)} faces from image: {uid} into DB")
    try:
        for box, emb in zip(boxes, embeddings):
            await db.insert_face(
                event_code=EVENT_CODE,
                image_uuid=uid,
                bbox={
                    "x": box[3],
                    "y": box[0],
                    "width": box[1] - box[3],
                    "height": box[2] - box[0],
                },
                embedding=emb.tolist(),
                cluster_id=-2,  # consider the best default value:
            )
        logger.success(
            f"Sucessfully inserted {len(embeddings)} faces from image: {uid} into DB"
        )
    except Exception as e:
        logger.error(f"Failed to insert faces into DB: {e}")
        raise HTTPException(500, "Failed to insert faces into DB")

    return UploadResp(
        uuid=uid,
        blob_url=blob_url,
        faces=len(embeddings),
        boxes=boxes,
        embeddings=[e.tolist() for e in embeddings],
    )


@app.get(
    "/pics",
    response_model=List[ImageInfo],
    summary="List stored images with optional filters & pagination",
)
async def get_pics(
    event_code: str = Query(
        EVENT_CODE,
        description="Event code to filter images",
        regex=r"^[a-zA-Z0-9_]+$",
    ),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    min_faces: Optional[int] = Query(None, ge=0),
    max_faces: Optional[int] = Query(None, ge=0),
    cluster_list_id: Optional[List[int]] = Query(None),
    db: Database = Depends(get_db),
):
    """
    Retrieve a page of images from the DB.

    - `date_from` / `date_to`: ISO 8601 timestamps (will be UTC).
    - `min_faces` / `max_faces`: face-count filters.
    - `cluster_list_id`: only images having at least one face in any of these clusters.
    """
    rows = await db.get_images(
        event_code=event_code,
        limit=limit,
        offset=offset,
        date_from=(date_from.replace(tzinfo=None) if date_from else None),
        date_to=(date_to.replace(tzinfo=None) if date_to else None),
        min_faces=min_faces,
        max_faces=max_faces,
        cluster_list_id=cluster_list_id,
    )
    return [ImageInfo(**r) for r in rows]


@app.get(
    "/pics/{uuid}",
    response_model=ImageDetails,
    summary="Get one image’s metadata plus its faces",
)
async def get_pic(
    uuid: str,
    db: Database = Depends(get_db),
):
    """
    Fetch a single image row plus all its face rows by UUID.
    """
    result = await db.get_image_details_by_uuid(uuid)

    if not result:
        raise HTTPException(404, f"Image with uuid: `{uuid}` not found")

    return ImageDetails(
        image=ImageInfo(**result["image"]),
        faces=[FaceInfo(**f) for f in result["faces"]],
    )


@app.delete(
    "/pics/{uuid}",
    status_code=status.HTTP_204_NO_CONTENT,  # 204 No Content, usually used for PUT / DELETE, when no further content is returned
    summary="Delete an image and its faces (DB + blob)",
)
async def delete_pic(
    uuid: str,
    db: Database = Depends(get_db),
):
    """
    Remove an image from Azure + PostgreSQL by UUID.
    """
    container = get_container()

    # 1) Look for an existing blob under any of our known extensions
    found = False
    for ext in ("jpg", "jpeg", "png", "gif", "webp"):
        blob_name = f"{EVENT_CODE}/{uuid}.{ext}"
        bc = container.get_blob_client(blob_name)

        if bc.exists():  # or: await bc.exists() if using async client
            # 2) Delete it and stop searching
            bc.delete_blob()  # or: await bc.delete_blob()
            logger.info(f"Deleted blob for image with uuid {blob_name}")
            found = True
            break

    # 3) If we never found a blob, that's a 404
    if not found:
        logger.warning(f"No blob found for image uuid={uuid}")
        raise HTTPException(404, f"Image `{uuid}` not found")

    # 4) Now delete the DB row (faces ON DELETE CASCADE will go too)
    await db.delete_image_by_uuid(uuid)
    logger.info(f"Deleted database records for image with uuid {uuid}")

    # FastAPI will automatically return a 204 with no content


@app.get(
    "/clusters",
    responses={307: {"description": "Redirect to filtered /pics"}},
    summary="Either show cluster summary or redirect by cluster_ids → /pics",
)
async def clusters(
    event_code: str = Query(
        EVENT_CODE,
        description="Event code to filter images",
        regex=r"^[a-zA-Z0-9_]+$",
    ),
    cluster_ids: Optional[List[int]] = Query(None, alias="cluster_ids"),
    sample_size: int = Query(5, ge=1, le=20),
    db: Database = Depends(get_db),
) -> Union[List[ClusterInfo], str]:
    """
    - If `?cluster_ids=` is provided, immediately redirect (307) to
      `/pics?cluster_list_id=<id>&...` for the same cluster filters.
    - Otherwise, return a summary (face counts + random samples) per cluster.
    """
    # if cluster_ids:
    #     qs = "&".join(f"cluster_list_id={c}" for c in cluster_ids)
    #     return RedirectResponse(url=f"/pics?{qs}", status_code=307)

    summary = await db.get_cluster_info(event_code=event_code, sample_size=sample_size)
    return [ClusterInfo(**c) for c in summary]


@app.post(
    "/find-similar",
    response_model=List[SimilarFaceOut],
    summary="Find the top-K most similar faces to the one you upload",
)
async def find_similar(
    event_code: str = Query(
        EVENT_CODE,
        description="Event code to filter images",
        regex=r"^[a-zA-Z0-9_]+$",
    ),
    image: UploadFile = File(..., description="Face image → exactly one face"),
    metric: str = Query(
        "cosine", description="Metric: 'cosine' or 'l2'", regex="^(cosine|l2)$"
    ),
    top_k: int = Query(10, ge=1, le=100),
    db: Database = Depends(get_db),
):
    """
    Detect exactly one face in the upload, compute its embedding, then
    return the top-K nearest neighbors from the database.
    """
    # 0) Validate the image
    if not image.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    # 1) Load image into memory → NumPy
    logger.info("Loading image into memory…")
    raw = await image.read()
    try:
        pil = Image.open(BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Invalid image data")
    img_np = np.array(pil)

    # 2) Detect faces & embeddings
    logger.info("Detecting faces and generating embeddings…")
    boxes = face_recognition.face_locations(img_np, model="hog")
    if len(boxes) != 1:
        msg = (
            "No face detected, please upload an image with exactly one face"
            if not boxes
            else "Multiple faces detected, please upload an image with exactly one face"
        )
        raise HTTPException(400, msg)

    emb = face_recognition.face_encodings(img_np, boxes)[0].tolist()
    logger.info(f"Searching top-{top_k} by {metric} metric distance…")
    hits = await db.similarity_search(
        event_code=event_code,
        target_embedding=emb,
        metric=metric,
        top_k=top_k,
    )
    logger.success(f"Found {len(hits)} similar faces")
    return [SimilarFaceOut(**r) for r in hits]


# Deprecated: use `/pics` instead
# @app.get(
#     "/blob/pics",
#     response_model=Dict[str, Any],
#     summary="Azure-blob infinite-scroll listing (unchanged)",
# )
# async def list_blob_pics(
#     limit: int = Query(50, ge=1, le=200),
#     continuation_token: Optional[str] = Query(None),
# ):
#     blob_service = _resources["blob"]
#     container = blob_service.get_container_client(CONTAINER_NAME)
#     pages = container.list_blobs(
#         name_starts_with="uploads/", include=["metadata"], results_per_page=limit
#     ).by_page(continuation_token)
#     try:
#         first = next(pages)
#     except StopIteration:
#         return {"items": [], "next_token": None}

#     items = []
#     for b in first:
#         m = b.metadata or {}
#         items.append(
#             {
#                 "uuid": m.get("uuid"),
#                 "blob_url": container.get_blob_client(b).url,
#                 "faces": int(m.get("faces", "0")),
#                 "boxes": json.loads(m.get("boxes", "[]")),
#                 "creation_time": b.creation_time,
#                 "last_modified": b.last_modified,
#             }
#         )

#     return {"items": items, "next_token": pages.continuation_token}

# Deprecated: use `/pics/{uuid}` instead
# @app.get(
#     "/blob/pics/{uuid}",
#     response_model=Dict[str, Any],
#     summary="Fetch a single blob’s metadata by UUID",
# )
# async def get_blob_pic(uuid: str) -> Dict[str, Any]:
#     blob_service = _resources["blob"]
#     container = blob_service.get_container_client(CONTAINER_NAME)
#     for ext in ("jpg", "jpeg", "png", "gif", "webp"):
#         bc = container.get_blob_client(f"uploads/{uuid}.{ext}")
#         if bc.exists():
#             props = bc.get_blob_properties()
#             m = props.metadata or {}
#             return {
#                 "uuid": uuid,
#                 "blob_url": bc.url,
#                 "faces": int(m.get("faces", "0")),
#                 "boxes": json.loads(m.get("boxes", "[]")),
#                 "creation_time": props.creation_time,
#                 "last_modified": props.last_modified,
#             }
#     raise HTTPException(status_code=404, detail="Blob not found")


@app.get("/health", summary="Liveness/readiness probe")
async def health() -> Dict[str, str]:
    """
    Check the health of the service by verifying the connection to Azure Blob Storage
    and the database.
    """
    azure_status = "blob" in _resources
    db_status = "db" in _resources
    healthy = azure_status and db_status
    return {
        "status": "healthy" if healthy else "unhealthy",
        "azure": "connected" if azure_status else "disconnected",
        "db": "connected" if db_status else "disconnected",
    }


if __name__ == "__main__":  # pragma: no cover
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
    )
