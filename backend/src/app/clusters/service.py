import json
from io import BytesIO
from typing import Any, Dict, List

import face_recognition
import numpy as np
from fastapi import HTTPException

# from sklearn.cluster import DBSCAN
from PIL import Image as PILImage
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..events.service import get_event
from .schemas import ClusterInfo, SimilarFaceOut


# --------------------------------------------------------------------
# GET CLUSTERS
# --------------------------------------------------------------------
async def get_cluster_summary(
    db: AsyncSession, event_code: str, sample_size: int
) -> List[ClusterInfo]:
    """
    Fetch summary information for each face cluster within a specific event.

    This returns, for each cluster:
      - cluster_id: integer label of the cluster
      - face_count: total number of faces in the cluster
      - samples: up to `sample_size` random face samples, each including face_id, image URL, and bounding box

    Args:
        db (AsyncSession): Async SQLAlchemy session for database access.
        event_code (str): Unique code identifying the event.
        sample_size (int): Maximum number of random face samples per cluster.

    Returns:
        List[ClusterInfo]: A list of cluster summaries, sorted by cluster_id.

    Raises:
        HTTPException 404: If the specified event does not exist.
    """
    # Ensure the event exists
    event = await get_event(db, event_code)

    # Raw SQL to aggregate face counts and sample random faces per cluster
    sql = text(
        """
    WITH summary AS (
      SELECT cluster_id, COUNT(*) AS face_count
      FROM faces
      WHERE event_id = :event_id
      GROUP BY cluster_id
    )
    SELECT
      s.cluster_id,
      s.face_count,
      subs.id            AS face_id,
      i.azure_blob_url   AS sample_blob_url,
      subs.bbox          AS sample_bbox
    FROM summary s
    CROSS JOIN LATERAL (
      SELECT id, bbox, image_id
      FROM faces
      WHERE event_id = :event_id
        AND cluster_id = s.cluster_id
      ORDER BY RANDOM()
      LIMIT :limit
    ) AS subs
    JOIN images i ON i.id = subs.image_id
    ORDER BY s.cluster_id;
    """
    )
    result = await db.execute(sql, {"event_id": event.id, "limit": sample_size})
    rows = result.mappings().all()

    # Build dictionary of cluster data
    clusters: Dict[int, Dict[str, Any]] = {}
    for r in rows:
        cid = r["cluster_id"]
        if cid not in clusters:
            clusters[cid] = {
                "cluster_id": cid,
                "face_count": r["face_count"],
                "samples": [],
            }
        # Parse bbox JSON if necessary
        bbox = r["sample_bbox"]
        if isinstance(bbox, str):
            bbox = json.loads(bbox)

        clusters[cid]["samples"].append(
            {
                "face_id": r["face_id"],
                "sample_blob_url": r["sample_blob_url"],
                "sample_bbox": bbox,
            }
        )

    # Return sorted list of ClusterInfo
    return [ClusterInfo(**clusters[cid]) for cid in sorted(clusters)]


# --------------------------------------------------------------------
# RECLUSTER CLUSTERS
# --------------------------------------------------------------------
# async def recluster_event_faces(
#     db: AsyncSession,
#     event_code: str,
#     eps: float = 0.5,
#     min_samples: int = 5,
# ) -> None:
#     """
#     Pull all face embeddings for an event, run DBSCAN clustering,
#     and persist the new cluster_id for each face.

#     Args:
#         db (AsyncSession): Async SQLAlchemy session.
#         event_code (str): Code of the event whose faces to cluster.
#         eps (float): DBSCAN `eps` parameter (distance threshold).
#         min_samples (int): DBSCAN `min_samples` parameter.

#     Raises:
#         HTTPException 404: If the event_code does not exist.
#     """
#     # 1) Resolve event → its numeric ID (or 404)
#     event = await get_event(db, event_code)

#     # 2) Fetch all (face_id, embedding) for that event
#     q = select(Face.id, Face.embedding).where(Face.event_id == event.id)
#     result = await db.execute(q)
#     rows: List[Tuple[int, Any]] = result.all()

#     if not rows:
#         return  # nothing to cluster

#     face_ids, raw_embs = zip(*rows)

#     # 3) Coerce embeddings to a NumPy array of shape (n_faces, 128)
#     #    Embedding might come back as a JSON string or a Python list
#     X = np.vstack(
#         [
#             np.array(json.loads(e), dtype=float)
#             if isinstance(e, str)
#             else np.array(e, dtype=float)
#             for e in raw_embs
#         ]
#     )

#     # 4) Run DBSCAN over the embeddings
#     clustering = DBSCAN(eps=eps, min_samples=min_samples, metric="cosine").fit(X)
#     # `.labels_` is a numpy array of int64; `.tolist()` makes them Python ints
#     labels: List[int] = clustering.labels_.tolist()

#     # 5) Persist each label back into the Face table
#     for face_id, label in zip(face_ids, labels):
#         stmt = update(Face).where(Face.id == face_id).values(cluster_id=label)
#         await db.execute(stmt)

#     # 6) Commit all the updates in one shot
#     await db.commit()


# --------------------------------------------------------------------
# SIMILARITY SEARCH
# --------------------------------------------------------------------
async def find_similar_faces(
    db: AsyncSession,
    event_code: str,
    raw_image_bytes: bytes,
    metric: str,
    top_k: int,
) -> List[SimilarFaceOut]:
    """
    Workflow:
      1. Load image bytes into a NumPy array via PIL.
      2. Detect exactly one face; error if none or multiple.
      3. Compute 128-D embedding for the detected face.
      4. Confirm the event exists.
      5. Issue a raw SQL query using pgvector operator (<=> for cosine, <-> for L2) to find the top-K nearest neighbors.
      6. Parse and return the results as SimilarFaceOut models.

    Args:
        db (AsyncSession): Async SQLAlchemy session for database access.
        event_code (str): Unique code identifying the event.
        raw_image_bytes (bytes): Raw binary of the uploaded image.
        metric (str): Similarity metric to use ('cosine' or 'l2').
        top_k (int): Number of nearest neighbors to retrieve.

    Returns:
        List[SimilarFaceOut]: List of matching faces with metadata and distance.

    Raises:
        HTTPException 400: If image loading fails, or zero/multiple faces detected.
        HTTPException 404: If the specified event does not exist.
    """
    # 1) Load image → NumPy
    try:
        pil = PILImage.open(BytesIO(raw_image_bytes)).convert("RGB")
        img_np = np.array(pil)
    except Exception:
        raise HTTPException(400, "Invalid image data")

    # 2) Detect exactly one face
    boxes = face_recognition.face_locations(img_np, model="hog")
    if len(boxes) != 1:
        msg = (
            "No face detected, please upload an image with exactly one face"
            if not boxes
            else "Multiple faces detected, please upload an image with exactly one face"
        )
        raise HTTPException(400, msg)

    # 3) Compute embedding
    emb = face_recognition.face_encodings(img_np, boxes)[0]

    # 4) Ensure event exists
    event = await get_event(db, event_code)

    # 5) Prepare vector literal for pgvector query
    vector_literal = "[" + ",".join(map(str, emb.tolist())) + "]"

    operator = "<=>" if metric == "cosine" else "<->"
    sql = text(f"""
    SELECT
      f.id AS face_id,
      img.uuid AS image_uuid,
      img.azure_blob_url,
      f.cluster_id,
      f.bbox,
      f.embedding,
      f.embedding {operator} :vector AS distance
    FROM faces f
    JOIN images img ON img.id = f.image_id
    WHERE f.event_id = :event_id
    ORDER BY distance ASC
    LIMIT :limit
    """)

    params = {"vector": vector_literal, "event_id": event.id, "limit": top_k}
    result = await db.execute(sql, params)
    rows = result.mappings().all()

    # 6) Parse and return SimilarFaceOut
    out: List[SimilarFaceOut] = []
    for r in rows:
        bbox = r["bbox"]
        if isinstance(bbox, str):
            bbox = json.loads(bbox)

        embedding = r["embedding"]
        if isinstance(embedding, str):
            embedding = json.loads(embedding)

        out.append(
            SimilarFaceOut(
                face_id=r["face_id"],
                image_uuid=r["image_uuid"],
                azure_blob_url=r["azure_blob_url"],
                cluster_id=r["cluster_id"],
                bbox=bbox,
                embedding=embedding,
                distance=r["distance"],
            )
        )
    return out
