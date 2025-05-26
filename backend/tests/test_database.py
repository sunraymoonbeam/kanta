# tests/test_database.py
# ======================
# End‑to‑end async tests for src.db.database.Database (event‑aware version).

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import List

import pytest
import pytest_asyncio
from src.db.database import Database

EVENT_CODE = "testevt"  # every test runs inside this event


# ----------------------------------------------------------------------
# Fixture: one fresh connection‑pool per test
# ----------------------------------------------------------------------
@pytest_asyncio.fixture(scope="function")
async def db() -> Database:
    inst = Database(
        host=os.getenv("DBHOST", "localhost"),
        user=os.getenv("DBUSER", "kanta_admin"),
        password=os.getenv("DBPASSWORD", "password"),
        database=os.getenv("DBNAME", "postgres"),
        port=int(os.getenv("DBPORT", 5432)),
    )
    await inst.connect()

    # ensure the event row exists (idempotent)
    await inst.string_query(
        """
        INSERT INTO events(code, name)
        VALUES($1, 'PyTest Event')
        ON CONFLICT (code) DO NOTHING
        """,
        EVENT_CODE,
    )

    yield inst
    await inst.close()


# ----------------------------------------------------------------------
# Helper functions
# ----------------------------------------------------------------------
async def _insert_image(db: Database, *, faces: int = 0) -> str:
    """
    Insert one image row (linked to EVENT_CODE) and return its UUID.
    """
    u = uuid.uuid4().hex
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.insert_image(
        event_code=EVENT_CODE,
        image_uuid=u,
        azure_blob_url=f"https://blob.test/{u}.jpg",
        faces=faces,
        created_at=now,
        last_modified=now,
    )
    return u


async def _insert_faces(
    db: Database, *, image_uuid: str, n: int = 2, start: float = 0.1
) -> List[int]:
    """
    Insert `n` faces into the given image and return their face_ids.
    """
    for i in range(n):
        val = start + i * 0.01
        await db.insert_face(
            event_code=EVENT_CODE,
            image_uuid=image_uuid,
            bbox={"x": i, "y": i, "width": 10 + i, "height": 10 + i},
            embedding=[val] * 128,
            cluster_id=-1,
        )
    details = await db.get_image_details_by_uuid(image_uuid)
    assert details, "image details missing after face inserts"
    return [f["face_id"] for f in details["faces"]][-n:]


# ----------------------------------------------------------------------
# Tests
# ----------------------------------------------------------------------
@pytest.mark.asyncio
async def test_insert_and_get_images(db: Database) -> None:
    u1 = await _insert_image(db, faces=1)
    u2 = await _insert_image(db, faces=2)

    all_imgs = await db.get_images(event_code=EVENT_CODE, limit=50, offset=0)
    uuids = {row["uuid"].strip() for row in all_imgs}

    assert {u1, u2} <= uuids

    few = await db.get_images(event_code=EVENT_CODE, min_faces=2, limit=10)
    assert all(r["faces"] >= 2 for r in few)

    some = await db.get_images(event_code=EVENT_CODE, max_faces=1, limit=10)
    assert all(r["faces"] <= 1 for r in some)


@pytest.mark.asyncio
async def test_get_image_details_and_insert_faces(db: Database) -> None:
    u = await _insert_image(db)
    fids = await _insert_faces(db, image_uuid=u, n=2, start=0.2)

    details = await db.get_image_details_by_uuid(u)
    assert details
    print(details)


@pytest.mark.asyncio
async def test_similarity_search(db: Database) -> None:
    u = await _insert_image(db)
    await _insert_faces(db, image_uuid=u, n=1, start=0.42)
    ref = [0.42] * 128

    hits = await db.similarity_search(
        event_code=EVENT_CODE, target_embedding=ref, metric="cosine", top_k=3
    )
    assert hits, "no similarity hits returned"


@pytest.mark.asyncio
async def test_get_all_embeddings(db: Database) -> None:
    u = await _insert_image(db)
    await _insert_faces(db, image_uuid=u, n=3, start=0.55)

    rows = await db.get_all_embeddings(EVENT_CODE)
    tail = rows[-3:]
    assert tail and all(len(r["embedding"]) == 128 for r in tail)


@pytest.mark.asyncio
async def test_update_cluster_and_filter_images(db: Database) -> None:
    u1, u2 = await _insert_image(db), await _insert_image(db)
    f1 = (await _insert_faces(db, image_uuid=u1, n=1))[0]
    f2 = (await _insert_faces(db, image_uuid=u2, n=1, start=0.2))[0]

    await db.update_cluster_ids(updates={f1: 7, f2: 8})

    imgs7 = await db.get_images(event_code=EVENT_CODE, cluster_list_id=[7])
    imgs8 = await db.get_images(event_code=EVENT_CODE, cluster_list_id=[8])

    assert u1 in {i["uuid"].strip() for i in imgs7}
    assert u2 in {i["uuid"].strip() for i in imgs8}


@pytest.mark.asyncio
async def test_get_cluster_info(db: Database) -> None:
    u = await _insert_image(db)
    fids = await _insert_faces(db, image_uuid=u, n=5, start=0.3)
    await db.update_cluster_ids(updates={fid: 3 for fid in fids})

    summary = await db.get_cluster_info(EVENT_CODE, sample_size=2)
    assert all(set(item) == {"cluster_id", "face_count", "samples"} for item in summary)


@pytest.mark.asyncio
async def test_raw_query_and_deletion(db: Database) -> None:
    u = await _insert_image(db)
    await _insert_faces(db, image_uuid=u, n=2)

    before_cnt = (await db.string_query("SELECT COUNT(*) FROM faces"))[0]["count"]
    await db.delete_image_by_uuid(u)
    after_cnt = (await db.string_query("SELECT COUNT(*) FROM faces"))[0]["count"]

    assert after_cnt < before_cnt, "faces not deleted after image removal"
