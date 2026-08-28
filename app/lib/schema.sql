-- simple-plan-search schema. Every table is prefixed sps_ because this Neon
-- database is shared with an unrelated project using mk03_ / mk04_ tables.

CREATE TABLE IF NOT EXISTS sps_plan_search_cache (
  cache_key  TEXT PRIMARY KEY,
  request    JSONB       NOT NULL,
  response   JSONB       NOT NULL,
  zip_code   TEXT        NOT NULL,
  fips_code  TEXT        NOT NULL,
  plan_count INTEGER     NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sps_plan_search_cache_fetched_at_idx
  ON sps_plan_search_cache (fetched_at DESC);

CREATE TABLE IF NOT EXISTS sps_zip_county_cache (
  zip_code    TEXT PRIMARY KEY,
  fips_code   TEXT        NOT NULL,
  state       TEXT        NOT NULL,
  county_name TEXT,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sps_modifier_batch (
  id          BIGSERIAL PRIMARY KEY,
  filename    TEXT        NOT NULL,
  row_count   INTEGER     NOT NULL,
  note        TEXT,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every key column is nullable; NULL means "matches any". Most-specific row wins.
CREATE TABLE IF NOT EXISTS sps_gravie_modifier (
  id             BIGSERIAL PRIMARY KEY,
  batch_id       BIGINT       NOT NULL REFERENCES sps_modifier_batch(id) ON DELETE CASCADE,
  hios_plan_id   TEXT,
  carrier_id     TEXT,
  state          TEXT,
  rating_area    TEXT,
  metal_level    TEXT,
  effective_year INTEGER,
  multiplier     NUMERIC(9,6) NOT NULL DEFAULT 1.0,
  flat_cents     BIGINT       NOT NULL DEFAULT 0,
  -- Gravie sets the enrollment type per carrier; Ideon has no such field.
  enrollment_type TEXT,
  label          TEXT,
  CONSTRAINT sps_gravie_modifier_multiplier_sane CHECK (multiplier > 0 AND multiplier < 10)
);

CREATE INDEX IF NOT EXISTS sps_gravie_modifier_batch_idx
  ON sps_gravie_modifier (batch_id);

-- Widening sps_gravie_modifier from a premium table to Gravie's per-plan overlay.
ALTER TABLE sps_gravie_modifier ADD COLUMN IF NOT EXISTS enrollment_type TEXT;
