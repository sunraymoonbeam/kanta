import json
from typing import Any, List, Tuple

import numpy as np

# from sklearn.cluster import DBSCAN
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..events.service import get_event
from ..images.models import Face


# --------------------------------------------------------------------
# RECLUSTER CLUSTERS
# --------------------------------------------------------------------
async def recluster_event_faces(
    db: AsyncSession,
    event_code: str,
    eps: float = 0.5,
    min_samples: int = 5,
) -> None:
    """
    Pull all face embeddings for an event, run DBSCAN clustering,
    and persist the new cluster_id for each face.

    Args:
        db (AsyncSession): Async SQLAlchemy session.
        event_code (str): Code of the event whose faces to cluster.
        eps (float): DBSCAN `eps` parameter (distance threshold).
        min_samples (int): DBSCAN `min_samples` parameter.

    Raises:
        HTTPException 404: If the event_code does not exist.
    """
    # 1) Resolve event → its numeric ID (or 404)
    event = await get_event(db, event_code)

    # 2) Fetch all (face_id, embedding) for that event
    q = select(Face.id, Face.embedding).where(Face.event_id == event.id)
    result = await db.execute(q)
    rows: List[Tuple[int, Any]] = result.all()

    if not rows:
        return  # nothing to cluster

    face_ids, raw_embs = zip(*rows)

    # 3) Coerce embeddings to a NumPy array of shape (n_faces, 128)
    #    Embedding might come back as a JSON string or a Python list
    X = np.vstack(
        [
            np.array(json.loads(e), dtype=float)
            if isinstance(e, str)
            else np.array(e, dtype=float)
            for e in raw_embs
        ]
    )

    # 4) Run DBSCAN over the embeddings
    clustering = DBSCAN(eps=eps, min_samples=min_samples, metric="cosine").fit(X)
    # `.labels_` is a numpy array of int64; `.tolist()` makes them Python ints
    labels: List[int] = clustering.labels_.tolist()

    # 5) Persist each label back into the Face table
    for face_id, label in zip(face_ids, labels):
        stmt = update(Face).where(Face.id == face_id).values(cluster_id=label)
        await db.execute(stmt)

    # 6) Commit all the updates in one shot
    await db.commit()
