-- 0001_init_schema.sql
-- ------------------------------------------------------------------
-- 1) Enable pgvector extension (must be allowed in Azure Portal first)
-- Visit https://learn.microsoft.com/en-us/azure/postgresql/extensions/how-to-allow-extensions?tabs=allow-extensions-portal#allow-extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Drop old tables in reverse-dependency order
DROP TABLE IF EXISTS faces;
DROP TABLE IF EXISTS images;
DROP TABLE IF EXISTS events;

/*------------------------------------------------------------------
  3) Create events table to represent each wedding/event
------------------------------------------------------------------*/
CREATE TABLE events (
    id          SERIAL       PRIMARY KEY,
    code        VARCHAR(32)  UNIQUE NOT NULL, -- opaque slug/UUID in QR code, e.g. 'spring24'
    name        TEXT, -- human-readable name, e.g. 'Alice & Bob Wedding'
    start_time  TIMESTAMPTZ, -- event start (ISO 8601)
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

/*------------------------------------------------------------------
  4) Create images table, scoped to an event
------------------------------------------------------------------*/
CREATE TABLE images (
    id             SERIAL       PRIMARY KEY,
    event_id       INTEGER      NOT NULL
                     REFERENCES events(id) ON DELETE CASCADE,
    uuid           VARCHAR(32)  UNIQUE NOT NULL,
    azure_blob_url TEXT         NOT NULL,
    file_extension TEXT         NOT NULL,
    faces          INTEGER      NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_modified  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Trigger: derive file_extension from URL
CREATE OR REPLACE FUNCTION trg_set_file_ext()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.file_extension :=
    LOWER(split_part(split_part(NEW.azure_blob_url, '?', 1), '.', -1));
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_file_ext
  BEFORE INSERT OR UPDATE OF azure_blob_url
  ON images
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_file_ext();

/*------------------------------------------------------------------
  5) Create faces table, scoped to same event
------------------------------------------------------------------*/
CREATE TABLE faces (
    id          SERIAL       PRIMARY KEY,
    event_id    INTEGER      NOT NULL
                     REFERENCES events(id) ON DELETE CASCADE,
    image_id    INTEGER      NOT NULL
                     REFERENCES images(id) ON DELETE CASCADE,
    image_uuid  VARCHAR(32)  NOT NULL,
    bbox        JSONB        NOT NULL,
    embedding   vector(128)  NOT NULL,
    cluster_id  INTEGER      NOT NULL DEFAULT -1
);

/*------------------------------------------------------------------
  6) Insert sample event + images + faces
------------------------------------------------------------------*/
-- 6.1) Sample event
INSERT INTO events(code, name, start_time)
VALUES('spring24','Alice & Bob Wedding','2025-06-15T14:00:00Z');

-- 6.2) Sample images
INSERT INTO images(event_id, uuid, azure_blob_url, faces)
SELECT id, v.uuid, v.url, v.faces
FROM events
CROSS JOIN (VALUES
  ('123e4567e89b12d3a456426655440000','https://example.com/blob1.jpg',1),
  ('123e4567e89b12d3a456426655440001','https://example.com/blob2.png',2),
  ('123e4567e89b12d3a456426655440002','https://example.com/blob3.jpeg?sig=xyz',3)
) AS v(uuid,url,faces)
WHERE code='spring24';

-- 6.3) Sample faces for first two images
INSERT INTO faces(event_id, image_id, image_uuid, bbox, embedding)
SELECT
  e.id AS event_id,
  i.id AS image_id,
  v.uuid AS image_uuid,
  v.bbox::jsonb AS bbox,
  v.emb::vector AS embedding
FROM events e
JOIN images i ON i.event_id = e.id
CROSS JOIN LATERAL (
  VALUES
    (
      '123e4567e89b12d3a456426655440000',
      '{"x":10,"y":20,"width":30,"height":40}',
      '[' ||
        '0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,0.0,' ||
        repeat('0,',117) || '0'
      || ']' 
    ),
    (
      '123e4567e89b12d3a456426655440001',
      '{"x":15,"y":25,"width":35,"height":45}',
      '[0.11,0.12,0.13,0.14,0.15,0.16,0.17,0.18,0.19,0.20,' || repeat('0,',117) || '0]' 
    )
) AS v(uuid,bbox,emb)
WHERE e.code = 'spring24'
  AND i.uuid = v.uuid;
