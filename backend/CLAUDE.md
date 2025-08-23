# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kanta is a FastAPI microservice for face-encoding that:
- Uploads images and detects faces using face-recognition/dlib
- Generates face embeddings and stores them in PostgreSQL with pgvector
- Stores images in Azure Blob Storage
- Provides clustering and similarity search capabilities

## Development Commands

### Running the Server
```bash
# Using uvicorn directly
uvicorn src.app.main:app --reload --host 0.0.0.0 --port 8000

# Using fastapi-cli (if installed)
fastapi dev src/app/main.py --host 0.0.0.0 --port 8021
```

### Testing
```bash
# Run all tests with coverage
uv run pytest --cov=src/app tests/

# Run specific test file
uv run pytest tests/events/test_service.py

# Run specific test
uv run pytest tests/events/test_service.py::test_get_events
```

### Database Migrations (Alembic)
```bash
# Check current migration status
alembic current

# Create new migration
alembic revision -m "description of changes" --autogenerate

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

### Dependency Management
```bash
# Install dependencies using uv (recommended)
uv sync

# Or using pip with virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Architecture

The project follows a **Module/Functionality (Package Layout)** structure where each domain is self-contained:

### Domain Modules
- **events/** - Event management (CRUD operations for events)
- **images/** - Image upload, face detection, and embedding storage
- **clusters/** - Face clustering and similarity search functionality

Each module contains:
- `router.py` - FastAPI routes and dependency injection
- `service.py` - Business logic and orchestration
- `schemas.py` - Pydantic models for request/response validation
- `models.py` - SQLAlchemy ORM models (if applicable)
- `exceptions.py` - Custom exceptions (if applicable)

### Core Components
- **core/config.py** - Pydantic settings management, loads from `.env`
- **core/azure_blob.py** - Azure Blob Storage client singleton
- **db/base.py** - SQLAlchemy Base and engine configuration
- **main.py** - FastAPI app initialization with lifespan management

### Key Patterns
1. **Async/Await Throughout** - Uses AsyncSession for database operations
2. **Dependency Injection** - Database sessions and blob storage clients injected via FastAPI dependencies
3. **Service Layer Pattern** - Business logic isolated in service modules, keeping routers thin
4. **Environment-based Config** - All configuration via `.env` file and Pydantic Settings

## Database

- PostgreSQL with pgvector extension for storing face embeddings
- Async SQLAlchemy with asyncpg driver
- Alembic for schema migrations
- Tables: events, images, faces (with vector column for embeddings)

## External Services

- **Azure Blob Storage** - Image storage via connection string
- **Face Recognition** - Uses dlib/face_recognition for face detection and encoding

## API Documentation

When server is running:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI Schema: http://localhost:8000/openapi.json

## Environment Variables

Required in `.env`:
```
POSTGRES_SERVER=
POSTGRES_PORT=5432
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
AZURE_STORAGE_CONNECTION_STRING=
```

## Testing Approach

- Tests mirror the app structure in `tests/` directory
- Use pytest with async support (pytest-asyncio)
- Fixtures defined in `conftest.py` files for each module
- Coverage reporting with pytest-cov