# src/processing.py
"""Preprocessing utilities for face embeddings."""

import logging

import numpy as np
import umap.umap_ as umap_module
from sklearn.decomposition import PCA

logger = logging.getLogger(__name__)


def process_pca(
    embeddings: np.ndarray,
    n_components: int,
    whiten: bool,
    random_state: int,
) -> np.ndarray:
    """
    Reduce embeddings via PCA.

    Args:
        embeddings: Array of shape (n_samples, n_features).
        n_components: Target dimensionality.
        whiten: Whether to whiten components.
        random_state: Seed for reproducibility.

    Returns:
        Reduced embeddings or original on failure.
    """
    try:
        pca = PCA(
            n_components=n_components,
            whiten=whiten,
            random_state=random_state,
        )
        return pca.fit_transform(embeddings)
    except Exception as e:
        logger.warning(f"PCA failed ({e}), returning original embeddings.")
        return embeddings


def process_umap(
    embeddings: np.ndarray,
    n_components: int,
    n_neighbors: int,
    min_dist: float,
    metric: str,
    random_state: int,
) -> np.ndarray:
    """
    Reduce embeddings via UMAP.

    Args:
        embeddings: Array of shape (n_samples, n_features).
        n_components: Target dimensionality (typically >2 for clustering).
        n_neighbors: UMAP n_neighbors.
        min_dist: UMAP min_dist.
        metric: Distance metric.
        random_state: Seed for reproducibility.

    Returns:
        Reduced embeddings or original on failure.
    """
    try:
        reducer = umap_module.UMAP(
            n_components=n_components,
            n_neighbors=n_neighbors,
            min_dist=min_dist,
            metric=metric,
            random_state=random_state,
        )
        return reducer.fit_transform(embeddings)
    except Exception as e:
        logger.warning(f"UMAP failed ({e}), returning original embeddings.")
        return embeddings
