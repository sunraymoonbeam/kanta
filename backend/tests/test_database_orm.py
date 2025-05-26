# tests/test_database_orm.py
# ==========================
# End‑to‑end async tests for src.db.database_orm.ORMDatabase (event‑aware).

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import List

import pytest
import pytest_asyncio
from src.db.database_orm import ORMDatabase

EVENT_CODE = "testevt"  # each test runs inside this temporary event


# ----------------------------------------------------------------------
# Fixture
# ----------------------------------------------------------------------
@pytest_asyncio.fixture(scope="function")
async def db() -> ORMDatabase:
    """Provide a fresh ORMDatabase pool + ensure EVENT_CODE exists."""
    inst = ORMDatabase(
        host=os.getenv("DBHOST", "localhost"),
        port=int(os.getenv("DBPORT", 5432)),
        user=os.getenv("DBUSER", "kanta_admin"),
        password=os.getenv("DBPASSWORD", "password"),
        database=os.getenv("DBNAME", "postgres"),
        ssl=os.getenv("SSLMODE", "require"),
    )
    await inst.init_models()
    # idempotently insert the test event
    await inst.string_query(
        """
        INSERT INTO events(code, name)
        VALUES(:c, 'PyTest Event')
        ON CONFLICT (code) DO NOTHING
        """,
        {"c": EVENT_CODE},
    )
    yield inst
    await inst.close()


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------
async def _insert_image(db: ORMDatabase, *, faces: int = 0) -> str:
    uid = uuid.uuid4().hex
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.insert_image(
        event_code=EVENT_CODE,
        uuid=uid,
        url=f"https://blob.test/{uid}.jpg",
        faces=faces,
        created_at=now,
        last_modified=now,
    )
    return uid


async def _insert_faces(
    db: ORMDatabase, *, image_uuid: str, n: int = 2, start: float = 0.1
) -> List[int]:
    ids: List[int] = []
    for i in range(n):
        emb_val = start + i * 0.01
        face = await db.insert_face(
            event_code=EVENT_CODE,
            image_uuid=image_uuid,
            cluster_id=-1,
            bbox={"x": i, "y": i, "width": 10 + i, "height": 10 + i},
            embedding=[emb_val] * 128,
        )
        ids.append(face.id)
    return ids


# ----------------------------------------------------------------------
# Tests
# ----------------------------------------------------------------------
@pytest.mark.asyncio
async def test_create_and_list_images(db: ORMDatabase) -> None:
    u1 = await _insert_image(db, faces=1)
    u2 = await _insert_image(db, faces=2)

    imgs = await db.get_images(event_code=EVENT_CODE, limit=10)
    uuids = {img.uuid for img in imgs}
    assert {u1, u2} <= uuids

    ge2 = await db.get_images(event_code=EVENT_CODE, min_faces=2)
    assert all(i.faces >= 2 for i in ge2)

    le1 = await db.get_images(event_code=EVENT_CODE, max_faces=1)
    assert all(i.faces <= 1 for i in le1)


@pytest.mark.asyncio
async def test_get_image_by_uuid_and_faces(db: ORMDatabase) -> None:
    u = await _insert_image(db)
    face_ids = await _insert_faces(db, image_uuid=u, n=3, start=0.3)

    img = await db.get_image_by_uuid(uuid=u)
    assert img is not None
    rel_ids = [f.id for f in img.faces_rel]
    assert set(face_ids) <= set(rel_ids)


@pytest.mark.asyncio
async def test_similarity_search_orm(db: ORMDatabase) -> None:
    u = await _insert_image(db)
    await _insert_faces(db, image_uuid=u, n=1, start=0.42)
    ref = [0.42] * 128

    hits = await db.similarity_search(
        event_code=EVENT_CODE, target_embedding=ref, metric="cosine", top_k=2
    )
    assert hits, "similarity_search returned no hits"


@pytest.mark.asyncio
async def test_get_all_embeddings_orm(db: ORMDatabase) -> None:
    u = await _insert_image(db)
    await _insert_faces(db, image_uuid=u, n=4, start=0.55)

    rows = await db.get_all_embeddings(EVENT_CODE)
    tail = rows[-4:]
    assert tail and all(len(r["embedding"]) == 128 for r in tail)


@pytest.mark.asyncio
async def test_update_cluster_ids_and_reflect(db: ORMDatabase) -> None:
    u = await _insert_image(db)
    fids = await _insert_faces(db, image_uuid=u, n=2)
    await db.update_cluster_ids(EVENT_CODE, {fids[0]: 7, fids[1]: 8})

    img = await db.get_image_by_uuid(uuid=u)
    clusters = {f.cluster_id for f in img.faces_rel}
    assert {7, 8} <= clusters


@pytest.mark.asyncio
async def test_get_cluster_info_orm(db: ORMDatabase) -> None:
    u = await _insert_image(db)
    fids = await _insert_faces(db, image_uuid=u, n=5, start=0.6)
    await db.update_cluster_ids(EVENT_CODE, {fid: 3 for fid in fids})

    summary = await db.get_cluster_info(EVENT_CODE, sample_size=2)
    assert all(set(item) == {"cluster_id", "face_count", "samples"} for item in summary)


@pytest.mark.asyncio
async def test_raw_query_and_cascade_delete_orm(db: ORMDatabase) -> None:
    u = await _insert_image(db)
    await _insert_faces(db, image_uuid=u, n=3)

    before_cnt = (await db.string_query("SELECT COUNT(*) AS cnt FROM faces"))[0]["cnt"]
    await db.delete_image_by_uuid(uuid=u)
    after_cnt = (await db.string_query("SELECT COUNT(*) AS cnt FROM faces"))[0]["cnt"]

    assert after_cnt < before_cnt, "faces not cascaded after image deletion"
