-- Migration 002: Create risk_rules table
-- Stores crop-specific weather-risk thresholds sourced from ICAR, IMD KALP, and KVK guidelines.
-- IMPORTANT: Only rows with validation_status = 'validated' may trigger automated severity classification.
-- Rows marked 'research_observation' or 'pending_validation' generate qualitative "Potential Risk" warnings only.

CREATE TABLE IF NOT EXISTS risk_rules (
  id                       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Crop and stage scope
  crop                     TEXT    NOT NULL CHECK (crop IN ('sugarcane', 'wheat')),
  growth_stage             TEXT    NOT NULL,

  -- Weather condition definition
  weather_parameter        TEXT    NOT NULL CHECK (
                             weather_parameter IN (
                               'max_temp_c', 'min_temp_c', 'precipitation_mm',
                               'precipitation_probability_pct', 'humidity_pct', 'wind_speed_kmh'
                             )
                           ),
  threshold_operator       TEXT    NOT NULL CHECK (threshold_operator IN ('gt', 'lt', 'gte', 'lte')),
  threshold_value          NUMERIC NOT NULL,
  threshold_unit           TEXT    NOT NULL,
  duration_hours           INTEGER,                  -- optional: how long condition must persist

  -- Risk metadata
  risk_name                TEXT    NOT NULL,
  risk_severity            TEXT    NOT NULL CHECK (risk_severity IN ('Low', 'Moderate', 'High')),

  -- Validation status controls automated vs. qualitative classification
  validation_status        TEXT    NOT NULL DEFAULT 'pending_validation'
                             CHECK (validation_status IN ('validated', 'research_observation', 'pending_validation')),

  -- Agricultural source attribution (mandatory per specs)
  source                   TEXT    NOT NULL,
  source_url               TEXT,

  -- Bilingual precautionary actions
  precautionary_action     TEXT    NOT NULL,
  precautionary_action_hi  TEXT,

  -- Additional context / caveats
  notes                    TEXT,

  -- Soft-delete flag for deactivating rules without data loss
  is_active                BOOLEAN NOT NULL DEFAULT true,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast rule lookups by crop and stage
CREATE INDEX IF NOT EXISTS idx_risk_rules_crop_stage
  ON risk_rules (crop, growth_stage)
  WHERE is_active = true;

-- Row Level Security — rules are read-only for the app
ALTER TABLE risk_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on risk_rules"
  ON risk_rules FOR SELECT
  USING (true);

COMMENT ON TABLE risk_rules IS 'Crop-specific weather-risk rules sourced from ICAR, IMD KALP, and KVK. Only validated rules trigger automated severity classification.';
COMMENT ON COLUMN risk_rules.validation_status IS 'validated = operational threshold (ICAR/IMD sourced); research_observation = from research, needs local validation; pending_validation = qualitative guidance only.';
COMMENT ON COLUMN risk_rules.risk_severity IS 'Applied only when validation_status = validated. Otherwise the app surfaces a Potential Risk warning.';
