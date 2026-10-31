// =============================================================================
// Open-Meteo Geocoding Integration
// Resolves a place name (e.g. "Saharanpur") to latitude and longitude.
//
// Uses the Open-Meteo Geocoding API — free, no API key required.
// API docs: https://open-meteo.com/en/docs/geocoding-api
//
// IMPORTANT: This module only converts a name to coordinates.
//            It never returns fabricated coordinates or weather data.
// =============================================================================

const GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

export interface GeocodingResult {
  name: string;          // Place name as returned by the API
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;       // State / province (e.g. "Uttar Pradesh")
  admin2?: string;       // District (e.g. "Saharanpur")
}

// Shape of one result in the Open-Meteo Geocoding API response
interface OpenMeteoGeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  country_code: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
}

interface OpenMeteoGeoResponse {
  results?: OpenMeteoGeoResult[];
}

/**
 * Resolves a human-readable place name to geographic coordinates.
 *
 * Returns the best match (first result) from the Open-Meteo Geocoding API.
 * Throws a descriptive error if:
 *  - The network request fails
 *  - The API returns an error status
 *  - No results are found for the given name
 *
 * Never returns invented coordinates.
 */
export async function geocodeLocation(placeName: string): Promise<GeocodingResult> {
  const trimmed = placeName.trim();
  if (!trimmed) {
    throw new Error('Place name must not be empty.');
  }

  const queryParams = new URLSearchParams({
    name: trimmed,
    count: '5',          // Fetch top 5; we'll prefer results in India
    language: 'en',
    format: 'json',
  });

  const url = `${GEOCODING_BASE_URL}?${queryParams}`;

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch (networkError) {
    throw new Error(
      `Network error while contacting Open-Meteo Geocoding API: ${
        networkError instanceof Error ? networkError.message : String(networkError)
      }`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Open-Meteo Geocoding API returned HTTP ${response.status}: ${response.statusText}`,
    );
  }

  let data: OpenMeteoGeoResponse;
  try {
    data = await response.json();
  } catch {
    throw new Error('Open-Meteo Geocoding API returned an invalid JSON response.');
  }

  if (!data.results || data.results.length === 0) {
    throw new Error(
      `Location not found: "${trimmed}". Please check the spelling or try a more specific name (e.g. "Saharanpur, Uttar Pradesh").`,
    );
  }

  // Prefer results from India (country_code = 'IN') if present
  const indiaResult = data.results.find((r) => r.country_code === 'IN');
  const best = indiaResult ?? data.results[0];

  // Build a descriptive name from available administrative fields
  const nameParts = [best.name];
  if (best.admin2 && best.admin2 !== best.name) nameParts.push(best.admin2);
  if (best.admin1) nameParts.push(best.admin1);
  if (best.country) nameParts.push(best.country);
  const resolvedName = nameParts.join(', ');

  return {
    name: resolvedName,
    latitude: best.latitude,
    longitude: best.longitude,
    country: best.country,
    admin1: best.admin1,
    admin2: best.admin2,
  };
}
