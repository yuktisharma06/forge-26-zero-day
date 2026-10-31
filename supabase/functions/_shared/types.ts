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

/** Kind of evidence behind a threshold. Shown to users so they can judge weight. */
export type EvidenceType =
  | 'official_classification'  // e.g. IMD rainfall-intensity categories
  | 'extension_guidance'       // university / government extension publications
  | 'research_literature';     // peer-reviewed or institute publications

/** A verifiable source for one threshold. */
export interface SourceRef {
  name: string;
  url?: string;
  /** What exactly the source says, in one sentence (no invented numbers). */
  citation: string;
  evidence_type: EvidenceType;
  /** Honest note on how well the source transfers to the farmer's situation. */
  applicability_note?: string;
}

/**
 * One severity level of a rule. Every tier carries its OWN source because
 * different thresholds of the same risk can come from different publications.
 * Tiers are listed in ascending severity order.
 */
export interface RiskTier {
  severity: RiskSeverity;
  threshold_operator: ThresholdOperator;
  threshold_value: number;
  source: SourceRef;
  /**
   * Why this threshold maps to this severity label. The threshold comes from
   * the source; the Low/Moderate/High label is the engine's documented mapping.
   */
  severity_basis: string;
}

/** A crop-specific weather risk rule. Rules without a verifiable source must not exist. */
export interface RiskRule {
  id: string;
  crop: CropType;
  /** Growth stages (as selected manually by the farmer) this rule applies to. */
  growth_stages: GrowthStage[];
  risk_name: string;
  weather_parameter: WeatherParameter;
  /** Human-readable name of the weather condition, e.g. "Maximum temperature". */
  condition_label: string;
  threshold_unit: string;
  tiers: RiskTier[];
  /** Limits of the rule that must be shown with the result. */
  caveats: string[];
  precautionary_action: string;
  precautionary_action_hi?: string;
}

/** A risk the engine cannot evaluate. Reported instead of silently skipped. */
export interface NotAssessedRisk {
  risk_name: string;
  rule_id?: string;
  reason: 'insufficient_data' | 'no_supported_data';
  weather_parameter?: WeatherParameter;
  explanation: string;
}

// ── Risk detection output ─────────────────────────────────────────────────────

/** A risk detected by the deterministic risk engine. */
export interface DetectedRisk {
  rule_id: string;
  risk_name: string;
  severity: RiskSeverity;
  weather_parameter: WeatherParameter;
  /** e.g. "Maximum temperature above 30 °C" */
  weather_condition: string;
  threshold_operator: ThresholdOperator;
  threshold_value: number;
  threshold_unit: string;
  /** Most extreme forecast value among the triggering days, and its date. */
  peak_observed_value: number;
  peak_observed_date: string;
  /** Days on which the reported severity's threshold is crossed. */
  forecast_period: {
    start_date: string;
    end_date: string;
    triggered_dates: string[];
  };
  /** Plain-language explanation of why this risk was flagged. */
  reason: string;
  data_coverage: { days_with_data: number; days_in_forecast: number };
  source: SourceRef;
  severity_basis: string;
  caveats: string[];
  precautionary_action: string;
  precautionary_action_hi?: string;
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

// ── AI advisory (Phase D) ─────────────────────────────────────────────────────

/** Plain-language explanation of ONE risk the deterministic engine detected. */
export interface AiRiskExplanation {
  /** Must match a rule_id in detected_risks. Severity is never restated or changed here. */
  rule_id: string;
  why_it_matters: string;
  crop_impact: string;
  what_to_do: string[];
}

export type AiFallbackReason =
  | 'not_configured'      // no GEMINI_API_KEY
  | 'timeout'
  | 'api_error'           // HTTP error / network error
  | 'blocked'             // Gemini safety block
  | 'invalid_output'      // not valid JSON / wrong shape / truncated
  | 'guardrail_rejected'; // output broke a safety rule (invented number, dosage, chemical…)

export interface AiAdvisory {
  /**
   * 'generated'  → Gemini wrote the explanations and they passed every guardrail
   * 'fallback'   → Gemini unavailable or rejected; explanations built from engine text
   * 'not_needed' → nothing to explain (no risks flagged, or engine could not assess)
   */
  status: 'generated' | 'fallback' | 'not_needed';
  language: Language;
  generated_by: 'gemini' | 'deterministic_fallback' | 'none';
  model?: string;
  fallback_reason?: AiFallbackReason;
  summary: string;
  risks: AiRiskExplanation[];
  /** Fixed text, never written by the model. */
  disclaimer: string;
}

// ── Advisory response ─────────────────────────────────────────────────────────

/** Full response returned by the generate-advisory Edge Function */
export interface AdvisoryResponse {
  farmer_input: FarmerInput;
  weather_summary: WeatherSummary;
  detected_risks: DetectedRisk[];
  not_assessed_risks: NotAssessedRisk[];
  ai_advisory: AiAdvisory | null;     // Phase D output
  ai_fallback: boolean;               // true when Gemini was unavailable or rejected
  advisory_id?: string;               // Supabase row ID if advisory was saved
  consistency_warning?: string;       // Non-fatal: shown when sowing_date and stage seem inconsistent
  generated_at: string;               // ISO timestamp
}
