from typing import List, Optional, Union

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.base import get_db
from .schemas import ClusterInfo, SimilarFaceOut
from .service import find_similar_faces, get_cluster_summary

router = APIRouter(tags=["clusters"])


# --------------------------------------------------------------------
# GET CLUSTERS
# --------------------------------------------------------------------
@router.get(
    "/clusters",
    response_model=List[ClusterInfo],
    responses={307: {"description": "Redirect to filtered /pics"}},
    summary="Cluster summary or redirect to filtered /pics",
)
async def read_clusters(
    event_code: str = Query(
        ..., regex=r"^[a-zA-Z0-9_]+$", description="Event code to filter clusters"
    ),
    cluster_ids: Optional[List[int]] = Query(
        None, alias="cluster_ids", description="List of cluster IDs to filter images"
    ),
    sample_size: int = Query(
        5, ge=1, le=20, description="Max number of face samples to include per cluster"
    ),
    db: AsyncSession = Depends(get_db),
) -> Union[List[ClusterInfo], RedirectResponse]:
    """
    - If `cluster_ids` is provided, redirect (307) to `/pics?cluster_list_id=...`.
    - Otherwise, return summary for each cluster including face count and random samples.

    Args:
        event_code (str): Unique code of the event whose clusters are requested.
        cluster_ids (Optional[List[int]]): If set, redirect to `/pics` filtered by these clusters.
        sample_size (int): Number of sample faces to include per cluster summary.
        db (AsyncSession): Async SQLAlchemy session for database access.

    Returns:
        Union[List[ClusterInfo], RedirectResponse]:
            - List[ClusterInfo] when retrieving cluster summaries.
            - RedirectResponse to the `/pics` endpoint filtered by cluster_list_id when `cluster_ids` is provided.
    """
    if cluster_ids:
        qs = "&".join(f"cluster_list_id={c}" for c in cluster_ids)
        return RedirectResponse(
            url=f"/pics?{qs}", status_code=status.HTTP_307_TEMPORARY_REDIRECT
        )

    return await get_cluster_summary(db, event_code, sample_size)


# --------------------------------------------------------------------
# SIMILARITY SEARCH
# --------------------------------------------------------------------
@router.post(
    "/find-similar",
    response_model=List[SimilarFaceOut],
    summary="Find the top-K most similar faces to the one you upload",
)
async def find_similar(
    event_code: str = Query(
        ...,
        regex=r"^[a-zA-Z0-9_]+$",
        description="Event code to filter images",
    ),
    image: UploadFile = File(..., description="Face image containing exactly one face"),
    metric: str = Query(
        "cosine", regex="^(cosine|l2)$", description="Distance metric: 'cosine' or 'l2'"
    ),
    top_k: int = Query(
        10, ge=1, le=100, description="Number of similar faces to return"
    ),
    db: AsyncSession = Depends(get_db),
) -> List[SimilarFaceOut]:
    """
    Detect exactly one face in the uploaded image, compute its embedding,
    and return the top-K nearest neighbor faces from the database.

    Args:
        event_code (str): Event code to scope the similarity search.
        image (UploadFile): Binary file upload containing exactly one face.
        metric (str): Distance metric to use ('cosine' or 'l2').
        top_k (int): Maximum number of results to return.
        db (AsyncSession): Async SQLAlchemy session for database access.

    Returns:
        List[SimilarFaceOut]: A list of matching faces, each with metadata and distance.

    Raises:
        HTTPException 400: If the file is invalid, no face or multiple faces detected.
    """
    raw = await image.read()
    return await find_similar_faces(db, event_code, raw, metric, top_k)
