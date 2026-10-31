-- Migration 003: Create advisories table
-- Stores generated advisories (weather snapshot + risk results + AI output) for advisory history.

CREATE TABLE IF NOT EXISTS advisories (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id           UUID        REFERENCES farmers(id) ON DELETE SET NULL,

  -- Input snapshot at time of advisory generation
  crop                TEXT        NOT NULL CHECK (crop IN ('sugarcane', 'wheat')),
  growth_stage        TEXT        NOT NULL,
  location            TEXT        NOT NULL,
  latitude            NUMERIC(10, 6) NOT NULL,
  longitude           NUMERIC(10, 6) NOT NULL,
  language            TEXT        NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi')),

  -- Stored outputs (JSONB for flexibility as data shape evolves)
  weather_summary     JSONB,      -- Full 7-day Open-Meteo forecast snapshot
  detected_risks      JSONB,      -- Array of DetectedRisk objects from the risk engine
  ai_advisory         TEXT,       -- Gemini-generated advisory (English or bilingual)
  ai_advisory_hi      TEXT,       -- Reserved: Hindi-only advisory if generated separately
  fallback_used       BOOLEAN     NOT NULL DEFAULT false,  -- true if Gemini was unavailable

  -- Timestamps
  weather_fetched_at  TIMESTAMPTZ,  -- When Open-Meteo data was retrieved
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fetching a farmer's advisory history efficiently
CREATE INDEX IF NOT EXISTS idx_advisories_farmer_id
  ON advisories (farmer_id, created_at DESC);

-- Index for browsing recent advisories without a specific farmer
CREATE INDEX IF NOT EXISTS idx_advisories_created_at
  ON advisories (created_at DESC);

-- Row Level Security
ALTER TABLE advisories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert on advisories"
  ON advisories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public select on advisories"
  ON advisories FOR SELECT
  USING (true);

CREATE POLICY "Allow public delete on advisories"
  ON advisories FOR DELETE
  USING (true);

COMMENT ON TABLE advisories IS 'Persisted advisory records — weather snapshot, risk engine output, and optional Gemini advisory — for advisory history feature.';
COMMENT ON COLUMN advisories.fallback_used IS 'True when Gemini was unavailable and only backend risk results were returned to the user.';
COMMENT ON COLUMN advisories.detected_risks IS 'JSON array of DetectedRisk objects. Each entry includes rule_id, severity, validation_status, source, and precautionary_action.';
