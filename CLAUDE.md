# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kanta (meaning "lens" in Malay) is a disposable film camera app that allows event participants to capture and share photos with AI-powered face clustering. The application consists of:

- **Frontend**: Next.js 15 web application with camera interface and event management
- **Backend**: FastAPI microservice for image processing, face encoding, and storage
- **Cluster-Faces**: Python service for face clustering using machine learning algorithms
- **Data**: Seeding script for populating test data using the Yale Face Database

## Common Development Commands

### Starting the Application
```bash
# Start all services with Docker Compose
docker compose up

# Start in detached mode
docker compose up -d

# View logs for specific service
docker compose logs backend
docker compose logs frontend
docker compose logs cluster-faces-scheduler

# Stop all services
docker compose down
```

### Backend Development
```bash
# Run backend server locally (from backend/ directory)
uvicorn src.app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests with coverage
uv run pytest --cov=src/app tests/

# Database migrations
alembic upgrade head  # Apply migrations
alembic revision -m "description" --autogenerate  # Create new migration

# Install dependencies
uv sync
```

### Frontend Development
```bash
# Start development server (from frontend/ directory)
npm run dev

# Build production
npm run build

# Run linting
npm run lint

# Install dependencies
npm install
```

### Face Clustering Service
```bash
# Run clustering locally (from cluster-faces/ directory)
python main.py

# Run with specific algorithm
python main.py algo=hdbscan processing_method=umap

# Run tests
pytest --cov=src
```

### Data Seeding
```bash
# Seed test data (from data/ directory, ensure services are running)
uv run main.py --batch-size 5 --delay 0.5

# Custom event code
uv run main.py --event-code my-test-event
```

## Architecture

### System Components

1. **PostgreSQL Database** (pgvector/pgvector:0.8.0-pg15)
   - Stores events, images metadata, and face embeddings
   - Uses pgvector extension for similarity search
   - Port: 5432

2. **Azure Blob Storage** (Azurite emulator for local dev)
   - Stores uploaded images
   - Port: 10000 (Blob service)

3. **Backend API** (FastAPI)
   - REST API at http://localhost:8000/api/v1
   - Face detection using dlib/face-recognition
   - Generates 128-dimensional face embeddings
   - Async architecture with SQLAlchemy

4. **Frontend Application** (Next.js 15)
   - Web interface at http://localhost:3000
   - Camera capture functionality
   - Event management and QR code generation
   - Gallery view with face clustering

5. **Face Clustering Service**
   - Runs every 60 seconds in Docker
   - Processes unclustered faces (cluster_id = -2)
   - Supports 7 clustering algorithms (DBSCAN, HDBSCAN, Chinese Whispers, etc.)

### Key API Endpoints

- `POST /events` - Create new event
- `GET /events/{code}` - Get event details
- `POST /pics/{event_code}` - Upload image to event
- `GET /pics/{event_code}` - Get all images for event
- `GET /clusters/{event_code}` - Get face clusters for event

### Database Schema

Key tables:
- `events` - Event metadata with code, name, description
- `images` - Uploaded images with Azure blob URLs
- `faces` - Face embeddings (128-dim vectors) with cluster assignments

### Environment Variables

Backend requires:
- `POSTGRES_SERVER`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `AZURE_STORAGE_CONNECTION_STRING`

Frontend requires:
- `NEXT_PUBLIC_API_URL` (defaults to http://localhost:8000/api/v1)

## Testing Strategy

- Backend: pytest with async support, fixtures in conftest.py
- Frontend: Component testing with React Testing Library
- Cluster-Faces: Tests validate clustering purity (>0.8 score)
- Integration: Docker Compose health checks ensure service connectivity

## API Documentation

When backend is running:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI Schema: http://localhost:8000/openapi.json

## Docker Development

The application uses Docker Compose with:
- Hot reload for backend (via develop.watch)
- Volume mounts for frontend development
- Health checks for service dependencies
- Automatic pgvector extension installation
- Simulated AWS Lambda for clustering service