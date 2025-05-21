from datetime import datetime
from typing import List, Optional

from azure.storage.blob import ContainerClient
from fastapi import (
    APIRouter,
    Depends,
    File,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.azure_blob import get_event_container
from ..db.base import get_db
from .schemas import (
    ImageDetailResponse,
    ImageListItem,
    UploadImageResponse,
)
from .service import (
    delete_image,
    get_image_detail,
    get_images,
    upload_image,
)

router = APIRouter(prefix="/pics", tags=["images"])


# --------------------------------------------------------------------
# GET IMAGE
# --------------------------------------------------------------------
@router.get(
    "",
    response_model=List[ImageListItem],
    summary="List stored images with filters & pagination",
)
async def get(
    event_code: str = Query(
        ...,
        pattern=r"^[a-zA-Z0-9_]+$",
        description="Event code to filter images",
    ),
    limit: int = Query(
        50, ge=1, le=200, description="Maximum number of images to return"
    ),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    date_from: Optional[datetime] = Query(
        None, description="Include images created on or after this timestamp"
    ),
    date_to: Optional[datetime] = Query(
        None, description="Include images created on or before this timestamp"
    ),
    min_faces: Optional[int] = Query(
        None, ge=0, description="Include images with at least this many faces"
    ),
    max_faces: Optional[int] = Query(
        None, ge=0, description="Include images with at most this many faces"
    ),
    cluster_list_id: Optional[List[int]] = Query(
        None, description="Include images having faces in these cluster IDs"
    ),
    db: AsyncSession = Depends(get_db),
) -> List[ImageListItem]:
    """
    Retrieve a paginated list of images, optionally filtered by multiple criteria.

    Args:
        event_code (str): Event code to filter images.
        limit (int): Maximum number of images to return (1-200).
        offset (int): Pagination offset (>=0).
        date_from (Optional[datetime]): Filter start timestamp (inclusive).
        date_to (Optional[datetime]): Filter end timestamp (inclusive).
        min_faces (Optional[int]): Minimum number of faces per image.
        max_faces (Optional[int]): Maximum number of faces per image.
        cluster_list_id (Optional[List[int]]): List of cluster IDs to filter by.
        db (AsyncSession): SQLAlchemy async database session.

    Returns:
        List[ImageListItem]: A list of summary metadata for each image.

    Raises:
        HTTPException: If any of the query parameters are invalid.
    """
    return await get_images(
        db,
        event_code=event_code,
        limit=limit,
        offset=offset,
        date_from=date_from,
        date_to=date_to,
        min_faces=min_faces,
        max_faces=max_faces,
        cluster_list_id=cluster_list_id,
    )


# --------------------------------------------------------------------
# GET IMAGE DETAILED
# --------------------------------------------------------------------
@router.get(
    "/{image_uuid}",
    response_model=ImageDetailResponse,
    summary="Get an image’s metadata plus its faces",
)
async def get_one(
    image_uuid: str,
    db: AsyncSession = Depends(get_db),
) -> ImageDetailResponse:
    """
    Fetch detailed metadata for a single image, including all detected faces.

    Args:
        uuid (str): UUID of the image to retrieve.
        db (AsyncSession): SQLAlchemy async database session.

    Returns:
        ImageDetailResponse: Contains image metadata and a list of face summaries.

    Raises:
        HTTPException: If no image with the given UUID exists.
    """
    return await get_image_detail(db, image_uuid)


# --------------------------------------------------------------------
# CREATE IMAGES
# --------------------------------------------------------------------
@router.post(
    "",
    response_model=UploadImageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload an image, detect faces, store in Azure + DB",
)
async def upload(
    event_code: str = Query(
        ...,
        pattern=r"^[a-zA-Z0-9_]+$",
        description="Event code to associate with this image",
    ),
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    container: ContainerClient = Depends(get_event_container),
) -> UploadImageResponse:
    """
    Upload an image for a given event, run face detection, and persist data.

    Args:
        event_code (str): Unique event code to associate with the image.
        image (UploadFile): Binary image file uploaded by the client.
        db (AsyncSession): SQLAlchemy async database session.
        container (ContainerClient): Azure Blob Storage container for the event.

    Returns:
        UploadImageResponse: Contains UUID, URL, face count, bounding boxes, and embeddings.

    Raises:
        HTTPException: If the file is not a valid image, face detection fails, or storage/DB operations fail.
    """
    return await upload_image(db, container, event_code, image)


# --------------------------------------------------------------------
# DELETE IMAGE
# --------------------------------------------------------------------
@router.delete(
    "/{image_uuid}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an image and its faces (DB + blob)",
)
async def delete(
    image_uuid: str,
    db: AsyncSession = Depends(get_db),
    container: ContainerClient = Depends(get_event_container),
) -> None:
    """
    Delete a stored image and all its associated face records.

    Args:
        uuid (str): UUID of the image to delete.
        db (AsyncSession): SQLAlchemy async database session.
        container (ContainerClient): Azure Blob Storage container for the event.

    Returns:
        None

    Raises:
        HTTPException: If the image does not exist or deletion fails.
    """
    await delete_image(db, container, image_uuid)
