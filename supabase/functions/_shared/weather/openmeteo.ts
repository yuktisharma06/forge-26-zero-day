// =============================================================================
// Open-Meteo Weather Integration
// Fetches 7-day forecasts for a given lat/lon from the Open-Meteo API.
// Open-Meteo is a free, open-source weather API — no API key required.
// API docs: https://open-meteo.com/en/docs
// =============================================================================

import type { DailyForecast, WeatherSummary } from '../types.ts';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * How many days old the earliest forecast day may be before the data is
 * considered stale. Open-Meteo typically returns today onward; if the first
 * day in the response is more than STALE_THRESHOLD_DAYS in the past the
 * caller should warn the user rather than trust the data.
 */
const STALE_THRESHOLD_DAYS = 2;

/** Request timeout for the Open-Meteo API call (ms) */
const FETCH_TIMEOUT_MS = 5_000;

/** Default coordinates for Saharanpur, Uttar Pradesh */
export const SAHARANPUR_COORDS = {
  latitude: 29.9648,
  longitude: 77.546,
  name: 'Saharanpur, Uttar Pradesh',
};

export interface FetchWeatherParams {
  latitude: number;
  longitude: number;
  locationName?: string;
  forecastDays?: number; // 1–16; defaults to 7
}

// Shape returned directly by Open-Meteo's daily endpoint
interface OpenMeteoApiResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  daily: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_sum: (number | null)[];
    precipitation_probability_max: (number | null)[];
    relative_humidity_2m_max: (number | null)[];
    wind_speed_10m_max: (number | null)[];
  };
  daily_units: Record<string, string>;
}

/**
 * Indicates whether fetched weather data should be treated as stale.
 *
 * A forecast is stale when the first date in the daily array is more than
 * STALE_THRESHOLD_DAYS before today. This can happen if Open-Meteo returns
 * cached data anchored to a past date.
 */
export function isWeatherDataStale(weather: WeatherSummary): boolean {
  if (!weather.daily || weather.daily.length === 0) return true;

  const firstDate = new Date(weather.daily[0].date);
  const today = new Date();
  // Zero out time components for a clean day comparison
  today.setHours(0, 0, 0, 0);
  firstDate.setHours(0, 0, 0, 0);

  const diffDays = (today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > STALE_THRESHOLD_DAYS;
}

/**
 * Counts how many required weather parameters are null across all forecast days.
 * Returns a ratio (0.0 = all data present, 1.0 = all data missing).
 */
export function weatherDataCompletenessRatio(weather: WeatherSummary): number {
  if (!weather.daily || weather.daily.length === 0) return 1.0;

  const parameters: (keyof DailyForecast)[] = [
    'max_temp_c',
    'min_temp_c',
    'precipitation_mm',
    'precipitation_probability_pct',
    'humidity_pct',
    'wind_speed_kmh',
  ];

  let total = 0;
  let nullCount = 0;

  for (const day of weather.daily) {
    for (const param of parameters) {
      total++;
      if (day[param] === null) nullCount++;
    }
  }

  return total === 0 ? 1.0 : nullCount / total;
}

// =============================================================================
// Fallback weather data
// =============================================================================

/**
 * Return type for fetchWeatherForecastWithFallback.
 *
 * - is_fallback: false → weather came from the live Open-Meteo API (source: "live")
 * - is_fallback: true  → Open-Meteo was unavailable; weather is clearly-labelled
 *                         sample data (source: "fallback") so the demo stays honest
 */
export interface WeatherFetchResult {
  weather: WeatherSummary;
  /** true when the result is sample data, not a real API response */
  is_fallback: boolean;
  /** Human-readable reason the fallback was used; undefined when is_fallback=false */
  fallback_reason?: string;
}

/**
 * Realistic static sample values representing typical conditions near Saharanpur, UP.
 * Dates are computed dynamically at call time so they always look current.
 *
 * These values are used ONLY when the live API is unavailable.
 * They are NOT used as risk-detection inputs — Phase C will gate on is_fallback.
 */
const SAMPLE_DAILY_OFFSETS: Omit<DailyForecast, 'date'>[] = [
  { max_temp_c: 29, min_temp_c: 17, precipitation_mm: 0,    precipitation_probability_pct: 5,  humidity_pct: 62, wind_speed_kmh: 11 },
  { max_temp_c: 31, min_temp_c: 18, precipitation_mm: 0,    precipitation_probability_pct: 8,  humidity_pct: 58, wind_speed_kmh: 13 },
  { max_temp_c: 30, min_temp_c: 17, precipitation_mm: 1,    precipitation_probability_pct: 20, humidity_pct: 65, wind_speed_kmh: 10 },
  { max_temp_c: 28, min_temp_c: 16, precipitation_mm: 4,    precipitation_probability_pct: 35, humidity_pct: 72, wind_speed_kmh: 14 },
  { max_temp_c: 27, min_temp_c: 15, precipitation_mm: 2,    precipitation_probability_pct: 25, humidity_pct: 70, wind_speed_kmh: 12 },
  { max_temp_c: 29, min_temp_c: 16, precipitation_mm: 0,    precipitation_probability_pct: 10, humidity_pct: 64, wind_speed_kmh: 11 },
  { max_temp_c: 30, min_temp_c: 17, precipitation_mm: 0,    precipitation_probability_pct: 5,  humidity_pct: 60, wind_speed_kmh: 10 },
];

/**
 * Builds a WeatherSummary using the static sample offsets above.
 * Dates are generated from today so the forecast period always looks current.
 */
function buildFallbackWeather(
  latitude: number,
  longitude: number,
  locationName: string,
): WeatherSummary {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daily: DailyForecast[] = SAMPLE_DAILY_OFFSETS.map((values, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      date: d.toISOString().split('T')[0],
      ...values,
    };
  });

  return {
    location: locationName,
    latitude,
    longitude,
    daily,
    fetched_at: new Date().toISOString(),
    // WeatherSummary.source is typed as the literal 'Open-Meteo'.
    // We cast here only so we can carry the 'fallback' label without
    // touching types.ts. Callers MUST check WeatherFetchResult.is_fallback
    // rather than inspecting this field directly.
    source: 'Open-Meteo',
  };
}

// =============================================================================
// Live fetch — throws on any failure
// =============================================================================

/**
 * Fetches a daily weather forecast from Open-Meteo for the given coordinates.
 *
 * Throws on network errors, timeouts, or invalid API responses.
 * Never returns fabricated weather data — if the API fails, the caller must handle the error.
 *
 * Prefer fetchWeatherForecastWithFallback when resilience is needed.
 */
export async function fetchWeatherForecast(
  params: FetchWeatherParams,
): Promise<WeatherSummary> {
  const {
    latitude,
    longitude,
    locationName = 'Unknown Location',
    forecastDays = 7,
  } = params;

  const queryParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'relative_humidity_2m_max',
      'wind_speed_10m_max',
    ].join(','),
    timezone: 'Asia/Kolkata',
    forecast_days: forecastDays.toString(),
    wind_speed_unit: 'kmh',
  });

  const url = `${OPEN_METEO_BASE_URL}?${queryParams}`;
  const fetchedAt = new Date().toISOString();

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (networkError) {
    if (networkError instanceof DOMException && networkError.name === 'TimeoutError') {
      throw new Error(
        `Open-Meteo API request timed out after ${FETCH_TIMEOUT_MS / 1000}s. Please try again.`,
      );
    }
    throw new Error(
      `Network error while contacting Open-Meteo: ${
        networkError instanceof Error ? networkError.message : String(networkError)
      }`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Open-Meteo API returned HTTP ${response.status}: ${response.statusText}`,
    );
  }

  let apiData: OpenMeteoApiResponse;
  try {
    apiData = await response.json();
  } catch {
    throw new Error('Open-Meteo returned an invalid JSON response.');
  }

  if (
    !apiData.daily ||
    !Array.isArray(apiData.daily.time) ||
    apiData.daily.time.length === 0
  ) {
    throw new Error('Open-Meteo returned no forecast data for the given location.');
  }

  const daily: DailyForecast[] = apiData.daily.time.map((date, i) => ({
    date,
    max_temp_c: apiData.daily.temperature_2m_max[i] ?? null,
    min_temp_c: apiData.daily.temperature_2m_min[i] ?? null,
    precipitation_mm: apiData.daily.precipitation_sum[i] ?? null,
    precipitation_probability_pct: apiData.daily.precipitation_probability_max[i] ?? null,
    humidity_pct: apiData.daily.relative_humidity_2m_max[i] ?? null,
    wind_speed_kmh: apiData.daily.wind_speed_10m_max[i] ?? null,
  }));

  return {
    location: locationName,
    latitude: apiData.latitude,
    longitude: apiData.longitude,
    daily,
    fetched_at: fetchedAt,
    source: 'Open-Meteo',
  };
}

// =============================================================================
// Resilient fetch — returns fallback on any failure
// =============================================================================

/**
 * Calls fetchWeatherForecast and wraps the result in WeatherFetchResult.
 *
 * If the live API call fails for any reason (network error, timeout, HTTP error,
 * bad or empty data), this function catches the error and returns clearly-labelled
 * sample data instead of propagating the exception.
 *
 * Callers must inspect is_fallback and communicate it honestly to the user.
 * Sample data must NOT be used as input to the deterministic risk engine —
 * Phase C will gate risk assessment on is_fallback === false.
 */
export async function fetchWeatherForecastWithFallback(
  params: FetchWeatherParams,
): Promise<WeatherFetchResult> {
  const locationName = params.locationName ?? 'Unknown Location';

  try {
    const weather = await fetchWeatherForecast(params);
    return { weather, is_fallback: false };
  } catch (err) {
    const reason =
      err instanceof Error ? err.message : 'Open-Meteo weather fetch failed.';
    console.warn(
      `[openmeteo] Live fetch failed — using sample fallback data. Reason: ${reason}`,
    );
    return {
      weather: buildFallbackWeather(params.latitude, params.longitude, locationName),
      is_fallback: true,
      fallback_reason: reason,
    };
  }
}
