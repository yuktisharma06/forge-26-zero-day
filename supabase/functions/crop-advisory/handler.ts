// =============================================================================
// crop-advisory - main endpoint (Phase E)
// =============================================================================
// Combines: farmer input -> location -> Open-Meteo weather -> deterministic risk
// engine -> Gemini explanation -> one structured response (docs/api-contract.md).
//
// Rules this file enforces:
//   - The risk engine alone decides which risks exist and their severity.
//   - Gemini only explains; if it fails or is rejected, rule-based text is used.
//   - Sample (fallback) weather never goes into the risk engine.
//   - Secrets are read from Deno.env and never returned or logged.
// =============================================================================

import { corsHeaders } from '../_shared/cors.ts';
import type { CropType, GrowthStage, Language } from '../_shared/types.ts';
import {
  fetchWeatherForecastWithFallback,
  isWeatherDataStale,
  weatherDataCompletenessRatio,
} from '../_shared/weather/openmeteo.ts';
import { geocodeLocation } from '../_shared/geocoding/openmeteo-geocoding.ts';
import { runRiskEngine, type RiskEngineResult } from '../_shared/risk-engine/index.ts';
import { CROP_LABEL, STAGE_LABEL, type InsufficientReason } from '../_shared/advisory/labels.ts';
import { explainRisks, type ExplainArgs, type ExplainResult } from '../_shared/advisory/gemini.ts';
import {
  advisoryFromAi,
  advisoryFromRules,
  advisoryFromWarnings,
  advisoryInsufficient,
  advisoryNoRisk,
  toRiskView,
  toWeatherBlock,
  warningActions,
  type RiskView,
} from '../_shared/advisory/build.ts';
import { evaluateWeatherWarnings, groupWarnings } from '../_shared/weather-warnings/index.ts';
import { notAssessedFor } from '../_shared/not-assessed/index.ts';

// ── Dependencies (injectable so tests need no network) ───────────────────────

export interface Deps {
  fetchWeather: typeof fetchWeatherForecastWithFallback;
  geocode: typeof geocodeLocation;
  explain: (args: ExplainArgs) => Promise<ExplainResult>;
  env: (name: string) => string | undefined;
}

export const defaultDeps: Deps = {
  fetchWeather: fetchWeatherForecastWithFallback,
  geocode: geocodeLocation,
  explain: explainRisks,
  env: (name) => Deno.env.get(name),
};

// ── Input validation ─────────────────────────────────────────────────────────

const WHEAT_STAGES: GrowthStage[] = [
  'early_growth', 'crown_root', 'vegetative_growth', 'reproductive', 'grain_development_maturity',
];
const SUGARCANE_STAGES: GrowthStage[] = ['germination', 'tillering', 'grand_growth', 'maturity_ripening'];

// The contract example uses "CRI"; the code's canonical ID is "crown_root".
const STAGE_ALIASES: Record<string, GrowthStage> = {
  cri: 'crown_root',
  crown_root_initiation: 'crown_root',
};

function normaliseStage(raw: unknown): string {
  const s = String(raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return STAGE_ALIASES[s] ?? s;
}

interface ValidInput {
  location: string;
  crop: CropType;
  stage: GrowthStage;
  language: Language;
  sowingDate: string | null;
  coords: { latitude: number; longitude: number } | null;
}

function validate(body: Record<string, unknown>): { ok: true; input: ValidInput } | { ok: false; message: string } {
  const location = typeof body.location === 'string' ? body.location.trim() : '';
  if (location === '' || location.length > 120) {
    return { ok: false, message: 'location is required (up to 120 characters).' };
  }

  const crop = body.crop;
  if (crop !== 'wheat' && crop !== 'sugarcane') {
    return { ok: false, message: "crop must be 'wheat' or 'sugarcane'." };
  }

  const stage = normaliseStage(body.growthStage ?? body.growth_stage);
  if (stage === '') return { ok: false, message: 'growthStage is required.' };
  const allowed = crop === 'wheat' ? WHEAT_STAGES : SUGARCANE_STAGES;
  if (!(allowed as string[]).includes(stage)) {
    return { ok: false, message: `growthStage '${String(body.growthStage ?? body.growth_stage)}' is not valid for ${crop}. Valid values: ${allowed.join(', ')}.` };
  }

  const language = body.language ?? 'en';
  if (language !== 'en' && language !== 'hi') {
    return { ok: false, message: "language must be 'en' or 'hi'." };
  }

  const sowingRaw = body.sowingDate ?? body.sowing_date;
  let sowingDate: string | null = null;
  if (sowingRaw !== undefined && sowingRaw !== null && sowingRaw !== '') {
    if (typeof sowingRaw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(sowingRaw) || Number.isNaN(Date.parse(sowingRaw))) {
      return { ok: false, message: 'sowingDate must be a valid date in YYYY-MM-DD format.' };
    }
    sowingDate = sowingRaw;
  }

  let coords: ValidInput['coords'] = null;
  const lat = body.latitude;
  const lon = body.longitude;
  if (lat !== undefined || lon !== undefined) {
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return { ok: false, message: 'latitude and longitude must both be numbers.' };
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return { ok: false, message: 'latitude or longitude is out of range.' };
    }
    // (0, 0) is treated as "not provided" so the location name is used instead.
    if (!(lat === 0 && lon === 0)) coords = { latitude: lat, longitude: lon };
  }

  return { ok: true, input: { location, crop, stage: stage as GrowthStage, language, sowingDate, coords } };
}

// ── Response helpers ─────────────────────────────────────────────────────────

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type ErrorCode =
  | 'INVALID_INPUT'
  | 'LOCATION_NOT_FOUND'
  | 'WEATHER_API_ERROR'
  | 'AI_SERVICE_ERROR'
  | 'INTERNAL_SERVER_ERROR';

function fail(status: number, code: ErrorCode, message: string): Response {
  return json(status, { success: false, error: { code, message } });
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function handleRequest(req: Request, deps: Deps = defaultDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return fail(405, 'INVALID_INPUT', 'Method not allowed. Use POST.');

  try {
    let body: Record<string, unknown>;
    try {
      const parsed = await req.json();
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('not an object');
      body = parsed as Record<string, unknown>;
    } catch {
      return fail(400, 'INVALID_INPUT', 'Request body must be a JSON object.');
    }

    const checked = validate(body);
    if (!checked.ok) return fail(400, 'INVALID_INPUT', checked.message);
    const { location, crop, stage, language, sowingDate, coords } = checked.input;

    // ── 1. Location -> coordinates ──────────────────────────────────────────
    let latitude: number;
    let longitude: number;
    let locationName = location;
    if (coords) {
      latitude = coords.latitude;
      longitude = coords.longitude;
    } else {
      try {
        const geo = await deps.geocode(location);
        latitude = geo.latitude;
        longitude = geo.longitude;
        locationName = geo.name;
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.startsWith('Location not found')) return fail(404, 'LOCATION_NOT_FOUND', msg);
        return fail(502, 'WEATHER_API_ERROR', 'Could not look up the location right now. Please try again.');
      }
    }

    // ── 2. Weather (never throws; may return labelled sample data) ──────────
    const wr = await deps.fetchWeather({ latitude, longitude, locationName, forecastDays: 7 });
    const weather = wr.weather;
    const isSample = wr.is_fallback;

    const weatherDataWarnings: string[] = [];
    let weatherNote: string | null = null;
    let stale = false;
    if (isSample) {
      weatherNote =
        'Live weather could not be fetched. The figures shown are sample data for demonstration only and do NOT reflect real conditions.';
    } else {
      stale = isWeatherDataStale(weather);
      if (stale) weatherDataWarnings.push('Weather data appears out of date.');
      const missing = weatherDataCompletenessRatio(weather);
      if (missing > 0.3) {
        weatherDataWarnings.push(`${Math.round(missing * 100)}% of weather values are missing. Reliability may be reduced.`);
      }
    }

    // ── 3. Deterministic assessment (live, fresh weather only) ──────────────
    // Three separate outputs:
    //   risks            validated crop risks with Low/Moderate/High severity
    //   weatherWarnings  informational alerts, no severity, no damage claims
    //   notAssessedRisks conditions the available data cannot assess
    let insufficient: InsufficientReason | null = null;
    let engine: RiskEngineResult | null = null;
    if (isSample) insufficient = 'sample_weather';
    else if (stale) insufficient = 'stale_weather';
    else {
      engine = runRiskEngine({ crop, growth_stage: stage, daily_forecast: weather.daily, is_fallback: false });
      if (engine.status === 'invalid_input') {
        return fail(400, 'INVALID_INPUT', engine.status_message ?? 'Invalid crop or growth stage.');
      }
      if (engine.status === 'insufficient_data') {
        insufficient = weather.daily.length === 0 ? 'no_forecast' : 'unassessable';
      }
    }

    const triggered = engine ? engine.detected_risks : [];

    const warningResult = insufficient
      ? { warnings: [], daysWithMissingData: 0 }
      : evaluateWeatherWarnings({
          crop,
          growth_stage: stage,
          daily_forecast: weather.daily,
          is_fallback: false,
          is_stale: false,
          language,
        });
    const weatherWarnings = warningResult.warnings;
    const warningGroups = groupWarnings(weatherWarnings, language);

    const notAssessed = insufficient ? [] : notAssessedFor(crop, stage, language);

    const notes: string[] = [];
    if (!insufficient && warningResult.daysWithMissingData > 0) {
      notes.push(
        language === 'hi'
          ? `${warningResult.daysWithMissingData} दिन के कुछ मौसम आंकड़े उपलब्ध नहीं थे, इसलिए उन दिनों की जांच छोड़ दी गई।`
          : `Some weather values were missing on ${warningResult.daysWithMissingData} forecast day(s), so those checks were skipped for those days.`,
      );
    }

    const base = {
      success: true,
      crop,
      growthStage: stage,
      sowingDate,
      location: { name: locationName, latitude, longitude },
      weather: toWeatherBlock(weather, isSample, weatherDataWarnings, weatherNote),
      notes,
      notAssessedRisks: notAssessed,
      generatedAt: new Date().toISOString(),
    };

    // ── Case A: could not assess ────────────────────────────────────────────
    if (insufficient) {
      return json(200, {
        ...base,
        assessmentStatus: 'insufficient_data',
        insufficientReason: insufficient,
        risks: [],
        weatherWarnings: [],
        advisory: advisoryInsufficient(insufficient, language),
        aiStatus: 'skipped',
        aiNote: null,
      });
    }

    // ── Case B: assessed, nothing to report ─────────────────────────────────
    if (triggered.length === 0 && weatherWarnings.length === 0) {
      return json(200, {
        ...base,
        assessmentStatus: 'no_significant_risk',
        insufficientReason: null,
        risks: [],
        weatherWarnings: [],
        advisory: advisoryNoRisk(crop, stage, weather.daily.length, language),
        aiStatus: 'skipped',
        aiNote: null,
      });
    }

    // ── Case C: risks and/or warnings found -> explain them ─────────────────
    const plainViews: RiskView[] = triggered.map((r) => toRiskView(r, language));
    const explainResult = await deps.explain({
      apiKey: deps.env('GEMINI_API_KEY'),
      model: deps.env('GEMINI_MODEL') ?? 'gemini-3.8-flash',
      language,
      cropLabel: CROP_LABEL[crop][language],
      stageLabel: STAGE_LABEL[stage][language],
      locationName,
      risks: triggered.map((r, i) => ({
        rule_id: r.rule_id,
        risk_name: r.risk_name,
        severity: plainViews[i].severity,
        weather_condition: plainViews[i].weatherCondition,
        forecast_period: plainViews[i].forecastPeriod,
        source_name: r.source.name,
        evidence_type: r.source.evidence_type,
        applicability_note: r.source.applicability_note ?? '',
        caveats: r.caveats,
        approved_action: plainViews[i].preventiveAction,
      })),
      warnings: warningGroups.map((g) => ({
        id: g.id,
        name: g.name,
        dates: g.dates,
        peak_value: g.peakValue,
        unit: g.unit,
        message: g.message,
        caveat: g.caveat,
        approved_action: g.action,
      })),
    });

    // Rule-based advisory is the default; Gemini text replaces it only if it passed validation.
    let risks = plainViews;
    let advisory = triggered.length > 0
      ? advisoryFromRules(plainViews, crop, stage, language)
      : advisoryFromWarnings(warningGroups, crop, stage, language);
    let aiStatus: 'completed' | 'fallback' = 'fallback';
    let aiNote: string | null = explainResult.ok ? null : explainResult.reason;

    if (explainResult.ok) {
      const byId = new Map(explainResult.explanation.risks.map((x) => [x.rule_id, x]));
      risks = triggered.map((r) => {
        const ai = byId.get(r.rule_id);
        return toRiskView(r, language, ai ? { title: ai.title, reason: ai.reason } : undefined);
      });
      advisory = advisoryFromAi(risks, explainResult.explanation, language, warningActions(warningGroups));
      aiStatus = 'completed';
      aiNote = null;
    }

    // Warnings are rule-written and returned unchanged; Gemini never edits them.
    return json(200, {
      ...base,
      assessmentStatus: 'completed',
      insufficientReason: null,
      risks,
      weatherWarnings,
      advisory,
      aiStatus,
      aiNote,
    });
  } catch (err) {
    console.error('[crop-advisory] Unhandled error:', err instanceof Error ? err.message : 'unknown');
    return fail(500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred. Please try again.');
  }
}
