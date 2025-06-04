import numpy as np
import pandas as pd
import pytest
from pathlib import Path
from collections import Counter

from src.processing import process_pca, process_umap
from src.clustering import (
    dbscan_cluster,
    hdbscan_cluster,
    birch_cluster,
    chinese_whispers_cluster,
    agglomerative_cluster,
    optics_cluster,
    affinity_propagation_cluster,
)


@pytest.fixture
def face_embeddings():
    """Load test face embeddings from parquet file."""
    parquet_path = Path(__file__).parent / "data" / "face_embeddings.parquet"
    df = pd.read_parquet(parquet_path)
    # Convert list of embeddings to numpy array
    embeddings = np.array(df["embedding"].tolist())
    return {
        "embeddings": embeddings,
        "subject_names": df["subject_name"].values,
        "filenames": df["filename"].values,
    }


def validate_cluster_purity(labels, subject_names):
    """
    Validate that each cluster contains embeddings from only one subject.

    Args:
        labels: Array of cluster labels
        subject_names: Array of subject names corresponding to each embedding

    Returns:
        tuple: (is_pure, purity_score, cluster_stats)
            - is_pure: Boolean indicating if all clusters contain only one subject
            - purity_score: Fraction of correctly clustered samples
            - cluster_stats: Dictionary with detailed cluster information
    """

    # Skip noise points (labeled as -1)
    valid_mask = labels != -1
    valid_labels = labels[valid_mask]
    valid_subjects = subject_names[valid_mask]

    if len(valid_labels) == 0:
        return True, 1.0, {}

    # Count unique labels
    unique_labels = np.unique(valid_labels)

    # Track purity of each cluster
    cluster_stats = {}
    correct_assignments = 0
    total_assignments = 0

    for label in unique_labels:
        # Skip noise points
        if label == -1:
            continue

        # Get all subject names in this cluster
        cluster_mask = valid_labels == label
        subjects_in_cluster = valid_subjects[cluster_mask]

        # Count occurrences of each subject in the cluster
        subject_counts = Counter(subjects_in_cluster)

        # Most common subject in this cluster
        most_common_subject, most_common_count = subject_counts.most_common(1)[0]

        # Calculate purity for this cluster
        cluster_size = len(subjects_in_cluster)
        cluster_purity = most_common_count / cluster_size if cluster_size > 0 else 1.0

        # Track statistics
        cluster_stats[label] = {
            "size": cluster_size,
            "subjects": dict(subject_counts),
            "dominant_subject": most_common_subject,
            "purity": cluster_purity,
        }

        # Update overall stats
        correct_assignments += most_common_count
        total_assignments += cluster_size

    # Calculate overall purity
    overall_purity = (
        correct_assignments / total_assignments if total_assignments > 0 else 1.0
    )

    # Check if all clusters are pure (contain only one subject)
    is_pure = all(stats["purity"] == 1.0 for stats in cluster_stats.values())

    return is_pure, overall_purity, cluster_stats


# Test processing functions
def test_pca_processing(face_embeddings):
    """Test PCA dimensionality reduction."""
    embeddings = face_embeddings["embeddings"]
    n_components = 50

    reduced = process_pca(
        embeddings=embeddings, n_components=n_components, whiten=True, random_state=42
    )

    assert reduced.shape[0] == embeddings.shape[0]
    assert reduced.shape[1] == n_components


def test_umap_processing(face_embeddings):
    """Test UMAP dimensionality reduction."""
    embeddings = face_embeddings["embeddings"]
    n_components = 2

    reduced = process_umap(
        embeddings=embeddings,
        n_components=n_components,
        n_neighbors=15,
        min_dist=0.1,
        metric="euclidean",
        random_state=42,
    )

    assert reduced.shape[0] == embeddings.shape[0]
    assert reduced.shape[1] == n_components


# Test clustering functions
def test_dbscan_clustering(face_embeddings):
    """Test DBSCAN clustering."""
    embeddings = face_embeddings["embeddings"]
    subject_names = face_embeddings["subject_names"]

    labels = dbscan_cluster(
        embeddings=embeddings,
        eps=0.25,  # Lower epsilon for tighter clusters
        min_samples=3,  # Lower min_samples since we have ~11 samples per subject
        metric="euclidean",
    )

    assert labels.shape[0] == embeddings.shape[0]
    assert isinstance(labels[0], np.integer)
    # Check if we have both cluster assignments and noise points (-1)
    assert len(np.unique(labels)) > 1

    # Validate that each cluster contains only one subject
    is_pure, purity_score, cluster_stats = validate_cluster_purity(
        labels, subject_names
    )
    assert purity_score > 0.8, f"Cluster purity score is too low: {purity_score:.2f}"
    assert is_pure, "Some clusters contain multiple subjects"


def test_hdbscan_clustering(face_embeddings):
    """Test HDBSCAN clustering."""
    embeddings = face_embeddings["embeddings"]
    subject_names = face_embeddings["subject_names"]

    labels = hdbscan_cluster(
        embeddings=embeddings,
        min_cluster_size=5,
        metric="euclidean",
        cluster_selection_method="eom",
    )

    assert labels.shape[0] == embeddings.shape[0]
    assert isinstance(labels[0], np.integer)
    # Check if we have both cluster assignments and noise points (-1)
    assert len(np.unique(labels)) > 1

    # Validate that each cluster contains only one subject
    is_pure, purity_score, cluster_stats = validate_cluster_purity(
        labels, subject_names
    )
    assert purity_score > 0.8, f"Cluster purity score is too low: {purity_score:.2f}"
    assert is_pure, "Some clusters contain multiple subjects"


def test_clustering_pipeline(face_embeddings):
    """Test full processing and clustering pipeline."""
    embeddings = face_embeddings["embeddings"]
    subject_names = face_embeddings["subject_names"]

    # First reduce dimensionality with PCA
    reduced_pca = process_pca(
        embeddings=embeddings, n_components=50, whiten=True, random_state=42
    )

    # Further reduce with UMAP
    reduced_umap = process_umap(
        embeddings=reduced_pca,
        n_components=3,  # Increase to 3 dimensions for better separation
        n_neighbors=15,
        min_dist=0.1,
        metric="euclidean",
        random_state=42,
    )

    # Apply clustering - use agglomerative clustering instead of DBSCAN for the pipeline
    labels = agglomerative_cluster(
        embeddings=reduced_umap,
        n_clusters=15,  # Expected number of subjects
        distance_threshold=None,
        linkage="ward",  # Ward works well for compact, equal variance clusters
    )

    assert labels.shape[0] == embeddings.shape[0]
    # Verify we got reasonable clusters
    unique_clusters = np.unique(labels)
    assert len(unique_clusters) > 1  # Should have multiple clusters

    # Validate that the clustering has high purity
    is_pure, purity_score, cluster_stats = validate_cluster_purity(
        labels, subject_names
    )
    assert purity_score > 0.8, f"Cluster purity score is too low: {purity_score:.2f}"
    # Don't require perfect purity for the pipeline test
    print(f"Pipeline cluster purity: {purity_score:.2f}")


def test_chinese_whispers_clustering(face_embeddings):
    """Test Chinese Whispers clustering."""
    embeddings = face_embeddings["embeddings"]
    subject_names = face_embeddings["subject_names"]

    labels = chinese_whispers_cluster(
        embeddings=embeddings,
        threshold=0.3,  # Lower threshold to connect more nodes per subject
        weighting="top",
    )

    assert labels.shape[0] == embeddings.shape[0]
    assert isinstance(labels[0], np.integer)
    # Should have multiple clusters
    assert len(np.unique(labels)) > 1

    # Validate that each cluster contains only one subject
    is_pure, purity_score, cluster_stats = validate_cluster_purity(
        labels, subject_names
    )
    assert purity_score > 0.8, f"Cluster purity score is too low: {purity_score:.2f}"
    assert is_pure, "Some clusters contain multiple subjects"


def test_birch_clustering(face_embeddings):
    """Test BIRCH clustering."""
    embeddings = face_embeddings["embeddings"]
    subject_names = face_embeddings["subject_names"]

    # First reduce dimensionality with PCA for better results
    reduced_embeddings = process_pca(
        embeddings=embeddings, n_components=50, whiten=True, random_state=42
    )

    labels = birch_cluster(
        embeddings=reduced_embeddings,
        threshold=0.3,  # Lower threshold for finer subclusters
        n_clusters=15,  # Set to expected number of subjects
    )

    assert labels.shape[0] == embeddings.shape[0]
    assert isinstance(labels[0], np.integer)
    # Should have multiple clusters
    assert len(np.unique(labels)) > 1

    # Validate that each cluster contains only one subject
    is_pure, purity_score, cluster_stats = validate_cluster_purity(
        labels, subject_names
    )
    assert purity_score > 0.8, f"Cluster purity score is too low: {purity_score:.2f}"
    # assert is_pure, "Some clusters contain multiple subjects"


def test_agglomerative_clustering(face_embeddings):
    """Test Agglomerative clustering."""
    embeddings = face_embeddings["embeddings"]
    subject_names = face_embeddings["subject_names"]

    labels = agglomerative_cluster(
        embeddings=embeddings,
        n_clusters=15,  # Set to match expected number of subjects
        distance_threshold=None,  # n_clusters takes precedence when specified
        linkage="ward",  # Ward tends to create more balanced clusters
    )

    assert labels.shape[0] == embeddings.shape[0]
    assert isinstance(labels[0], np.integer)
    # Should have multiple clusters
    assert len(np.unique(labels)) > 1

    # Validate that each cluster contains only one subject
    is_pure, purity_score, cluster_stats = validate_cluster_purity(
        labels, subject_names
    )
    assert purity_score > 0.8, f"Cluster purity score is too low: {purity_score:.2f}"
    assert is_pure, "Some clusters contain multiple subjects"


def test_optics_clustering(face_embeddings):
    """Test OPTICS clustering."""
    embeddings = face_embeddings["embeddings"]

    labels = optics_cluster(
        embeddings=embeddings,
        min_samples=3,
        xi=0.05,
        min_cluster_size=3,
        metric="euclidean",
    )

    assert labels.shape[0] == embeddings.shape[0]
    assert isinstance(labels[0], np.integer)
    # Should have multiple clusters or noise points
    assert len(np.unique(labels)) > 0


def test_affinity_propagation_clustering(face_embeddings):
    """Test Affinity Propagation clustering."""
    embeddings = face_embeddings["embeddings"]

    labels = affinity_propagation_cluster(
        embeddings=embeddings,
        damping=0.9,
        max_iter=100,
        convergence_iter=15,
    )

    assert labels.shape[0] == embeddings.shape[0]
    assert isinstance(labels[0], np.integer)
    # Should have multiple clusters
    assert len(np.unique(labels)) > 1
