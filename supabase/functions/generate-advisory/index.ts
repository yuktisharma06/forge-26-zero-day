// =============================================================================
// generate-advisory — Main Edge Function
// =============================================================================
// Single entry point the frontend calls to get weather + risk advisory.
//
// Phase A  — scaffold, CORS, input validation ✅
// Phase B  — Open-Meteo weather fetch + geocoding ✅
// Phase C  — crop-specific risk engine ✅
// Phase D  — Gemini advisory generation (TODO)
// Phase E  — Supabase persistence + combined response (TODO)
// =============================================================================

import { corsHeaders } from '../_shared/cors.ts';
import type { FarmerInput, WeatherSummary } from '../_shared/types.ts';
import {
  fetchWeatherForecastWithFallback,
  isWeatherDataStale,
  weatherDataCompletenessRatio,
  type WeatherFetchResult,
} from '../_shared/weather/openmeteo.ts';
import { geocodeLocation } from '../_shared/geocoding/openmeteo-geocoding.ts';
import { runRiskEngine } from '../_shared/risk-engine/index.ts';

Deno.serve(async (req: Request): Promise<Response> => {
  // ── Preflight ──────────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ── Method guard ───────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    // ── Parse & validate farmer input ────────────────────────────────────────
    let body: Partial<FarmerInput>;
    try {
      body = await req.json();
    } catch {
      return errorResponse(400, 'Invalid JSON in request body.');
    }

    const validationError = validateFarmerInput(body);
    if (validationError) {
      return errorResponse(400, validationError);
    }

    // Type assertion is safe because validateFarmerInput confirmed required fields.
    const farmerInput = body as FarmerInput;

    // ── Phase B: Resolve coordinates ─────────────────────────────────────────
    // If the client sent a location string without coordinates, geocode it.
    // If explicit lat/lon were provided they are already validated above.
    let resolvedLat = farmerInput.latitude;
    let resolvedLon = farmerInput.longitude;
    let resolvedLocationName = farmerInput.location;
    let geocodeWarning: string | undefined;

    const coordsArePlaceholders =
      farmerInput.latitude === 0 && farmerInput.longitude === 0;

    if (coordsArePlaceholders && farmerInput.location.trim() !== '') {
      // Client sent 0,0 as sentinel — attempt geocoding
      try {
        const geo = await geocodeLocation(farmerInput.location.trim());
        resolvedLat = geo.latitude;
        resolvedLon = geo.longitude;
        resolvedLocationName = geo.name;
      } catch (geoError) {
        return errorResponse(
          422,
          geoError instanceof Error
            ? geoError.message
            : 'Could not resolve location to coordinates.',
        );
      }
    }

    // ── Phase B: Fetch weather from Open-Meteo (with automatic fallback) ──────────
    // fetchWeatherForecastWithFallback never throws — on any API failure it
    // returns clearly-labelled sample data and sets is_fallback: true.
    const weatherResult: WeatherFetchResult = await fetchWeatherForecastWithFallback({
      latitude: resolvedLat,
      longitude: resolvedLon,
      locationName: resolvedLocationName,
      forecastDays: 7,
    });

    const weatherSummary: WeatherSummary = weatherResult.weather;
    const weatherWarnings: string[] = [];
    let weatherIsStale = false;

    // Data-quality checks — only meaningful for live data.
    if (!weatherResult.is_fallback) {
      if (isWeatherDataStale(weatherSummary)) {
        weatherIsStale = true;
        weatherWarnings.push(
          'Weather data appears anchored to a past date and may not reflect current conditions.',
        );
      }
      const completeness = weatherDataCompletenessRatio(weatherSummary);
      if (completeness > 0.3) {
        weatherWarnings.push(
          `${Math.round(completeness * 100)}% of weather parameters are missing. Risk assessment reliability may be reduced.`,
        );
      }
    }

    if (geocodeWarning) weatherWarnings.push(geocodeWarning);

    // ── Phase C: Run crop-specific risk engine ───────────────────────────────
    const riskResult = runRiskEngine({
      crop: farmerInput.crop,
      growth_stage: farmerInput.growth_stage,
      daily_forecast: weatherSummary.daily,
      is_fallback: weatherResult.is_fallback,
      is_stale: weatherIsStale,
    });

    // ── TODO (Phase D): Call Gemini for advisory text ────────────────────────
    // ── TODO (Phase E): Persist advisory to Supabase DB ─────────────────────

    // Phase C response — weather (live or labelled sample) + structured risk results.
    return new Response(
      JSON.stringify({
        status: 'partial',
        phase: 'C_risk_engine',
        note: 'Risk engine results included. AI advisory (Phase D) and persistence (Phase E) not yet integrated.',
        farmer_input: {
          location: resolvedLocationName,
          latitude: resolvedLat,
          longitude: resolvedLon,
          crop: farmerInput.crop,
          growth_stage: farmerInput.growth_stage,
          language: farmerInput.language,
        },
        weather_summary: weatherSummary,
        // Tells the frontend and team exactly where the data came from.
        weather_source: weatherResult.is_fallback ? 'fallback' : 'live',
        // Honest note shown whenever sample data is served instead of a live forecast.
        weather_data_note: weatherResult.is_fallback
          ? 'Weather data unavailable, using sample data. Figures shown are for demonstration only and do not reflect current conditions.'
          : null,
        weather_warnings: weatherWarnings,
        // ── Risk engine output ───────────────────────────────────────────────
        risk_engine_status: riskResult.status,
        risk_engine_status_message: riskResult.status_message ?? null,
        forecast_window: riskResult.forecast_window,
        rules_evaluated: riskResult.rules_evaluated,
        detected_risks: riskResult.detected_risks,
        not_assessed_risks: riskResult.not_assessed,
        generated_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('[generate-advisory] Unhandled error:', err);
    return errorResponse(
      500,
      'An unexpected error occurred. Please try again.',
    );
  }
});

// =============================================================================
// Input validation
// =============================================================================

const VALID_CROPS = new Set(['sugarcane', 'wheat']);
const VALID_LANGUAGES = new Set(['en', 'hi']);
const VALID_WHEAT_STAGES = new Set([
  'early_growth',
  'crown_root',            // Crown Root Initiation (CRI)
  'vegetative_growth',
  'reproductive',
  'grain_development_maturity',
]);
const VALID_SUGARCANE_STAGES = new Set([
  'germination',
  'tillering',
  'grand_growth',
  'maturity_ripening',
]);

function validateFarmerInput(body: Partial<FarmerInput>): string | null {
  if (!body.location || typeof body.location !== 'string' || body.location.trim() === '') {
    return 'location is required.';
  }

  if (typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
    return 'latitude and longitude are required and must be numbers.';
  }

  if (body.latitude < -90 || body.latitude > 90) {
    return 'latitude must be between -90 and 90.';
  }

  if (body.longitude < -180 || body.longitude > 180) {
    return 'longitude must be between -180 and 180.';
  }

  if (!body.crop || !VALID_CROPS.has(body.crop)) {
    return `crop must be one of: ${[...VALID_CROPS].join(', ')}.`;
  }

  if (!body.growth_stage) {
    return 'growth_stage is required.';
  }

  const validStages =
    body.crop === 'wheat' ? VALID_WHEAT_STAGES : VALID_SUGARCANE_STAGES;
  if (!validStages.has(body.growth_stage)) {
    return `growth_stage '${body.growth_stage}' is not valid for crop '${body.crop}'.`;
  }

  if (!body.language || !VALID_LANGUAGES.has(body.language)) {
    return `language must be one of: ${[...VALID_LANGUAGES].join(', ')}.`;
  }

  return null; // all required fields valid
}

// =============================================================================
// Helpers
// =============================================================================

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
