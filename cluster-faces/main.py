"""
This script performs clustering of face embeddings for events in a PostgreSQL database.
It connects to the database, retrieves face embeddings for each event, normalizes them,
and applies DBSCAN clustering. The resulting cluster labels are then updated in the database.
"""
import os
import numpy as np
from dotenv import load_dotenv
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from datetime import datetime, timezone
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import normalize
from tqdm.asyncio import tqdm
import ast

load_dotenv()

POSTGRES_SERVER = os.getenv("POSTGRES_SERVER")
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_DB = os.getenv("POSTGRES_DB")

if not all([POSTGRES_SERVER, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB]):
    raise ValueError("Missing required environment variables for PostgreSQL connection.")

SQLALCHEMY_DATABASE_URI = (
    f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_SERVER}/{POSTGRES_DB}"
)

async_engine = create_async_engine(SQLALCHEMY_DATABASE_URI, echo=False)
AsyncSessionLocal = sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def get_running_events(session: AsyncSession):
    """
    Fetches all events from the database whose end_date_time is greater than or equal to the current UTC time.

    Args:
        session (AsyncSession): The SQLAlchemy async session.

    Returns:
        List of tuples containing event codes.
    """
    query = text("SELECT id FROM events WHERE end_date_time >= :now")
    result = await session.execute(query, {"now": datetime.now(timezone.utc)})
    return result.fetchall()

async def get_embeddings(session: AsyncSession, event_id: int):
    """
    Retrieves face embeddings for a given event from the database.

    Args:
        session (AsyncSession): The SQLAlchemy async session.
        event_id (int): The event identifier.

    Returns:
        List of tuples containing face id and embedding bytes.
    """
    query = text(
        """
        SELECT id, embedding
        FROM faces
        WHERE event_id = :event_id
        """
    )
    result = await session.execute(query, {"event_id": event_id})
    return result.fetchall()

async def update_clusters(session: AsyncSession, face_ids, cluster_labels):
    """
    Updates the cluster_id for each face in the database.

    Args:
        session (AsyncSession): The SQLAlchemy async session.
        face_ids (list): List of face IDs.
        cluster_labels (list or np.ndarray): List of cluster labels corresponding to face IDs.

    Returns:
        None
    """
    for face_id, cluster_id in zip(face_ids, cluster_labels):
        await session.execute(
            text("UPDATE faces SET cluster_id = :cluster_id WHERE id = :face_id"),
            {"cluster_id": int(cluster_id), "face_id": face_id}
        )
    await session.commit()

async def main():
    """
    Main entry point for clustering face embeddings for all running events.

    - Fetches all running events.
    - For each event, retrieves face embeddings.
    - Normalizes embeddings and performs DBSCAN clustering.
    - Updates the cluster labels in the database.
    """
    async with AsyncSessionLocal() as session:
        past_events = await get_running_events(session)
        logger.info(f"Fetched {len(past_events)} past events.")
        running_events = [event[0] for event in past_events]
        logger.info(f"Running events: {running_events}")

        for event_id in tqdm(running_events, desc="Processing events"):
            logger.info(f"Processing event: {event_id}")
            embeddings = await get_embeddings(session, event_id)
            if not embeddings:
                logger.warning(f"No embeddings found for event: {event_id}")
                continue

            face_ids = [row[0] for row in embeddings]
            embeddings_array = np.array([
                ast.literal_eval(row[1]) if isinstance(row[1], str) else row[1]
                for row in embeddings
            ], dtype=np.float32)
            logger.info(f"Fetched {len(embeddings_array)} embeddings.")

            # Normalize the embeddings
            normalized_embeddings = normalize(embeddings_array)

            # Perform DBSCAN clustering
            dbscan = DBSCAN(eps=0.5, min_samples=5, metric='euclidean', n_jobs=-1)
            cluster_labels = dbscan.fit_predict(normalized_embeddings)
            logger.info(f"Clustering completed for event: {event_id}. Labels: {cluster_labels}")

            # Update clusters in the database
            await update_clusters(session, face_ids, cluster_labels)
            logger.info(f"Updated clusters for event: {event_id}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())