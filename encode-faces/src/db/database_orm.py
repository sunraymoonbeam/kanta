"""
database_orm.py
===============
Async SQLAlchemy helper for **events**, **images** and **faces** tables.

This module provides a high-level ORM interface to the `images` and `faces` tables
using SQLAlchemy Core & ORM. CRUD methods mirror the raw SQL helper for easy
swap-in, and additional vector and clustering queries are included.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence, Tuple

import asyncpg
from sqlalchemy import String, cast, delete, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import selectinload

from .models import Base, Event, Face, Image


def _build_url(
    *,
    host: str,
    port: int,
    user: str,
    password: str,
    database: str,
    ssl: str | asyncpg.SSLContext,
) -> str:
    """
    Build a SQLAlchemy DSN for asyncpg with optional sslmode.

    Args:
        host: Database host.
        port: Database port.
        user: Username.
        password: Password.
        database: Database name.
        ssl: SSL mode (e.g. 'require') or SSLContext.
    Returns:
        SQLAlchemy database URL string.
    """
    tail = f"?ssl={ssl}" if isinstance(ssl, str) else ""
    return f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{database}{tail}"


def _parse(txt: str) -> List[float]:
    """
    Convert a string representation of a list to a Python list of floats.
    PgSQL stores vectors as strings like "[1.0,2.0,3.0]".
    """
    return [float(x) for x in txt.strip("[]").split(",")]


class ORMDatabase:  # noqa: D101 – full docstring below
    """High-level async helper wrapping SQLAlchemy Core & ORM for images and faces."""

    def __init__(
        self,
        *,
        host: str,
        password: str,
        user: str = "admin",
        database: str = "postgres",
        port: int = 5432,
        ssl: str | asyncpg.SSLContext = "require",
        pool_size: int = 5,
        echo: bool = False,
    ) -> None:
        """
        Args:
            host: Database host.
            password: Database password.
            port: TCP port (default: 5432).
            user: Database user (default: 'admin').
            database: Database name (default: 'postgres').
            ssl: SSL mode or context (default: 'require').
            pool_size: Max connections (default: 5).
            echo: Enable SQL echo (default: False).
        """
        dsn = _build_url(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            ssl=ssl,
        )
        # an Engine, which the Session will use for connection resources
        self.engine = create_async_engine(dsn, echo=echo, pool_size=pool_size)
        self.Session: async_sessionmaker[AsyncSession] = async_sessionmaker(
            bind=self.engine, expire_on_commit=False
        )

    async def init_models(self) -> None:
        """Create tables if they don’t exist (development / tests only)."""
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def close(self) -> None:  # noqa: D401 – imperative mood
        """Dispose the engine (closes all pooled connections)."""
        await self.engine.dispose()

    # Event helper
    # All public methods are *event‑aware*: the caller supplies an `event_code`, we
    # resolve it once to `event_id`, and every query/insert/update is scoped to that
    # event.
    # ======================================================================
    async def get_event_id(self, event_code: str) -> int:
        """Get the event ID for a given event code.
        Args:
            event_code: The event code to look up.

        Returns:
            The event ID corresponding to the event code.

        Raises:
            ValueError: If the event code is unknown.
        """
        async with self.Session() as ses:
            eid = await ses.scalar(select(Event.id).where(Event.code == event_code))
            if eid is None:
                raise ValueError(f"Unknown event code: {event_code}")
            return eid

    async def insert_event(
        self,
        *,
        event_code: str,
        name: Optional[str] = None,
        start_time: Optional[datetime] = None,
    ) -> Event:
        """
        Insert new Event (error if code exists), return the ORM object.
        """
        async with self.Session() as ses:
            ev = Event(code=event_code, name=name, start_time=start_time)
            ses.add(ev)
            try:
                await ses.commit()
                await ses.refresh(ev)
            except IntegrityError:
                await ses.rollback()
                raise ValueError(f"Event code '{event_code}' already exists")
            return ev

    async def get_event_by_code(self, event_code: str) -> Event:
        """
        Fetch one Event by code, error if missing.
        """
        stmt = select(Event).where(Event.code == event_code)
        async with self.Session() as ses:
            ev = await ses.scalar(stmt)
            if ev is None:
                raise ValueError(f"Unknown event code: {event_code}")
            return ev

    async def delete_event(self, event_code: str) -> None:
        """
        Delete an Event by its code.
        """
        async with self.Session() as ses:
            await ses.execute(delete(Event).where(Event.code == event_code))
            await ses.commit()

    # Images
    # ======================================================================
    async def insert_image(
        self,
        *,
        event_code: str,
        uuid: str,
        url: str,
        faces: int,
        created_at: datetime,
        last_modified: datetime,
    ) -> Image:
        """
        Insert a new image row and return the ORM instance.

        Args:
            event_code: Event code to associate with the image.
            uuid: 32-char UUID string.
            url: Azure blob URL.
            faces: Number of detected faces.
            created_at: Creation timestamp.
            last_modified: Last modified timestamp.

        Returns:
            The newly created Image.
        """
        event_id = await self.get_event_id(event_code)

        async with self.Session() as ses:
            img = Image(
                event_id=event_id,
                uuid=uuid,
                azure_blob_url=url,
                faces=faces,
                created_at=created_at,
                last_modified=last_modified,
            )
            ses.add(img)
            await ses.commit()
            await ses.refresh(img)
            return img

    async def get_images(
        self,
        *,
        event_code: str,
        limit: int = 50,
        offset: int = 0,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        min_faces: Optional[int] = None,
        max_faces: Optional[int] = None,
        cluster_list_id: Optional[List[int]] = None,
    ) -> List[Image]:
        """
        Retrieve images belonging to a given event, with optional filters
        and pagination.

        Args:
            event_code:       Event code to scope the query.
            limit:            Max rows to return (default: 50).
            offset:           Rows to skip (default: 0).
            date_from:        Only include images created on/after this timestamp.
            date_to:          Only include images created on/before this timestamp.
            min_faces:        Minimum number of faces in the image.
            max_faces:        Maximum number of faces in the image.
            cluster_list_id:  If provided, only images having ≥1 face in any of these clusters.

        Returns:
            A list of `Image` ORM instances (with `.faces_rel` eagerly loaded),
            ordered by descending creation time.
        """
        # 1) resolve event_id
        event_id = await self.get_event_id(event_code)

        # 2) build base statement
        stmt = (
            select(Image)
            .options(selectinload(Image.faces_rel))
            .where(Image.event_id == event_id)
        )

        # 3) apply image‐level filters
        if date_from:
            stmt = stmt.where(Image.created_at >= date_from)
        if date_to:
            stmt = stmt.where(Image.created_at <= date_to)
        if min_faces is not None:
            stmt = stmt.where(Image.faces >= min_faces)
        if max_faces is not None:
            stmt = stmt.where(Image.faces <= max_faces)

        # 4) optional cluster filter (join + WHERE + DISTINCT)
        if cluster_list_id:
            stmt = (
                stmt.join(
                    Image.faces_rel
                )  # INNER JOIN faces AS f ON f.image_id = Image.id
                .where(Face.cluster_id.in_(cluster_list_id))
                .distinct()
            )

        # 5) ordering & pagination
        stmt = stmt.order_by(Image.created_at.desc()).limit(limit).offset(offset)

        # 6) execute
        async with self.Session() as ses:
            result = await ses.execute(stmt)
            # unique().scalars() ensures no duplicates if we joined + distinct
            return result.unique().scalars().all()

    async def get_image_by_uuid(
        self,
        *,
        uuid: str,
    ) -> Optional[Image]:
        """
        Fetch a single image (and its faces) by UUID, scoped to an event.

        Args:
            event_code: Event code to scope the query.
            uuid:       32-char UUID of the image.

        Returns:
            The `Image` ORM instance with `.faces_rel` populated, or None if not found
            or not part of the specified event.
        """
        # 1) build query
        stmt = (
            select(Image)
            .options(selectinload(Image.faces_rel))
            .where(Image.uuid == uuid)
            .limit(1)
        )

        # 3) execute
        async with self.Session() as ses:
            return await ses.scalar(stmt)

    async def delete_image_by_uuid(self, *, uuid: str) -> None:
        """
        Delete an image and its faces (CASCADE).

        Args:
            uuid: UUID of the image to delete.
        """
        async with self.Session() as ses:
            await ses.execute(delete(Image).where(Image.uuid == uuid))
            await ses.commit()

    # Faces
    # ======================================================================
    async def insert_face(
        self,
        *,
        event_code: str,
        image_uuid: str,
        cluster_id: int,
        bbox: Dict[str, int],
        embedding: Sequence[float],
    ) -> Face:
        """
        Insert a face linked to an event and image by UUID.

        Args:
            event_code: Event code for the image.
            image_uuid: Parent image UUID.
            cluster_id: Cluster label.
            bbox: Dict with keys x,y,width,height.
            embedding: 128-float list.

        Returns:
            The newly created Face.
        """
        event_id = await self.get_event_id(event_code)

        async with self.Session() as ses:
            img = await ses.scalar(
                select(Image).where(
                    Image.uuid == image_uuid, Image.event_id == event_id
                )
            )

            if img is None:
                raise ValueError(f"Image {image_uuid} not in event {event_code}")

            face = Face(
                event_id=event_id,
                image_id=img.id,
                image_uuid=image_uuid,
                cluster_id=cluster_id,
                bbox=bbox,
                embedding=list(embedding),
            )
            ses.add(face)
            await ses.commit()
            await ses.refresh(face)
            return face

    async def get_cluster_info(
        self, event_code: str, sample_size: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Return one summary per cluster, with up to `sample_size` random face samples.
        Uses a raw SQL LATERAL subquery under the hood.
        Args:
            event_code: Event code to filter images.
            sample_size: Number of random samples per cluster.
        Returns:
            List of dictionaries with cluster info and samples.
        """
        event_id = await self.get_event_id(event_code)

        sql = text(
            """
            WITH summary AS (
              SELECT cluster_id, COUNT(*) AS face_count
              FROM faces
              WHERE event_id = :eid
              GROUP BY cluster_id
            )
            SELECT s.cluster_id, s.face_count,
                   f.id           AS face_id,
                   i.azure_blob_url AS sample_blob_url,
                   f.bbox         AS sample_bbox
            FROM summary s
            CROSS JOIN LATERAL (
              SELECT * FROM faces
              WHERE event_id = :eid AND cluster_id = s.cluster_id
              ORDER BY RANDOM() LIMIT :k
            ) f
            JOIN images i ON i.uuid = f.image_uuid
            ORDER BY s.cluster_id
            """
        )
        async with self.engine.connect() as conn:
            rows = (
                (await conn.execute(sql, {"eid": event_id, "k": sample_size}))
                .mappings()
                .all()
            )
        # organize the results into a dict of clusters
        clusters: Dict[int, Dict[str, Any]] = {}
        for r in rows:
            cid = r["cluster_id"]
            clusters.setdefault(
                cid, {"cluster_id": cid, "face_count": r["face_count"], "samples": []}
            )
            bbox = (
                r["sample_bbox"]
                if not isinstance(r["sample_bbox"], str)
                else json.loads(r["sample_bbox"])
            )
            clusters[cid]["samples"].append(
                {
                    "face_id": r["face_id"],
                    "sample_blob_url": r["sample_blob_url"],
                    "sample_bbox": bbox,
                }
            )
        return [clusters[c] for c in sorted(clusters)]

    async def similarity_search(
        self,
        *,
        event_code: str,
        target_embedding: Sequence[float],
        metric: str = "cosine",
        top_k: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Return top_k most similar faces by vector distance.

        Args:
            event_code: Event code to filter images.
            target_embedding: 128-D list.
            metric: 'cosine', 'l2', or 'ip'.
            top_k: Number of results.

        Returns:
            List of dicts with keys: face_id, image_uuid,
                azure_blob_url, cluster_id, bbox, embedding, distance.
        """
        event_id = await self.get_event_id(event_code)

        # get the similarity operator for the given metric
        op = {"cosine": "<=>", "l2": "<->", "ip": "<#>"}[metric]
        vec_txt = "[" + ",".join(map(str, target_embedding)) + "]"
        sql = text(
            f"""
            SELECT f.id AS face_id, f.image_uuid, i.azure_blob_url, f.cluster_id,
                   f.bbox, CAST(f.embedding AS text) AS embedding,
                   f.embedding {op} '{vec_txt}'::vector AS distance
            FROM faces f
            JOIN images i ON i.uuid = f.image_uuid
            WHERE f.event_id = :eid
            ORDER BY distance
            LIMIT :k
            """
        )

        async with self.engine.connect() as conn:
            rows = (
                (await conn.execute(sql, {"eid": event_id, "k": top_k}))
                .mappings()
                .all()
            )

        return [{**r, "embedding": _parse(r["embedding"])} for r in rows]

    async def get_all_embeddings(self, event_code: str) -> List[Dict[str, Any]]:
        """
        Fetch every embedding from a cluster as a Python list of floats.

        Args:
            event_code: Event code to filter images.

        Returns:
            List of dicts with keys: face_id, embedding.
        """
        event_id = await self.get_event_id(event_code)

        stmt = (
            select(Face.id.label("face_id"), cast(Face.embedding, String).label("emb"))
            .where(Face.event_id == event_id)
            .order_by(Face.id)
        )
        async with self.Session() as ses:
            rows = (await ses.execute(stmt)).mappings().all()

        return [{"face_id": r["face_id"], "embedding": _parse(r["emb"])} for r in rows]

    async def update_cluster_ids(
        self, event_code: str, updates: Dict[int, int] | Sequence[Tuple[int, int]]
    ) -> None:
        """
        Bulk-update cluster_id for multiple faces.

        Args:
            updates: Mapping face_id -> new_cluster_id or sequence of tuples.
        """
        event_id = await self.get_event_id(event_code)

        pairs = updates.items() if isinstance(updates, dict) else updates

        async with self.Session() as ses:
            for fid, cid in pairs:
                await ses.execute(
                    text(
                        "UPDATE faces SET cluster_id = :c WHERE id = :id AND event_id = :eid"
                    ),
                    {"c": cid, "id": fid, "eid": event_id},
                )
            await ses.commit()

    # Raw SQL
    # ======================================================================
    async def string_query(
        self, sql: str, params: Dict[str, Any] | None = None
    ) -> List[Dict[str, Any]]:
        """Run arbitrary SQL; always *returns a list*, even for INSERT/UPDATE.

        Args:
            sql: SQL statement with named parameters.
            params: Dict of parameter values.

        If the statement produces rows we stream them via ``Result.mappings()``.
        For DML that returns no rows (``INSERT … VALUES``, ``UPDATE`` without
        *RETURNING*), SQLAlchemy closes the cursor immediately – we detect this
        and return an empty list instead of raising *ResourceClosedError* so the
        helper can be used transparently for any command.
        """
        async with self.engine.connect() as conn:
            res = await conn.execute(text(sql), params or {})
            try:
                return [
                    dict(r) for r in res.mappings().all()
                ]  # SELECT / DML … RETURNING
            except Exception:
                # No result rows – typical for plain INSERT/UPDATE/DELETE
                return []
