-- Migration 001: Create farmers table
-- Stores farmer profiles and crop details submitted through the app

CREATE TABLE IF NOT EXISTS farmers (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT,
  location          TEXT        NOT NULL,
  latitude          NUMERIC(10, 6) NOT NULL,
  longitude         NUMERIC(10, 6) NOT NULL,
  crop              TEXT        NOT NULL CHECK (crop IN ('sugarcane', 'wheat')),
  sowing_date       DATE,
  growth_stage      TEXT        NOT NULL,
  language          TEXT        NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER farmers_updated_at
  BEFORE UPDATE ON farmers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert on farmers"
  ON farmers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public select on farmers"
  ON farmers FOR SELECT
  USING (true);

COMMENT ON TABLE farmers IS 'Farmer profiles — location, crop selection, sowing date, growth stage, and language preference.';
COMMENT ON COLUMN farmers.growth_stage IS 'Manually selected by farmer. This is the primary input for risk detection and must never be automatically overridden.';
COMMENT ON COLUMN farmers.sowing_date IS 'Used only as supporting context to flag potential inconsistencies. Does not override growth_stage.';
