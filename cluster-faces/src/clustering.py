# src/clustering.py
"""Clustering algorithms and preprocessing for face embeddings."""

from typing import Optional

import chinese_whispers
import hdbscan
import networkx as nx
import numpy as np
from scipy.spatial.distance import euclidean
from sklearn.cluster import (
    DBSCAN,
    OPTICS,
    AffinityPropagation,
    AgglomerativeClustering,
    Birch,
)


def dbscan_cluster(
    embeddings: np.ndarray,
    eps: float,
    min_samples: int,
    metric: str = "euclidean",
    n_jobs: int = -1,
) -> np.ndarray:
    """Apply DBSCAN clustering on normalized embeddings.

    Args:
        embeddings: Array of shape (n_samples, n_features).
        eps: Max distance for neighborhood.
        min_samples: Min samples to form a core point.
        metric: Distance metric ('euclidean', 'cosine', etc.).
        n_jobs: Parallel jobs (-1 uses all cores).

    Returns:
        Cluster labels array of shape (n_samples,).

    Raises:
        RuntimeError: If clustering fails.
    """
    try:
        model = DBSCAN(eps=eps, min_samples=min_samples, metric=metric, n_jobs=n_jobs)
        return model.fit_predict(embeddings)
    except Exception as e:
        raise RuntimeError(f"DBSCAN clustering failed: {e}")


def hdbscan_cluster(
    embeddings: np.ndarray,
    min_cluster_size: int,
    cluster_selection_method: str = "eom",
    cluster_selection_epsilon: float = 0.0,
    alpha: float = 1.0,
    metric: str = "euclidean",
) -> np.ndarray:
    """Apply HDBSCAN clustering on normalized embeddings.

    Args:
        embeddings: Array of shape (n_samples, n_features).
        min_cluster_size: Smallest cluster size.
        cluster_selection_method: 'eom' or 'leaf'.
        cluster_selection_epsilon: Extra tolerance for selection.
        alpha: Stability threshold.
        metric: Distance metric.

    Returns:
        Cluster labels array.

    Raises:
        RuntimeError: If clustering fails.
    """
    try:
        model = hdbscan.HDBSCAN(
            min_cluster_size=min_cluster_size,
            cluster_selection_method=cluster_selection_method,
            cluster_selection_epsilon=cluster_selection_epsilon,
            alpha=alpha,
            metric=metric,
        )
        return model.fit_predict(embeddings)
    except Exception as e:
        raise RuntimeError(f"HDBSCAN clustering failed: {e}")


def optics_cluster(
    embeddings: np.ndarray,
    min_samples: int = 5,
    xi: float = 0.05,
    min_cluster_size: int = 5,
    metric: str = "euclidean",
) -> np.ndarray:
    """Apply OPTICS clustering on normalized embeddings.

    Args:
        embeddings: Array of shape (n_samples, n_features).
        min_samples: Min samples for a core point.
        xi: Stability threshold.
        min_cluster_size: Smallest cluster size.
        metric: Distance metric.

    Returns:
        Cluster labels array.

    Raises:
        RuntimeError: If clustering fails.
    """
    try:
        model = OPTICS(
            min_samples=min_samples,
            xi=xi,
            min_cluster_size=min_cluster_size,
            metric=metric,
        )
        return model.fit_predict(embeddings)
    except Exception as e:
        raise RuntimeError(f"OPTICS clustering failed: {e}")


def affinity_propagation_cluster(
    embeddings: np.ndarray,
    damping: float = 0.5,
    max_iter: int = 200,
    convergence_iter: int = 15,
) -> np.ndarray:
    """Apply Affinity Propagation clustering on normalized embeddings.

    Args:
        embeddings: Array of shape (n_samples, n_features).
        damping: Damping factor (0.5–1.0).
        max_iter: Max number of iterations.
        convergence_iter: Iterations for convergence check.

    Returns:
        Cluster labels array.

    Raises:
        RuntimeError: If clustering fails.
    """
    try:
        model = AffinityPropagation(
            damping=damping, max_iter=max_iter, convergence_iter=convergence_iter
        )
        return model.fit_predict(embeddings)
    except Exception as e:
        raise RuntimeError(f"Affinity Propagation clustering failed: {e}")


def chinese_whispers_cluster(
    embeddings: np.ndarray, threshold: float = 0.6, weighting: str = "top"
) -> np.ndarray:
    """Apply Chinese Whispers clustering on embeddings.

    Args:
        embeddings: Array of shape (n_samples, n_features).
        threshold: Max distance to connect nodes.
        weighting: Weighting scheme ('top', 'all', etc.).

    Returns:
        Cluster labels array (noise if only one cluster).

    Raises:
        RuntimeError: If clustering fails.
    """
    try:
        n = len(embeddings)
        data = embeddings

        # Build graph
        G = nx.Graph()

        # Add nodes
        G.add_nodes_from(range(n))

        # Add edges based on distance threshold
        for i in range(n):
            for j in range(i + 1, n):
                dist = euclidean(data[i], data[j])
                if dist < threshold:
                    G.add_edge(i, j, weight=1.0 / (1.0 + dist))

        # Apply Chinese Whispers algorithm
        chinese_whispers.chinese_whispers(G, weighting=weighting)

        # Extract labels and preprocess them
        raw = np.array([G.nodes[i]["label"] for i in range(n)])
        unique = np.unique(raw)
        label_map = {lab: idx for idx, lab in enumerate(unique)}
        labels = np.array([label_map[lab] for lab in raw])
        if len(unique) == 1:
            return np.full(n, -1, dtype=int)
        return labels
    except Exception as e:
        raise RuntimeError(f"Chinese Whispers clustering failed: {e}")


def agglomerative_cluster(
    embeddings: np.ndarray,
    n_clusters: Optional[int] = None,
    distance_threshold: Optional[float] = None,
    linkage: str = "average",
    metric: str = "euclidean",
) -> np.ndarray:
    """Apply Agglomerative Clustering on normalized embeddings.

    Args:
        embeddings: Array of shape (n_samples, n_features).
        n_clusters: Number of clusters (None to use distance_threshold).
        distance_threshold: Threshold for merging.
        linkage: 'ward', 'complete', 'average', 'single'.
        metric: Distance metric.

    Returns:
        Cluster labels array.

    Raises:
        RuntimeError: If clustering fails.
    """
    try:
        model = AgglomerativeClustering(
            n_clusters=n_clusters,
            distance_threshold=distance_threshold,
            linkage=linkage,
            metric=metric,
        )
        return model.fit_predict(embeddings)
    except Exception as e:
        raise RuntimeError(f"Agglomerative clustering failed: {e}")


def birch_cluster(
    embeddings: np.ndarray,
    threshold: float = 0.5,
    branching_factor: int = 50,
    n_clusters: Optional[int] = None,
) -> np.ndarray:
    """Apply Birch clustering on normalized embeddings.

    Args:
        embeddings: Array of shape (n_samples, n_features).
        threshold: Radius for subcluster merging.
        branching_factor: Max subclusters per node.
        n_clusters: Number of clusters (None = auto).

    Returns:
        Cluster labels array.

    Raises:
        RuntimeError: If clustering fails.
    """
    try:
        model = Birch(
            threshold=threshold,
            branching_factor=branching_factor,
            n_clusters=n_clusters,
        )
        return model.fit_predict(embeddings)
    except Exception as e:
        raise RuntimeError(f"Birch clustering failed: {e}")
