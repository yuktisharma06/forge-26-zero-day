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
async function geocodeOnce(placeName: string): Promise<GeocodingResult> {
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

// -----------------------------------------------------------------------------
// Tolerant lookup
// -----------------------------------------------------------------------------
// Open-Meteo matches PLACE NAMES, not descriptive phrases. "Saharanpur City" or
// "Saharanpur, Uttar Pradesh" find nothing even though "Saharanpur" works.
// So we try the text as typed first, then simpler versions of it.

const GENERIC_SUFFIXES = new Set([
  'city', 'town', 'district', 'tehsil', 'tahsil', 'block', 'village', 'urban',
]);

/**
 * Returns the names to try, most specific first, without duplicates.
 *   "Saharanpur City"           -> ["Saharanpur City", "Saharanpur"]
 *   "Saharanpur, Uttar Pradesh" -> ["Saharanpur, Uttar Pradesh", "Saharanpur"]
 *   "Deoband"                   -> ["Deoband"]
 * A name is never stripped down to nothing.
 */
export function locationCandidates(input: string): string[] {
  const original = input.trim().replace(/\s+/g, ' ');
  if (!original) return [];

  const out: string[] = [original];
  const add = (v: string) => {
    const t = v.trim();
    if (t && !out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
  };

  const firstPart = original.split(',')[0].trim();
  add(firstPart);

  // Remove trailing generic words ("City", "District", ...) but keep at least one word.
  const words = firstPart.split(' ');
  while (words.length > 1 && GENERIC_SUFFIXES.has(words[words.length - 1].toLowerCase())) {
    words.pop();
    add(words.join(' '));
  }
  return out;
}

/**
 * Resolves a place name to coordinates, trying simpler versions of the text if
 * the exact text is not found. Network or HTTP failures are NOT retried with
 * other names: they are thrown straight away so an outage is never hidden.
 * If nothing matches, throws an error starting with "Location not found".
 */
export async function geocodeLocation(placeName: string): Promise<GeocodingResult> {
  const candidates = locationCandidates(placeName);
  if (candidates.length === 0) {
    throw new Error('Place name must not be empty.');
  }

  for (const candidate of candidates) {
    try {
      return await geocodeOnce(candidate);
    } catch (err) {
      const notFound = err instanceof Error && err.message.startsWith('Location not found');
      if (!notFound) throw err;
      // otherwise: try the next, simpler name
    }
  }

  throw new Error(
    `Location not found: "${placeName.trim()}". Please check the spelling or try a simpler name (e.g. "Saharanpur").`,
  );
}
