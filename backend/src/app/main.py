# src/app/main.py
# ----------------
# This is the FastAPI application module. Place this file under `src/app/main.py`.
# To launch via Uvicorn, reference this module as `app.main:app` from your project root.

from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from loguru import logger

from app.clusters.router import router as clusters_router
from app.core.azure_blob import get_blob_service  # ensures Blob client is initialized
from app.core.config import get_settings
from app.db.base import Base, engine  # SQLAlchemy engine & metadata
from app.events.router import router as events_router
from app.images.router import router as images_router
from app.system.router import router as system_router

# from app.auth.router import router as auth_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan: startup and shutdown tasks.
    Startup: init Azure Blob client, create DB tables (if missing).
    Shutdown: dispose SQLAlchemy engine.
    """
    # Startup
    logger.info("Initializing Azure Blob Storage Client…")
    get_blob_service()
    logger.success("Azure Blob Storage Client sucessfully initialized")

    # Create DB tables if they don't exist
    logger.info("Syncing database tables…")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.success("Database tables synced successfully")

    yield

    # Shutdown
    logger.info("Shutting down database engine…")
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    lifespan=lifespan,
    openapi_prefix=settings.API_V1_STR,
)

# Include your routers under the configured path prefix
app.include_router(events_router)
app.include_router(images_router)
app.include_router(clusters_router)
app.include_router(system_router)
# app.include_router(auth_router)


# entrypoint
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",  # module path for this app
        host="0.0.0.0",
        port=8000,
        reload=True,  # restart on code changes
    )
