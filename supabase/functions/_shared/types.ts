// =============================================================================
// KisanRakshak — Shared Type Definitions
// Used by all Edge Functions and the risk engine.
// =============================================================================

// ── Core enumerations ─────────────────────────────────────────────────────────

export type CropType = 'sugarcane' | 'wheat';

export type Language = 'en' | 'hi';

export type SugarcaneStage =
  | 'germination'
  | 'tillering'
  | 'grand_growth'
  | 'maturity_ripening';

export type WheatStage =
  | 'early_growth'
  | 'crown_root'           // Crown Root Initiation (CRI)
  | 'vegetative_growth'
  | 'reproductive'
  | 'grain_development_maturity';

export type GrowthStage = SugarcaneStage | WheatStage;

/** Weather parameters that can be measured and compared against rule thresholds */
export type WeatherParameter =
  | 'max_temp_c'
  | 'min_temp_c'
  | 'precipitation_mm'
  | 'precipitation_probability_pct'
  | 'humidity_pct'
  | 'wind_speed_kmh';

export type ThresholdOperator = 'gt' | 'lt' | 'gte' | 'lte';

export type RiskSeverity = 'Low' | 'Moderate' | 'High';

/**
 * Controls how a risk rule is surfaced to the user:
 * - 'validated'            → automated severity classification (Low/Moderate/High) is allowed
 * - 'research_observation' → qualitative "Potential Risk" warning only; no automated severity
 * - 'pending_validation'   → qualitative "Potential Risk" warning only; needs local KVK confirmation
 */
export type ValidationStatus =
  | 'validated'
  | 'research_observation'
  | 'pending_validation';

// ── Weather types ─────────────────────────────────────────────────────────────

/** A single day's processed forecast from Open-Meteo */
export interface DailyForecast {
  date: string;                        // ISO date (YYYY-MM-DD)
  max_temp_c: number | null;           // Maximum temperature (°C)
  min_temp_c: number | null;           // Minimum temperature (°C)
  precipitation_mm: number | null;     // Total daily rainfall (mm)
  precipitation_probability_pct: number | null; // Max precipitation probability (%)
  humidity_pct: number | null;         // Mean daily relative humidity (%) — relative_humidity_2m_mean
  wind_speed_kmh: number | null;       // Maximum wind speed (km/h)
}

/** Complete weather summary returned by the get-weather function */
export interface WeatherSummary {
  location: string;
  latitude: number;
  longitude: number;
  daily: DailyForecast[];
  fetched_at: string;                  // ISO timestamp of when data was fetched
  source: 'Open-Meteo';
}

// ── Risk rule types ───────────────────────────────────────────────────────────

/**
 * A single crop-specific weather risk rule.
 * Each rule must have a verifiable agricultural source.
 */
export interface RiskRule {
  id: string;
  crop: CropType;
  growth_stage: GrowthStage;
  weather_parameter: WeatherParameter;
  threshold_operator: ThresholdOperator;
  threshold_value: number;
  threshold_unit: string;
  duration_hours?: number;
  risk_name: string;
  risk_severity: RiskSeverity;
  validation_status: ValidationStatus;
  source: string;
  source_url?: string;
  precautionary_action: string;
  precautionary_action_hi?: string;
  notes?: string;
}

// ── Risk detection output ─────────────────────────────────────────────────────

/**
 * A risk detected by the deterministic risk engine.
 * severity is 'Potential Risk' for research_observation / pending_validation rules.
 */
export interface DetectedRisk {
  rule_id: string;
  risk_name: string;
  /**
   * Severity label:
   * - For validated rules: 'Low' | 'Moderate' | 'High'
   * - For unvalidated rules: 'Potential Risk'
   * - When data is insufficient: 'Insufficient Data'
   */
  severity: RiskSeverity | 'Potential Risk' | 'Insufficient Data';
  validation_status: ValidationStatus;
  weather_parameter: WeatherParameter;
  observed_value: number;
  threshold_value: number;
  threshold_operator: ThresholdOperator;
  threshold_unit: string;
  trigger_date: string;                // The forecast date that triggered this rule
  source: string;
  source_url?: string;
  precautionary_action: string;
  precautionary_action_hi?: string;
  notes?: string;
}

// ── Farmer input ──────────────────────────────────────────────────────────────

/**
 * Validated farmer input received by the generate-advisory function.
 * growth_stage is ALWAYS the primary input for risk detection.
 * sowing_date is used ONLY for consistency checks and is never used to override growth_stage.
 */
export interface FarmerInput {
  farmer_id?: string;
  name?: string;
  location: string;
  latitude: number;
  longitude: number;
  crop: CropType;
  sowing_date?: string;                // ISO date; used for consistency check only
  growth_stage: GrowthStage;          // Primary input — never overridden by system
  language: Language;
}

// ── Advisory response ─────────────────────────────────────────────────────────

/** Full response returned by the generate-advisory Edge Function */
export interface AdvisoryResponse {
  farmer_input: FarmerInput;
  weather_summary: WeatherSummary;
  detected_risks: DetectedRisk[];
  ai_advisory?: string;               // Gemini-generated text; undefined if Gemini unavailable
  ai_fallback: boolean;               // true when Gemini was unavailable
  advisory_id?: string;               // Supabase row ID if advisory was saved
  consistency_warning?: string;       // Non-fatal: shown when sowing_date and stage seem inconsistent
  generated_at: string;               // ISO timestamp
}
