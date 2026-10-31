// =============================================================================
// KisanRakshak — Deterministic Crop Risk Engine
// =============================================================================
//
// Entry point for Phase C.
//
// Design rules:
//   1. Only evaluates rules against LIVE weather data (is_fallback === false).
//      If fallback data is provided, the engine returns an 'insufficient_data'
//      result rather than running rules against fabricated values.
//   2. Each rule is evaluated against every day in the forecast window.
//      The first triggering day sets trigger_date and observed_value.
//   3. Severity assignment:
//      - 'validated'            → rule's risk_severity (Low / Moderate / High)
//      - 'research_observation' → 'Potential Risk'
//      - 'pending_validation'   → 'Potential Risk'
//   4. A rule fires at most once per assessment (on the earliest trigger day).
//   5. If the required weather parameter is null for ALL days in the forecast,
//      a single 'Insufficient Data' entry is appended for that rule.
//      This replaces fabricated or silent omission.
//   6. Do NOT claim that rainfall alone confirms waterlogging.
//      Rainfall-based rules use pending_validation status and the precautionary
//      action text must not use the word "confirmed waterlogging".
//
// Sources are stored in the rule definitions (wheat-rules.ts / sugarcane-rules.ts).
// DO NOT add rules here — add them to the appropriate rules file.
// =============================================================================

import type {
  CropType,
  DailyForecast,
  DetectedRisk,
  GrowthStage,
  RiskRule,
  ThresholdOperator,
  WeatherParameter,
} from '../types.ts';
import { WHEAT_RISK_RULES } from './wheat-rules.ts';
import { SUGARCANE_RISK_RULES } from './sugarcane-rules.ts';

// =============================================================================
// Public API
// =============================================================================

export interface RiskEngineInput {
  crop: CropType;
  growth_stage: GrowthStage;
  /** Full 7-day daily forecast from Open-Meteo (live only). */
  daily_forecast: DailyForecast[];
  /**
   * Set to true when the forecast came from the fallback sample data.
   * The engine refuses to run rules against fabricated weather values
   * and returns a single insufficient-data sentinel instead.
   */
  is_fallback: boolean;
}

export interface RiskEngineResult {
  detected_risks: DetectedRisk[];
  /**
   * 'ok'               → engine ran normally; detected_risks may be empty (no risk)
   * 'insufficient_data' → engine could not run (fallback data or empty forecast)
   * 'no_rules'         → no rules are defined for this crop + stage combination
   */
  status: 'ok' | 'insufficient_data' | 'no_rules';
  /** Human-readable explanation when status !== 'ok'. */
  status_message?: string;
}

/**
 * Runs the deterministic risk engine for the given crop, growth stage, and
 * weather forecast.
 *
 * Never throws — all errors are captured in the returned status field.
 */
export function runRiskEngine(input: RiskEngineInput): RiskEngineResult {
  const { crop, growth_stage, daily_forecast, is_fallback } = input;

  // ── Guard: fallback data ────────────────────────────────────────────────────
  // Running rules against fabricated weather values would produce misleading
  // risk alerts. Return an explicit insufficient-data status instead.
  if (is_fallback) {
    return {
      detected_risks: [],
      status: 'insufficient_data',
      status_message:
        'Risk assessment requires live weather data. ' +
        'The weather service is currently unavailable. ' +
        'Please try again when a live forecast can be fetched.',
    };
  }

  // ── Guard: empty forecast ───────────────────────────────────────────────────
  if (!daily_forecast || daily_forecast.length === 0) {
    return {
      detected_risks: [],
      status: 'insufficient_data',
      status_message:
        'No forecast days were returned by the weather service. ' +
        'Risk assessment cannot be performed without forecast data.',
    };
  }

  // ── Select rules for this crop + growth stage ───────────────────────────────
  const allRules: RiskRule[] =
    crop === 'wheat' ? WHEAT_RISK_RULES : SUGARCANE_RISK_RULES;

  const applicableRules = allRules.filter(
    (rule) => rule.crop === crop && rule.growth_stage === growth_stage,
  );

  if (applicableRules.length === 0) {
    return {
      detected_risks: [],
      status: 'no_rules',
      status_message:
        `No risk rules are defined for ${crop} at the '${growth_stage}' growth stage. ` +
        'This stage may not yet have verified agricultural thresholds.',
    };
  }

  // ── Evaluate each applicable rule ───────────────────────────────────────────
  const detected: DetectedRisk[] = [];

  for (const rule of applicableRules) {
    const result = evaluateRule(rule, daily_forecast);

    if (result.type === 'triggered') {
      // Assign severity based on validation status
      const severity =
        rule.validation_status === 'validated'
          ? rule.risk_severity
          : 'Potential Risk';

      detected.push({
        rule_id: rule.id,
        risk_name: rule.risk_name,
        severity,
        validation_status: rule.validation_status,
        weather_parameter: rule.weather_parameter,
        observed_value: result.observed_value,
        threshold_value: rule.threshold_value,
        threshold_operator: rule.threshold_operator,
        threshold_unit: rule.threshold_unit,
        trigger_date: result.trigger_date,
        source: rule.source,
        source_url: rule.source_url,
        precautionary_action: rule.precautionary_action,
        precautionary_action_hi: rule.precautionary_action_hi,
        notes: rule.notes,
      });
    } else if (result.type === 'insufficient_data') {
      // The required weather parameter was null for every forecast day.
      // Report this explicitly rather than silently skipping the rule.
      detected.push({
        rule_id: rule.id,
        risk_name: rule.risk_name,
        severity: 'Insufficient Data',
        validation_status: rule.validation_status,
        weather_parameter: rule.weather_parameter,
        observed_value: NaN,
        threshold_value: rule.threshold_value,
        threshold_operator: rule.threshold_operator,
        threshold_unit: rule.threshold_unit,
        trigger_date: '',
        source: rule.source,
        source_url: rule.source_url,
        precautionary_action: rule.precautionary_action,
        precautionary_action_hi: rule.precautionary_action_hi,
        notes:
          `The weather parameter '${rule.weather_parameter}' was not available ` +
          'in the forecast. This risk could not be assessed.',
      });
    }
    // result.type === 'not_triggered' → rule did not fire; omit silently
  }

  return {
    detected_risks: detected,
    status: 'ok',
  };
}

// =============================================================================
// Internal helpers
// =============================================================================

type EvaluationResult =
  | { type: 'triggered'; observed_value: number; trigger_date: string }
  | { type: 'not_triggered' }
  | { type: 'insufficient_data' };

/**
 * Evaluates a single risk rule against the full forecast window.
 *
 * - Returns 'triggered' with the EARLIEST day that crosses the threshold.
 * - Returns 'insufficient_data' when the required parameter is null for ALL days.
 * - Returns 'not_triggered' when no day crosses the threshold.
 */
function evaluateRule(rule: RiskRule, forecast: DailyForecast[]): EvaluationResult {
  let hasAnyData = false;

  for (const day of forecast) {
    const value = getDayParameter(day, rule.weather_parameter);

    if (value === null) continue; // parameter missing for this day

    hasAnyData = true;

    if (thresholdMet(value, rule.threshold_operator, rule.threshold_value)) {
      return {
        type: 'triggered',
        observed_value: value,
        trigger_date: day.date,
      };
    }
  }

  if (!hasAnyData) {
    return { type: 'insufficient_data' };
  }

  return { type: 'not_triggered' };
}

/**
 * Extracts the value of the given WeatherParameter from a DailyForecast.
 * Returns null when the value is missing.
 */
function getDayParameter(
  day: DailyForecast,
  param: WeatherParameter,
): number | null {
  switch (param) {
    case 'max_temp_c':                    return day.max_temp_c;
    case 'min_temp_c':                    return day.min_temp_c;
    case 'precipitation_mm':              return day.precipitation_mm;
    case 'precipitation_probability_pct': return day.precipitation_probability_pct;
    case 'humidity_pct':                  return day.humidity_pct;
    case 'wind_speed_kmh':                return day.wind_speed_kmh;
    default:
      // Exhaustive-check guard — if a new WeatherParameter is added to
      // types.ts without updating this switch, TypeScript will catch it.
      return null;
  }
}

/**
 * Checks whether a measured value satisfies the threshold condition.
 *
 * Operators:
 *   'gt'  → value > threshold   (strictly greater than)
 *   'lt'  → value < threshold   (strictly less than)
 *   'gte' → value >= threshold
 *   'lte' → value <= threshold
 */
function thresholdMet(
  value: number,
  operator: ThresholdOperator,
  threshold: number,
): boolean {
  switch (operator) {
    case 'gt':  return value > threshold;
    case 'lt':  return value < threshold;
    case 'gte': return value >= threshold;
    case 'lte': return value <= threshold;
    default:    return false;
  }
}
