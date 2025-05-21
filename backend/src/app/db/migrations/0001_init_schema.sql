-- 0001_init_schema.sql
-- ------------------------------------------------------------------
-- 1) Enable pgvector extension (must be allowed in Azure Portal first)
--    https://learn.microsoft.com/azure/postgresql/extensions/how-to-allow-extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- ------------------------------------------------------------------
-- 2) Drop old tables (reverse-dependency order)
DROP TABLE IF EXISTS faces;
DROP TABLE IF EXISTS images;
DROP TABLE IF EXISTS events;

-- ------------------------------------------------------------------
-- 3) Create events table
--------------------------------------------------------------------
CREATE TABLE events (
    id               SERIAL        PRIMARY KEY,
    code             VARCHAR(32)   UNIQUE NOT NULL,    -- opaque slug/UUID, e.g. 'spring24'
    name             TEXT,                          -- human-readable name
    description      TEXT,                          -- optional description
    start_date_time  TIMESTAMPTZ,                   -- event start time (UTC)
    end_date_time    TIMESTAMPTZ,                   -- event end time (UTC)
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()  -- record creation
);

-- ------------------------------------------------------------------
-- 4) Create images table
--------------------------------------------------------------------
CREATE TABLE images (
    id              SERIAL        PRIMARY KEY,
    event_id        INTEGER       NOT NULL
                      REFERENCES events(id) ON DELETE CASCADE,
    uuid            VARCHAR(32)   UNIQUE NOT NULL,    -- image identifier
    azure_blob_url  TEXT          NOT NULL,           -- Azure Blob URL
    file_extension  VARCHAR(10)   NOT NULL,           -- e.g. 'jpg'
    faces           INTEGER       NOT NULL DEFAULT 0, -- number of faces detected
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    last_modified   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Trigger: derive `file_extension` from the blob URL
CREATE OR REPLACE FUNCTION trg_set_file_ext()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.file_extension := 
    LOWER( split_part( split_part(NEW.azure_blob_url, '?', 1), '.', -1 ) );
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_file_ext
  BEFORE INSERT OR UPDATE OF azure_blob_url
  ON images
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_file_ext();

-- Trigger: auto-update `last_modified` on every update
CREATE OR REPLACE FUNCTION trg_set_last_modified()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.last_modified := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_last_modified
  BEFORE UPDATE ON images
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_last_modified();

-- ------------------------------------------------------------------
-- 5) Create faces table
--------------------------------------------------------------------
CREATE TABLE faces (
    id          SERIAL       PRIMARY KEY,
    event_id    INTEGER      NOT NULL
                   REFERENCES events(id) ON DELETE CASCADE,  -- denormalized FK for grouping
    image_id    INTEGER      NOT NULL
                   REFERENCES images(id) ON DELETE CASCADE,
    bbox        JSONB        NOT NULL,                     -- {'x','y','width','height'}
    embedding   vector(128)  NOT NULL,                     -- 128-D face embedding
    cluster_id  INTEGER      NOT NULL DEFAULT -1          -- cluster label (-1 = unclustered)
);
