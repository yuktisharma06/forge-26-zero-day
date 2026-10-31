// =============================================================================
// get-weather — Standalone Weather Edge Function
// =============================================================================
// Accepts a location (place name or lat/lon) and returns a real 7-day weather
// forecast from Open-Meteo.
//
// This function can be called directly by the frontend for displaying the
// weather widget, or internally by generate-advisory.
//
// IMPORTANT: Never returns fabricated weather data.
//            If Open-Meteo is unavailable, an error is returned with
//            retry guidance rather than inventing values.
// =============================================================================

import { corsHeaders } from '../_shared/cors.ts';
import {
  fetchWeatherForecast,
  isWeatherDataStale,
  weatherDataCompletenessRatio,
  SAHARANPUR_COORDS,
} from '../_shared/weather/openmeteo.ts';
import { geocodeLocation } from '../_shared/geocoding/openmeteo-geocoding.ts';
import type { WeatherSummary } from '../_shared/types.ts';

// ── Request body shape ────────────────────────────────────────────────────────
// The caller may provide EITHER:
//   (a) a human-readable location string → geocoding resolves it
//   (b) explicit latitude + longitude     → used directly
// If both are provided, lat/lon takes precedence and location is used as a label.
interface GetWeatherRequest {
  location?: string;     // Human-readable name (e.g. "Saharanpur")
  latitude?: number;     // Decimal degrees
  longitude?: number;    // Decimal degrees
  forecast_days?: number; // 1–7; defaults to 7
}

// ── Response envelope ─────────────────────────────────────────────────────────
interface GetWeatherResponse {
  weather: WeatherSummary;
  stale: boolean;               // true if forecast dates appear out of date
  /**
   * Fraction of weather parameters that are NULL (0.0 = all present, 1.0 = all missing).
   * NOTE: a value of 0 means the data is COMPLETE, not absent.
   * Use data_present_pct for a human-readable completeness percentage.
   */
  data_completeness: number;
  /** Percentage of weather parameters that ARE present (0–100, where 100 = fully complete). */
  data_present_pct: number;
  warnings: string[];           // Non-fatal data-quality notices
}

// =============================================================================
// Handler
// =============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  // ── Preflight ───────────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed. Use POST.');
  }

  try {
    // ── Parse request body ──────────────────────────────────────────────────
    let body: GetWeatherRequest;
    try {
      body = await req.json();
    } catch {
      return errorResponse(400, 'Invalid JSON in request body.');
    }

    const { location, latitude, longitude, forecast_days } = body;

    // ── Determine coordinates ───────────────────────────────────────────────
    let resolvedLat: number;
    let resolvedLon: number;
    let resolvedName: string;

    const hasExplicitCoords =
      typeof latitude === 'number' && typeof longitude === 'number';

    if (hasExplicitCoords) {
      // Validate explicit coordinates
      if (latitude! < -90 || latitude! > 90) {
        return errorResponse(400, 'latitude must be between -90 and 90.');
      }
      if (longitude! < -180 || longitude! > 180) {
        return errorResponse(400, 'longitude must be between -180 and 180.');
      }
      resolvedLat = latitude!;
      resolvedLon = longitude!;
      resolvedName = location?.trim() || `${latitude}, ${longitude}`;
    } else if (location && location.trim() !== '') {
      // Geocode the place name
      try {
        const geo = await geocodeLocation(location.trim());
        resolvedLat = geo.latitude;
        resolvedLon = geo.longitude;
        resolvedName = geo.name;
      } catch (geoError) {
        return errorResponse(
          422,
          geoError instanceof Error
            ? geoError.message
            : 'Could not resolve location to coordinates.',
        );
      }
    } else {
      // Neither coordinates nor a location name — use Saharanpur as default
      // (appropriate for the MVP scope targeting Saharanpur, UP)
      resolvedLat = SAHARANPUR_COORDS.latitude;
      resolvedLon = SAHARANPUR_COORDS.longitude;
      resolvedName = SAHARANPUR_COORDS.name;
    }

    // ── Validate forecast_days ───────────────────────────────────────────────
    const days = typeof forecast_days === 'number'
      ? Math.max(1, Math.min(7, Math.round(forecast_days)))
      : 7;

    // ── Fetch weather from Open-Meteo ────────────────────────────────────────
    let weather: WeatherSummary;
    try {
      weather = await fetchWeatherForecast({
        latitude: resolvedLat,
        longitude: resolvedLon,
        locationName: resolvedName,
        forecastDays: days,
      });
    } catch (weatherError) {
      // Network failure, timeout, or invalid API response
      const message =
        weatherError instanceof Error
          ? weatherError.message
          : 'Weather data could not be fetched.';

      console.error('[get-weather] fetchWeatherForecast failed:', message);

      return errorResponse(503, `${message} Please try again later.`);
    }

    // ── Data-quality checks ──────────────────────────────────────────────────
    const stale = isWeatherDataStale(weather);
    const completeness = weatherDataCompletenessRatio(weather);
    const warnings: string[] = [];

    if (stale) {
      warnings.push(
        'The forecast data appears to be anchored to a past date. The information may not reflect current conditions.',
      );
    }

    if (completeness > 0.3) {
      warnings.push(
        `${Math.round(completeness * 100)}% of weather parameters are missing for the requested location. Risk assessment reliability may be reduced.`,
      );
    }

    // ── Build response ───────────────────────────────────────────────────────
    const responseBody: GetWeatherResponse = {
      weather,
      stale,
      // Fraction of parameters that are NULL. 0 = all data present (fully complete).
      data_completeness: Math.round(completeness * 100) / 100,
      // Human-readable inverse: 100 means all parameters are present.
      data_present_pct: Math.round((1 - completeness) * 100),
      warnings,
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[get-weather] Unhandled error:', err);
    return errorResponse(500, 'An unexpected error occurred. Please try again.');
  }
});

// =============================================================================
// Helpers
// =============================================================================

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
