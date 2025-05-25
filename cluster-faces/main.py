# src/main.py
"""Entry point for clustering face embeddings using Hydra with preprocessing."""

import ast
import asyncio
import os
from datetime import datetime, timezone
from typing import Any, List, Tuple

import hydra
import numpy as np
from dotenv import load_dotenv
from loguru import logger
from omegaconf import DictConfig, OmegaConf
from sklearn.preprocessing import normalize
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from tqdm.asyncio import tqdm

from src.clustering import (
    affinity_propagation_cluster,
    agglomerative_cluster,
    birch_cluster,
    chinese_whispers_cluster,
    dbscan_cluster,
    hdbscan_cluster,
    optics_cluster,
)
from src.processing import process_pca, process_umap

# Load environment variables
load_dotenv()

# Async DB session setup
POSTGRES_URI = (
    f"postgresql+asyncpg://{os.getenv('POSTGRES_USER')}:"
    f"{os.getenv('POSTGRES_PASSWORD')}@"
    f"{os.getenv('POSTGRES_SERVER')}/"
    f"{os.getenv('POSTGRES_DB')}"
)
engine = create_async_engine(POSTGRES_URI, echo=False)
AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)


async def get_running_events(session: AsyncSession) -> List[int]:
    """Fetch IDs of events that haven’t ended yet."""
    now = datetime.now(timezone.utc)
    query = text("SELECT id FROM events WHERE end_date_time >= :now")
    result = await session.execute(query, {"now": now})
    event_ids = [row[0] for row in result.fetchall()]
    return event_ids


async def get_embeddings(session: AsyncSession, event_id: int) -> List[Tuple[int, Any]]:
    """
    Fetch face embeddings for a given event.

    Args:
        session: Async DB session.
        event_id: Event ID.

    Returns:
        List of tuples (face_id, embedding).
    """
    query = text("SELECT id, embedding " "FROM faces " "WHERE event_id = :event_id")
    result = await session.execute(query, {"event_id": event_id})
    rows = result.fetchall()
    return rows


async def update_clusters(
    session: AsyncSession, face_ids: List[int], cluster_labels: np.ndarray
) -> None:
    """
    Update faces with new cluster IDs.

    Args:
        session: Async DB session.
        face_ids: List of face IDs.
        cluster_labels: Array of cluster labels.
    """
    for face_id, cluster_id in zip(face_ids, cluster_labels):
        await session.execute(
            text("UPDATE faces SET cluster_id = :cluster_id WHERE id = :face_id"),
            {"cluster_id": int(cluster_id), "face_id": face_id},
        )
    await session.commit()


async def run(cfg: DictConfig) -> None:
    """
    Main logic: retrieve events, preprocess embeddings, run clustering, and update DB.

    Args:
        cfg: Hydra configuration.
    """
    logger.info("Starting clustering...")

    async with AsyncSessionLocal() as session:
        event_ids = await get_running_events(session)
        logger.info(f"Found {len(event_ids)} running events")

        for event_id in tqdm(event_ids, desc="Processing events"):
            rows = await get_embeddings(session, event_id)
            face_ids = [r[0] for r in rows]
            count = len(face_ids)

            if count < 2:  # at least 2 faces are required for clustering
                logger.warning(f"Skipping event {event_id}: only {count} face(s)")
                continue
            else:
                logger.info(
                    f"Event {event_id} has {count} face(s), proceeding with clustering"
                )

            # Raw embeddings
            embeddings = np.array(
                [
                    ast.literal_eval(r[1]) if isinstance(r[1], str) else r[1]
                    for r in rows
                ],
                dtype=np.float32,
            )

            # Preprocessing
            if cfg.algo != "chinese_whispers":
                logger.info(
                    f"Preprocessing embeddings with method: '{cfg.processing_method}'"
                )
                if cfg.processing_method == "normalize":
                    embeddings = normalize(embeddings, axis=1)

                elif cfg.processing_method == "pca":
                    embeddings = process_pca(
                        embeddings,
                        n_components=cfg.pca.n_components,
                        whiten=cfg.pca.whiten,
                        random_state=cfg.pca.random_state,
                    )

                elif cfg.processing_method == "umap":
                    embeddings = process_umap(
                        embeddings,
                        n_components=cfg.umap.n_components,
                        n_neighbors=cfg.umap.n_neighbors,
                        min_dist=cfg.umap.min_dist,
                        metric=cfg.umap.metric,
                        random_state=cfg.umap.random_state,
                    )
                logger.info("Sucessfully preprocessed embeddings!")

            try:
                logger.info(
                    f"Performing '{cfg.algo}' clustering on event {event_id}..."
                )
                if cfg.algo == "dbscan":
                    labels = dbscan_cluster(
                        embeddings,
                        eps=cfg.dbscan.eps,
                        min_samples=cfg.dbscan.min_samples,
                        metric=cfg.dbscan.metric,
                        n_jobs=cfg.dbscan.n_jobs,
                    )
                elif cfg.algo == "hdbscan":
                    labels = hdbscan_cluster(
                        embeddings,
                        min_cluster_size=cfg.hdbscan.min_cluster_size,
                        cluster_selection_method=cfg.hdbscan.cluster_selection_method,
                        cluster_selection_epsilon=cfg.hdbscan.cluster_selection_epsilon,
                        alpha=cfg.hdbscan.alpha,
                        metric=cfg.hdbscan.metric,
                    )
                elif cfg.algo == "optics":
                    labels = optics_cluster(
                        embeddings,
                        min_samples=cfg.optics.min_samples,
                        xi=cfg.optics.xi,
                        min_cluster_size=cfg.optics.min_cluster_size,
                        metric=cfg.optics.metric,
                    )
                elif cfg.algo == "affinity_propagation":
                    labels = affinity_propagation_cluster(
                        embeddings,
                        damping=cfg.affinity_propagation.damping,
                        max_iter=cfg.affinity_propagation.max_iter,
                        convergence_iter=cfg.affinity_propagation.convergence_iter,
                    )
                elif cfg.algo == "chinese_whispers":
                    labels = chinese_whispers_cluster(
                        embeddings,
                        threshold=cfg.chinese_whispers.threshold,
                        weighting=cfg.chinese_whispers.weighting,
                    )
                elif cfg.algo == "agglomerative":
                    labels = agglomerative_cluster(
                        embeddings,
                        n_clusters=cfg.agglomerative.n_clusters,
                        distance_threshold=cfg.agglomerative.distance_threshold,
                        linkage=cfg.agglomerative.linkage,
                        metric=cfg.agglomerative.metric,
                    )
                elif cfg.algo == "birch":
                    labels = birch_cluster(
                        embeddings,
                        threshold=cfg.birch.threshold,
                        branching_factor=cfg.birch.branching_factor,
                        n_clusters=cfg.birch.n_clusters,
                    )
                else:
                    raise ValueError(f"Unknown algorithm: {cfg.algo}")
            except Exception as exc:
                logger.error(
                    f"Clustering failed for event {event_id} using '{cfg.algo}': {exc}"
                )
                continue
            n_clusters = len(set(labels.tolist()) - {-1})
            logger.info(
                f"Clustering completed for event {event_id}, found {len(set(labels))} clusters"
            )

            logger.info(f"Updating clusters in database for event {event_id}...")
            await update_clusters(session, face_ids, labels)
            logger.info(
                f"Updated {len(face_ids)} faces with {n_clusters} clusters for event {event_id}"
            )

    logger.info("Clustering run complete.")


@hydra.main(config_path="conf", config_name="config")
def main(cfg: DictConfig) -> None:
    """Hydra main entry point."""
    asyncio.run(run(cfg))


if __name__ == "__main__":
    main()
