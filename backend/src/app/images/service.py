import json
import re
import uuid
from datetime import datetime
from io import BytesIO
from typing import List, Optional

import face_recognition
import numpy as np
from azure.storage.blob import ContainerClient
from fastapi import HTTPException
from loguru import logger
from PIL import Image as PILImage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..events.service import get_event
from .models import Face, Image
from .schemas import (
    FaceSummary,
    ImageDetailResponse,
    ImageListItem,
    UploadImageResponse,
)


# --------------------------------------------------------------------
# GET IMAGES
# --------------------------------------------------------------------
async def get_images(
    db: AsyncSession,
    event_code: str,
    limit: int,
    offset: int,
    date_from: Optional[datetime],
    date_to: Optional[datetime],
    min_faces: Optional[int],
    max_faces: Optional[int],
    cluster_list_id: Optional[List[int]],
) -> List[ImageListItem]:
    """
    Retrieve a paginated list of images for a given event, with optional filtering.

    Args:
        db (AsyncSession): Async SQLAlchemy session.
        event_code (str): Event code to scope the query.
        limit (int): Maximum number of images to return.
        offset (int): Pagination offset.
        date_from (Optional[datetime]): Only include images created on or after this timestamp.
        date_to (Optional[datetime]): Only include images created on or before this timestamp.
        min_faces (Optional[int]): Only include images with at least this many faces.
        max_faces (Optional[int]): Only include images with at most this many faces.
        cluster_list_id (Optional[List[int]]): List of cluster IDs; only include images having faces in any of these clusters.

    Returns:
        List[ImageListItem]: List of summary metadata for each image.

    Raises:
        HTTPException 404: If the specified event does not exist.
    """
    from app.events.service import get_event

    event = await get_event(db, event_code)

    stmt = select(Image).where(Image.event_id == event.id)
    if date_from:
        stmt = stmt.where(Image.created_at >= date_from)
    if date_to:
        stmt = stmt.where(Image.created_at <= date_to)
    if min_faces is not None:
        stmt = stmt.where(Image.faces >= min_faces)
    if max_faces is not None:
        stmt = stmt.where(Image.faces <= max_faces)
    if cluster_list_id:
        stmt = (
            stmt.join(Image.faces_rel)
            .where(Face.cluster_id.in_(cluster_list_id))
            .distinct()
        )

    stmt = stmt.order_by(Image.last_modified.desc()).offset(offset).limit(limit)

    result = await db.execute(stmt)
    images = result.scalars().all()
    return [ImageListItem.from_orm(img) for img in images]


# --------------------------------------------------------------------
# GET IMAGE DETAIL
# --------------------------------------------------------------------
async def get_image_detail(
    db: AsyncSession,
    uuid: str,
) -> ImageDetailResponse:
    """
    Fetch detailed metadata for a single image, including its associated faces.

    Args:
        db (AsyncSession): Async SQLAlchemy session.
        uuid (str): UUID of the image to retrieve.

    Returns:
        ImageDetailResponse: Detailed metadata and face summaries.

    Raises:
        HTTPException 404: If no image with the given UUID is found.
    """
    stmt = (
        select(Image).where(Image.uuid == uuid).options(selectinload(Image.faces_rel))
    )
    result = await db.execute(stmt)
    image = result.scalar_one_or_none()
    if image is None:
        raise HTTPException(404, f"Image `{uuid}` not found")

    faces = [
        FaceSummary(face_id=f.id, cluster_id=f.cluster_id, bbox=f.bbox)
        for f in image.faces_rel
    ]
    return ImageDetailResponse(image=ImageListItem.from_orm(image), faces=faces)


# --------------------------------------------------------------------
# CREATE IMAGES
# --------------------------------------------------------------------
async def upload_image(
    db: AsyncSession,
    container: ContainerClient,
    event_code: str,
    upload_file,
) -> UploadImageResponse:
    """
    Process an image upload: detect faces, upload to Azure Blob Storage,
    and persist both the Image and its Face records in the database.

    Args:
        db (AsyncSession): Async SQLAlchemy session for DB operations.
        container (ContainerClient): Azure Blob Storage container client.
        event_code (str): Unique code identifying the event.
        upload_file (UploadFile): Incoming file object from FastAPI.

    Returns:
        UploadImageResponse: Contains the new image UUID, blob URL,
            number of faces detected, face bounding boxes, and embeddings.

    Raises:
        HTTPException 400: If the file is not a valid image or face detection fails.
        HTTPException 500: If uploading to Azure or database persistence fails.
    """
    # 0) validate image
    if not upload_file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    # 1) load into numpy
    raw = await upload_file.read()
    try:
        pil = PILImage.open(BytesIO(raw)).convert("RGB")
        img_np = np.array(pil)
    except Exception:
        raise HTTPException(400, "Invalid image data")

    # 2) detect faces & embeddings
    try:
        boxes = face_recognition.face_locations(img_np, model="hog")
        embeddings = face_recognition.face_encodings(img_np, boxes)
    except Exception as e:
        logger.error(f"Face detection failed: {e}")
        raise HTTPException(400, "Face detection failed")

    # 3) get event and blob name
    event = await get_event(db, event_code)
    uid = uuid.uuid4().hex
    ext = (upload_file.filename or "upload").rsplit(".", 1)[-1].lower()
    sanitized = re.sub(r"[^a-z0-9]", "_", event_code.lower())
    blob_name = f"{sanitized}/{uid}.{ext}"

    # 4) upload to Azure
    try:
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
        props = container.get_blob_client(blob_name).get_blob_properties()
    except Exception:
        logger.exception("Failed to upload to Azure")
        raise HTTPException(500, "Failed to upload to Azure")

    # 5) persist Image row
    image = Image(
        event_id=event.id,
        uuid=uid,
        azure_blob_url=container.url + "/" + blob_name,
        file_extension=ext,
        faces=len(embeddings),
        created_at=props.creation_time,
        last_modified=props.last_modified,
    )
    db.add(image)
    await db.commit()
    await db.refresh(image)

    # 6) persist Face rows
    face_objs: List[Face] = []
    for box, emb in zip(boxes, embeddings):
        bbox = {
            "x": box[3],
            "y": box[0],
            "width": box[1] - box[3],
            "height": box[2] - box[0],
        }
        face = Face(
            event_id=event.id,
            image_id=image.id,
            bbox=bbox,
            embedding=emb.tolist(),
            cluster_id=-2,
        )
        face_objs.append(face)
        db.add(face)

    await db.commit()

    return UploadImageResponse(
        uuid=uid,
        blob_url=image.azure_blob_url,
        faces=len(face_objs),
        boxes=boxes,
        embeddings=[e.tolist() for e in embeddings],
    )


# --------------------------------------------------------------------
# DELETE IMAGE
# --------------------------------------------------------------------
async def delete_image(
    db: AsyncSession,
    container: ContainerClient,
    uuid: str,
) -> None:
    """
    Delete an image and all its face records from both Azure Blob Storage and the database.

    Args:
        db (AsyncSession): Async SQLAlchemy session.
        container (ContainerClient): Azure Blob Storage container client.
        uuid (str): UUID of the image to delete.

    Returns:
        None

    Raises:
        HTTPException 404: If the image with the given UUID is not found.
        HTTPException 500: If deletion from Azure Blob Storage or database fails.
    """
    # fetch image row
    stmt = select(Image).where(Image.uuid == uuid)
    result = await db.execute(stmt)
    image = result.scalar_one_or_none()
    if image is None:
        raise HTTPException(404, f"Image `{uuid}` not found")

    # delete blob
    # parse blob_name from URL
    prefix = container.url + "/"
    blob_name = image.azure_blob_url.removeprefix(prefix)
    try:
        container.delete_blob(blob_name)
    except Exception:
        logger.warning(f"Blob `{blob_name}` not found/deleted anyway")

    # delete DB row (faces cascade)
    await db.delete(image)
    await db.commit()
