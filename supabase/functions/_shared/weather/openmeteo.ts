// =============================================================================
// Open-Meteo Weather Integration
// Fetches 7-day forecasts for a given lat/lon from the Open-Meteo API.
// Open-Meteo is a free, open-source weather API — no API key required.
// API docs: https://open-meteo.com/en/docs
// =============================================================================

import type { DailyForecast, WeatherSummary } from '../types.ts';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

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
 * Fetches a daily weather forecast from Open-Meteo for the given coordinates.
 *
 * Throws on network errors or invalid API responses.
 * Never returns fabricated weather data — if the API fails, the caller must handle the error.
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
    response = await fetch(url);
  } catch (networkError) {
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
