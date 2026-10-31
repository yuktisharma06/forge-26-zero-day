// =============================================================================
// KisanRakshak — Deterministic Crop Risk Engine (Phase C)
// =============================================================================
//
// Inputs : crop + manually selected growth stage + live daily forecast.
// Output : structured risk results (see RiskEngineResult).
//
// Design rules
//   1. Pure and deterministic: same input → same output. No network, no clock.
//   2. Live data only. Fallback/sample or stale weather → 'insufficient_data'.
//   3. Thresholds live ONLY in wheat-rules.ts / sugarcane-rules.ts and each one
//      is traceable to a source in sources.ts. Nothing is hard-coded here.
//   4. Each rule has ascending severity tiers. The engine reports the highest
//      tier crossed on any forecast day, with the days on which that tier is
//      crossed as the forecast period.
//   5. If a rule's weather parameter is missing for every forecast day, the
//      risk is listed in `not_assessed` (insufficient_data), never silently
//      dropped and never guessed.
//   6. Risks that cannot be supported with available data (e.g. sugarcane water
//      stress) are listed in `not_assessed` (no_supported_data).
//   7. Rainfall never "confirms" waterlogging; see shared-rules.ts.
//
// To change a threshold, edit the rule file and cite a source. Do not add
// logic for a risk here.
// =============================================================================

import type {
  CropType,
  DailyForecast,
  DetectedRisk,
  GrowthStage,
  NotAssessedRisk,
  RiskRule,
  RiskTier,
  ThresholdOperator,
  WeatherParameter,
} from '../types.ts';
import {
  WHEAT_RISK_RULES,
  WHEAT_STAGES,
  WHEAT_UNSUPPORTED_RISKS,
} from './wheat-rules.ts';
import {
  SUGARCANE_RISK_RULES,
  SUGARCANE_STAGES,
  SUGARCANE_UNSUPPORTED_RISKS,
} from './sugarcane-rules.ts';

// =============================================================================
// Public API
// =============================================================================

export interface RiskEngineInput {
  crop: CropType;
  /** Selected by the farmer. Never inferred or overridden. */
  growth_stage: GrowthStage;
  /** Daily forecast from Open-Meteo (live only). */
  daily_forecast: DailyForecast[];
  /** true when the forecast is sample data from the weather fallback. */
  is_fallback: boolean;
  /** true when the forecast dates look out of date (see isWeatherDataStale). */
  is_stale?: boolean;
}

export type RiskEngineStatus =
  | 'ok'                // engine ran; `risks` may be empty (= no risk flagged)
  | 'insufficient_data' // fallback/stale/empty weather, or no rule could be assessed
  | 'no_rules'          // no rules defined for this crop + stage
  | 'invalid_input';    // crop/stage combination is not valid

export interface RiskEngineResult {
  status: RiskEngineStatus;
  /** Human-readable explanation whenever status !== 'ok'. */
  status_message?: string;
  crop: CropType;
  growth_stage: GrowthStage;
  /** First and last forecast dates examined; null when there was no forecast. */
  forecast_window: { start_date: string; end_date: string; days: number } | null;
  /** Risks flagged. Severity is always Low, Moderate or High. */
  detected_risks: DetectedRisk[];
  /** Risks that could not be assessed, with the reason. */
  not_assessed: NotAssessedRisk[];
  rules_evaluated: number;
}

/** Runs the risk engine. Never throws. */
export function runRiskEngine(input: RiskEngineInput): RiskEngineResult {
  const { crop, growth_stage, is_fallback } = input;
  const forecast = Array.isArray(input.daily_forecast) ? input.daily_forecast : [];

  const base = {
    crop,
    growth_stage,
    forecast_window: forecastWindow(forecast),
    detected_risks: [] as DetectedRisk[],
    not_assessed: [] as NotAssessedRisk[],
    rules_evaluated: 0,
  };

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (!isValidCropStage(crop, growth_stage)) {
    return {
      ...base,
      status: 'invalid_input',
      status_message: `'${growth_stage}' is not a valid growth stage for ${crop}.`,
    };
  }

  if (is_fallback) {
    return {
      ...base,
      status: 'insufficient_data',
      status_message:
        'Risk assessment needs a live weather forecast. Only sample data is available right now, so no risks were assessed. Please try again later.',
    };
  }

  if (input.is_stale) {
    return {
      ...base,
      status: 'insufficient_data',
      status_message:
        'The forecast appears to be out of date, so no risks were assessed. Please try again later.',
    };
  }

  if (forecast.length === 0) {
    return {
      ...base,
      status: 'insufficient_data',
      status_message:
        'The weather service returned no forecast days, so no risks were assessed.',
    };
  }

  // ── Select rules for this crop and stage ───────────────────────────────────
  const allRules = crop === 'wheat' ? WHEAT_RISK_RULES : SUGARCANE_RISK_RULES;
  const rules = allRules.filter(
    (r) => r.crop === crop && r.growth_stages.includes(growth_stage),
  );

  const unsupported: NotAssessedRisk[] = (
    crop === 'wheat' ? WHEAT_UNSUPPORTED_RISKS : SUGARCANE_UNSUPPORTED_RISKS
  )
    .filter((u) => (u.stages as GrowthStage[]).includes(growth_stage))
    .map((u) => ({
      risk_name: u.risk_name,
      reason: 'no_supported_data' as const,
      explanation: u.explanation,
    }));

  if (rules.length === 0) {
    return {
      ...base,
      not_assessed: unsupported,
      status: 'no_rules',
      status_message: `No verified risk rules exist for ${crop} at the '${growth_stage}' stage.`,
    };
  }

  // ── Evaluate ───────────────────────────────────────────────────────────────
  const detected: DetectedRisk[] = [];
  const notAssessed: NotAssessedRisk[] = [];

  for (const rule of rules) {
    const result = evaluateRule(rule, forecast, growth_stage);
    if (result.kind === 'triggered') {
      detected.push(result.risk);
    } else if (result.kind === 'insufficient_data') {
      notAssessed.push({
        risk_name: rule.risk_name,
        rule_id: rule.id,
        reason: 'insufficient_data',
        weather_parameter: rule.weather_parameter,
        explanation: `The forecast has no usable '${rule.weather_parameter}' values, so this risk could not be assessed.`,
      });
    }
  }

  notAssessed.push(...unsupported);

  // Nothing could be assessed at all → say so instead of implying "no risk".
  if (notAssessed.filter((n) => n.reason === 'insufficient_data').length === rules.length) {
    return {
      ...base,
      rules_evaluated: rules.length,
      not_assessed: notAssessed,
      status: 'insufficient_data',
      status_message:
        'The forecast is missing every weather value needed for this crop and stage, so no risks could be assessed.',
    };
  }

  detected.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  return {
    ...base,
    rules_evaluated: rules.length,
    detected_risks: detected,
    not_assessed: notAssessed,
    status: 'ok',
  };
}

// =============================================================================
// Internals
// =============================================================================

const SEVERITY_RANK = { Low: 1, Moderate: 2, High: 3 } as const;

const STAGE_LABELS: Partial<Record<GrowthStage, string>> = {
  early_growth: 'early growth',
  crown_root: 'crown root initiation',
  vegetative_growth: 'vegetative growth',
  reproductive: 'reproductive (booting–flowering)',
  grain_development_maturity: 'grain development / maturity',
  germination: 'germination',
  tillering: 'tillering',
  grand_growth: 'grand growth',
  maturity_ripening: 'maturity / ripening',
};

const OPERATOR_TEXT: Record<ThresholdOperator, string> = {
  gt: 'above',
  gte: 'at or above',
  lt: 'below',
  lte: 'at or below',
};

type RuleEvaluation =
  | { kind: 'triggered'; risk: DetectedRisk }
  | { kind: 'not_triggered' }
  | { kind: 'insufficient_data' };

export function isValidCropStage(crop: CropType, stage: GrowthStage): boolean {
  if (crop === 'wheat') return (WHEAT_STAGES as GrowthStage[]).includes(stage);
  if (crop === 'sugarcane') return (SUGARCANE_STAGES as GrowthStage[]).includes(stage);
  return false;
}

function forecastWindow(f: DailyForecast[]) {
  if (f.length === 0) return null;
  return { start_date: f[0].date, end_date: f[f.length - 1].date, days: f.length };
}

/**
 * Evaluates one rule over the whole forecast.
 * Reports the HIGHEST tier crossed on any day; the forecast period is the set
 * of days on which that tier is crossed.
 */
function evaluateRule(
  rule: RiskRule,
  forecast: DailyForecast[],
  stage: GrowthStage,
): RuleEvaluation {
  const readings = forecast
    .map((day) => ({ date: day.date, value: readParameter(day, rule.weather_parameter) }))
    .filter((r): r is { date: string; value: number } => r.value !== null);

  if (readings.length === 0) return { kind: 'insufficient_data' };

  // Highest-severity tier that at least one day crosses.
  let matched: RiskTier | null = null;
  for (const tier of rule.tiers) {
    const crossed = readings.some((r) =>
      thresholdMet(r.value, tier.threshold_operator, tier.threshold_value),
    );
    if (crossed && (matched === null || SEVERITY_RANK[tier.severity] > SEVERITY_RANK[matched.severity])) {
      matched = tier;
    }
  }
  if (matched === null) return { kind: 'not_triggered' };

  const triggered = readings.filter((r) =>
    thresholdMet(r.value, matched!.threshold_operator, matched!.threshold_value),
  );
  const lowSide = matched.threshold_operator === 'lt' || matched.threshold_operator === 'lte';
  const peak = triggered.reduce((best, r) =>
    (lowSide ? r.value < best.value : r.value > best.value) ? r : best,
  );

  const triggeredDates = triggered.map((r) => r.date);
  const weatherCondition =
    `${rule.condition_label} ${OPERATOR_TEXT[matched.threshold_operator]} ` +
    `${matched.threshold_value} ${rule.threshold_unit}`;

  const reason = buildReason({
    rule,
    tier: matched,
    stage,
    weatherCondition,
    triggeredDates,
    peak,
    lowSide,
  });

  return {
    kind: 'triggered',
    risk: {
      rule_id: rule.id,
      risk_name: rule.risk_name,
      severity: matched.severity,
      weather_parameter: rule.weather_parameter,
      weather_condition: weatherCondition,
      threshold_operator: matched.threshold_operator,
      threshold_value: matched.threshold_value,
      threshold_unit: rule.threshold_unit,
      peak_observed_value: peak.value,
      peak_observed_date: peak.date,
      forecast_period: {
        start_date: triggeredDates[0],
        end_date: triggeredDates[triggeredDates.length - 1],
        triggered_dates: triggeredDates,
      },
      reason,
      data_coverage: { days_with_data: readings.length, days_in_forecast: forecast.length },
      source: matched.source,
      severity_basis: matched.severity_basis,
      caveats: rule.caveats,
      precautionary_action: rule.precautionary_action,
      precautionary_action_hi: rule.precautionary_action_hi,
    },
  };
}

function buildReason(a: {
  rule: RiskRule;
  tier: RiskTier;
  stage: GrowthStage;
  weatherCondition: string;
  triggeredDates: string[];
  peak: { date: string; value: number };
  lowSide: boolean;
}): string {
  const { rule, tier, stage, triggeredDates, peak, lowSide } = a;
  const days = triggeredDates.length;
  const when =
    days === 1
      ? `on ${triggeredDates[0]}`
      : `on ${days} forecast days (${triggeredDates[0]} to ${triggeredDates[days - 1]})`;
  const extreme = lowSide ? 'lowest' : 'highest';
  const parts = [
    `${a.weatherCondition} is forecast ${when}; the ${extreme} value is ` +
      `${peak.value} ${rule.threshold_unit} on ${peak.date}. ` +
      `The selected growth stage is ${STAGE_LABELS[stage] ?? stage}.`,
    tier.severity_basis,
  ];
  if (rule.weather_parameter === 'precipitation_mm') {
    parts.push('This flags a heavy-rainfall event only; rainfall alone does not confirm waterlogging.');
  }
  return parts.join(' ');
}

/** Reads one parameter from a forecast day; null when missing or not a finite number. */
function readParameter(day: DailyForecast, param: WeatherParameter): number | null {
  let v: number | null;
  switch (param) {
    case 'max_temp_c': v = day.max_temp_c; break;
    case 'min_temp_c': v = day.min_temp_c; break;
    case 'precipitation_mm': v = day.precipitation_mm; break;
    case 'precipitation_probability_pct': v = day.precipitation_probability_pct; break;
    case 'humidity_pct': v = day.humidity_pct; break;
    case 'wind_speed_kmh': v = day.wind_speed_kmh; break;
    default: return null;
  }
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function thresholdMet(value: number, op: ThresholdOperator, threshold: number): boolean {
  switch (op) {
    case 'gt': return value > threshold;
    case 'lt': return value < threshold;
    case 'gte': return value >= threshold;
    case 'lte': return value <= threshold;
    default: return false;
  }
}
