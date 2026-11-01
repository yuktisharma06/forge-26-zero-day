// =============================================================================
// Response building for crop-advisory (pure functions, no network)
// =============================================================================
// Turns the risk engine's DetectedRisk objects into the shape in
// docs/api-contract.md, and builds plain-text advisories for the cases where
// Gemini is not used (no risks, insufficient data, or Gemini unavailable).
// =============================================================================

import type { WarningGroup } from '../weather-warnings/index.ts';
import type {
  CropType,
  DetectedRisk,
  GrowthStage,
  Language,
  WeatherSummary,
} from '../types.ts';
import {
  CROP_LABEL,
  DISCLAIMER,
  INSUFFICIENT_MESSAGE,
  type InsufficientReason,
  OPERATOR_PHRASE,
  PARAM_LABEL,
  STAGE_LABEL,
} from './labels.ts';
import type { GeminiExplanation } from './gemini.ts';

export type ApiSeverity = 'low' | 'moderate' | 'high';

/** Source of the threshold that was crossed. `title` and `url` match docs/api-contract.md. */
export interface SourceView {
  title: string;
  url: string | null;
  /** What the source itself says (one sentence). */
  citation: string;
  /** 'official_classification' | 'extension_guidance' | 'research_literature' */
  evidenceType: string;
  /** How well the source transfers to this farmer's situation. */
  applicabilityNote: string | null;
}

export interface RiskView {
  id: string;
  name: string;
  /** Always assigned by the deterministic engine, never by Gemini. */
  severity: ApiSeverity;
  weatherCondition: string;
  forecastPeriod: string;
  /** The individual forecast days on which the threshold is crossed. */
  triggeredDates: string[];
  peakValue: number;
  peakDate: string;
  reason: string;
  /** Why this threshold maps to this severity label. */
  severityBasis: string;
  /** Limits of the rule that the frontend should show with the risk. */
  caveats: string[];
  preventiveAction: string;
  source: SourceView;
}

export interface AdvisoryView {
  summary: string;
  actions: string[];
  language: Language;
  /** 'ai' = written by Gemini, 'rules' = built from the rule texts */
  writtenBy: 'ai' | 'rules';
  disclaimer: string;
}

// ── Weather ──────────────────────────────────────────────────────────────────

export function toWeatherBlock(
  weather: WeatherSummary,
  isSample: boolean,
  warnings: string[],
  note: string | null,
) {
  return {
    source: 'Open-Meteo',
    // 'sample' means Open-Meteo could not be reached and the numbers are NOT real.
    dataStatus: isSample ? 'sample' : 'live',
    timezone: 'Asia/Kolkata',
    fetchedAt: weather.fetched_at,
    forecastDays: weather.daily.length,
    startDate: weather.daily[0]?.date ?? null,
    endDate: weather.daily[weather.daily.length - 1]?.date ?? null,
    dailyForecast: weather.daily.map((d) => ({
      date: d.date,
      temperatureMaxC: d.max_temp_c,
      temperatureMinC: d.min_temp_c,
      precipitationMm: d.precipitation_mm,
      precipitationProbabilityPct: d.precipitation_probability_pct,
      humidityPercent: d.humidity_pct, // daily mean
      windSpeedKmh: d.wind_speed_kmh, // daily maximum
    })),
    warnings,
    note,
  };
}

// ── Risk helpers ─────────────────────────────────────────────────────────────

function dayNumber(isoDate: string): number {
  return Math.round(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);
}

export function formatPeriod(dates: string[], lang: Language): string {
  if (dates.length === 0) return '';
  if (dates.length === 1) return dates[0];
  const contiguous = dates.every((d, i) => i === 0 || dayNumber(d) - dayNumber(dates[i - 1]) === 1);
  if (contiguous) {
    return lang === 'hi'
      ? `${dates[0]} से ${dates[dates.length - 1]}`
      : `${dates[0]} to ${dates[dates.length - 1]}`;
  }
  return dates.join(', ');
}

export function describeCondition(risk: DetectedRisk, lang: Language): string {
  const label = PARAM_LABEL[risk.weather_parameter][lang];
  const op = OPERATOR_PHRASE[risk.threshold_operator][lang];
  const amount = `${risk.threshold_value} ${risk.threshold_unit}`;
  return lang === 'hi' ? `${label} ${amount} ${op}` : `${label} ${op} ${amount}`;
}

function deterministicReason(risk: DetectedRisk, period: string, lang: Language): string {
  const label = PARAM_LABEL[risk.weather_parameter][lang];
  const unit = risk.threshold_unit.replace('mm/day', 'mm');
  const peak = `${risk.peak_observed_value} ${unit}`;
  const rain = risk.weather_parameter === 'precipitation_mm';

  if (lang === 'hi') {
    const first = `पूर्वानुमान में ${period} के दौरान ${label} ${peak} तक पहुंच सकता है, जो संदर्भ स्तर (${risk.threshold_value} ${risk.threshold_unit}) को पार करता है।`;
    const second = `यह स्तर इस स्रोत पर आधारित है: ${risk.source.name}। यह केवल एक संभावित जोखिम का संकेत है, नुकसान की पुष्टि नहीं।`;
    const third = rain ? ' केवल बारिश से खेत में जलभराव की पुष्टि नहीं होती।' : '';
    return `${first} ${second}${third}`;
  }
  const first = `The forecast shows ${label.toLowerCase()} reaching ${peak} during ${period}, which crosses the reference level (${risk.threshold_value} ${risk.threshold_unit}) used for this crop stage.`;
  const second = `The level is based on: ${risk.source.name}. It is a screening signal for a possible risk, not confirmed crop damage.`;
  const third = rain ? ' Rainfall alone does not confirm waterlogging in the field.' : '';
  return `${first} ${second}${third}`;
}

export function toSourceView(risk: DetectedRisk): SourceView {
  return {
    title: risk.source.name,
    url: risk.source.url ?? null,
    citation: risk.source.citation,
    evidenceType: risk.source.evidence_type,
    applicabilityNote: risk.source.applicability_note ?? null,
  };
}

export function toRiskView(
  risk: DetectedRisk,
  lang: Language,
  ai?: { title: string; reason: string },
): RiskView {
  const dates = risk.forecast_period.triggered_dates;
  const period = formatPeriod(dates, lang);

  return {
    id: risk.rule_id,
    name: ai?.title ?? risk.risk_name,
    severity: risk.severity.toLowerCase() as ApiSeverity,
    weatherCondition: describeCondition(risk, lang),
    forecastPeriod: period,
    triggeredDates: dates,
    peakValue: risk.peak_observed_value,
    peakDate: risk.peak_observed_date,
    reason: ai?.reason ?? deterministicReason(risk, period, lang),
    severityBasis: risk.severity_basis,
    caveats: risk.caveats,
    preventiveAction:
      lang === 'hi' ? (risk.precautionary_action_hi ?? risk.precautionary_action) : risk.precautionary_action,
    source: toSourceView(risk),
  };
}

// ── Advisory text ────────────────────────────────────────────────────────────

function uniqueActions(risks: RiskView[]): string[] {
  return [...new Set(risks.map((r) => r.preventiveAction))].slice(0, 6);
}

export function advisoryFromRules(
  risks: RiskView[],
  crop: CropType,
  stage: GrowthStage,
  lang: Language,
): AdvisoryView {
  const crops = CROP_LABEL[crop][lang];
  const stageName = STAGE_LABEL[stage][lang];
  const n = risks.length;
  const summary = lang === 'hi'
    ? `आपके ${crops} (${stageName}) के लिए पूर्वानुमान में ${n} संभावित मौसम जोखिम मिले हैं। विवरण और सुझाव नीचे देखें।`
    : `The forecast shows ${n} possible weather risk${n === 1 ? '' : 's'} for your ${crops} at the ${stageName} stage. See the details and suggestions below.`;
  return {
    summary,
    actions: uniqueActions(risks),
    language: lang,
    writtenBy: 'rules',
    disclaimer: DISCLAIMER[lang],
  };
}

/** Rule-written advisory for informational weather warnings (no crop-damage claims). */
export function advisoryFromWarnings(
  groups: WarningGroup[],
  crop: CropType,
  stage: GrowthStage,
  lang: Language,
): AdvisoryView {
  const crops = CROP_LABEL[crop][lang];
  const stageName = STAGE_LABEL[stage][lang];
  const items = groups.map((g) => `${g.name} (${formatPeriod(g.dates, lang)})`).join(lang === 'hi' ? '; ' : '; ');
  const summary = lang === 'hi'
    ? `आपके ${crops} (${stageName}) के लिए पूर्वानुमान में मौसम चेतावनी: ${items}। ये केवल मौसम की चेतावनियां हैं, फसल को नुकसान की पुष्टि नहीं।`
    : `Weather alerts in the forecast for your ${crops} at the ${stageName} stage: ${items}. These are weather alerts, not confirmed crop damage.`;
  return {
    summary,
    actions: warningActions(groups),
    language: lang,
    writtenBy: 'rules',
    disclaimer: DISCLAIMER[lang],
  };
}

export function warningActions(groups: WarningGroup[]): string[] {
  return [...new Set(groups.map((g) => g.action))].slice(0, 6);
}

export function advisoryFromAi(
  risks: RiskView[],
  explanation: GeminiExplanation,
  lang: Language,
  fallbackActions: string[] = [],
): AdvisoryView {
  return {
    summary: explanation.summary,
    actions: explanation.actions.length > 0
      ? explanation.actions
      : (risks.length > 0 ? uniqueActions(risks) : fallbackActions),
    language: lang,
    writtenBy: 'ai',
    disclaimer: DISCLAIMER[lang],
  };
}

export function advisoryNoRisk(
  crop: CropType,
  stage: GrowthStage,
  days: number,
  lang: Language,
): AdvisoryView {
  const crops = CROP_LABEL[crop][lang];
  const stageName = STAGE_LABEL[stage][lang];
  const summary = lang === 'hi'
    ? `अगले ${days} दिनों के पूर्वानुमान में आपके ${crops} (${stageName}) के लिए कोई मौसम चेतावनी नहीं मिली। इसका मतलब यह नहीं कि कोई जोखिम नहीं है: कुछ स्थितियों का आकलन उपलब्ध आंकड़ों से संभव नहीं है (नीचे सूची देखें)। पूर्वानुमान पर नजर रखें।`
    : `No weather alerts were found in the next ${days} days of the forecast for your ${crops} at the ${stageName} stage. This does not mean there is no risk: some conditions cannot be assessed from the available data (see the list). Keep watching the forecast.`;
  return { summary, actions: [], language: lang, writtenBy: 'rules', disclaimer: DISCLAIMER[lang] };
}

export function advisoryInsufficient(reason: InsufficientReason, lang: Language): AdvisoryView {
  return {
    summary: INSUFFICIENT_MESSAGE[reason][lang],
    actions: [],
    language: lang,
    writtenBy: 'rules',
    disclaimer: DISCLAIMER[lang],
  };
}
