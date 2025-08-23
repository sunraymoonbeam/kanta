# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Setup
```bash
# Install dependencies using UV package manager
uv sync

# Install dev dependencies
uv sync --dev
```

### Running Tests
```bash
# Run all tests
pytest

# Run tests with coverage
pytest --cov=src

# Run specific test file
pytest tests/test_face_clustering.py

# Run specific test function
pytest tests/test_face_clustering.py::test_dbscan_clustering
```

### Running the Application
```bash
# Run locally with Hydra configuration
python main.py

# Override configuration parameters
python main.py algo=hdbscan processing_method=umap

# Run with specific algorithm
python main.py algo=dbscan dbscan.eps=0.5 dbscan.min_samples=3
```

### Docker Operations
```bash
# Build Docker image for AWS Lambda deployment
docker build -t cluster-faces .

# Run container locally
docker run -e POSTGRES_USER=<user> -e POSTGRES_PASSWORD=<pass> -e POSTGRES_SERVER=<host> -e POSTGRES_DB=<db> cluster-faces
```

## Architecture

### Core Components

**main.py**: Entry point that orchestrates the clustering pipeline
- Fetches running events from PostgreSQL database
- Retrieves face embeddings for each event  
- Applies preprocessing (normalization, PCA, or UMAP)
- Executes selected clustering algorithm
- Updates cluster assignments back to database
- Supports both local execution via Hydra and AWS Lambda deployment

**src/clustering.py**: Implements 7 clustering algorithms
- DBSCAN: Density-based clustering for arbitrary shapes
- HDBSCAN: Hierarchical density-based clustering  
- Chinese Whispers: Graph-based clustering
- OPTICS: Ordering points for cluster identification
- Affinity Propagation: Message-passing clustering
- Agglomerative: Hierarchical clustering with linkage criteria
- BIRCH: Incremental clustering for large datasets

**src/processing.py**: Dimensionality reduction preprocessing
- PCA: Linear dimensionality reduction
- UMAP: Non-linear manifold learning

### Configuration System

Uses Hydra for configuration management (conf/config.yaml):
- Algorithm selection and hyperparameters
- Preprocessing method selection (none, normalize, PCA, UMAP)
- Each algorithm has tuned default parameters
- Runtime overrides supported via CLI

### Database Integration

- Async PostgreSQL connection using SQLAlchemy + asyncpg
- Face embeddings stored as arrays in database
- Cluster assignments updated with cluster_id field
- Only processes events that haven't ended yet
- Skips events without unclustered faces (cluster_id = -2)

### Testing Strategy

Tests validate clustering quality using real face embeddings:
- Each test checks cluster purity (one subject per cluster)
- Validates both individual algorithms and full pipeline
- Uses parquet file with labeled test data
- Asserts minimum purity score of 0.8

### Deployment

Supports dual deployment modes:
- Local execution with Hydra CLI
- AWS Lambda handler with environment-based configuration
- Docker container uses UV for efficient dependency management
- Multi-stage build optimizes image size