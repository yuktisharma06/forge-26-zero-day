// Run from supabase/functions:
//   deno test --allow-env --allow-read _shared/geocoding/openmeteo-geocoding_test.ts
// No network: fetch is replaced by a stand-in that mimics Open-Meteo.

import { geocodeLocation, locationCandidates } from './openmeteo-geocoding.ts';

function assertEq<T>(actual: T, expected: T, msg: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

// A fake Open-Meteo that only knows exact place names, like the real one.
const KNOWN: Record<string, Record<string, unknown>> = {
  saharanpur: { id: 1, name: 'Saharanpur', latitude: 29.97, longitude: 77.55, country: 'India', country_code: 'IN', admin1: 'Uttar Pradesh', admin2: 'Saharanpur' },
  deoband: { id: 2, name: 'Deoband', latitude: 29.69, longitude: 77.68, country: 'India', country_code: 'IN', admin1: 'Uttar Pradesh', admin2: 'Saharanpur' },
};

async function withFakeFetch<T>(
  handler: (name: string) => Response,
  run: (calls: string[]) => Promise<T>,
): Promise<T> {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = ((input: string | URL | Request) => {
    const name = new URL(String(input)).searchParams.get('name') ?? '';
    calls.push(name);
    return Promise.resolve(handler(name));
  }) as typeof fetch;
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = original;
  }
}

const exactNamesOnly = (name: string) => {
  const hit = KNOWN[name.toLowerCase()];
  return new Response(JSON.stringify(hit ? { results: [hit] } : {}), { status: 200 });
};

Deno.test('candidates: "Saharanpur City" falls back to "Saharanpur"', () => {
  assertEq(locationCandidates('Saharanpur City'), ['Saharanpur City', 'Saharanpur'], 'city suffix');
});

Deno.test('candidates: comma-qualified names fall back to the first part', () => {
  assertEq(locationCandidates('Saharanpur, Uttar Pradesh'), ['Saharanpur, Uttar Pradesh', 'Saharanpur'], 'comma');
});

Deno.test('candidates: plain names and odd spacing', () => {
  assertEq(locationCandidates('Deoband'), ['Deoband'], 'plain');
  assertEq(locationCandidates('  saharanpur   CITY '), ['saharanpur CITY', 'saharanpur'], 'spacing and case');
  assertEq(locationCandidates('Saharanpur City District'), ['Saharanpur City District', 'Saharanpur City', 'Saharanpur'], 'stacked suffixes');
});

Deno.test('candidates: never strips a name down to nothing', () => {
  assertEq(locationCandidates('City'), ['City'], 'single generic word kept');
  assertEq(locationCandidates('   '), [], 'blank gives nothing to try');
});

Deno.test('"Saharanpur City" resolves to Saharanpur after one retry', async () => {
  await withFakeFetch(exactNamesOnly, async (calls) => {
    const r = await geocodeLocation('Saharanpur City');
    assertEq(r.latitude, 29.97, 'latitude');
    assertEq(r.name.startsWith('Saharanpur'), true, 'resolved name');
    assertEq(calls, ['Saharanpur City', 'Saharanpur'], 'tried exact text first, then the simpler name');
  });
});

Deno.test('"Deoband" works on the first try, no extra requests', async () => {
  await withFakeFetch(exactNamesOnly, async (calls) => {
    const r = await geocodeLocation('Deoband');
    assertEq(r.longitude, 77.68, 'longitude');
    assertEq(calls, ['Deoband'], 'single request');
  });
});

Deno.test('a genuinely unknown place still gives "Location not found"', async () => {
  await withFakeFetch(exactNamesOnly, async (calls) => {
    let message = '';
    try { await geocodeLocation('Zzzzville City'); } catch (e) { message = (e as Error).message; }
    assertEq(message.startsWith('Location not found'), true, 'error text keeps the prefix the handler checks');
    assertEq(calls, ['Zzzzville City', 'Zzzzville'], 'tried each candidate once');
  });
});

Deno.test('an outage is not hidden: HTTP errors are thrown immediately', async () => {
  await withFakeFetch(() => new Response('oops', { status: 503, statusText: 'Service Unavailable' }), async (calls) => {
    let message = '';
    try { await geocodeLocation('Saharanpur City'); } catch (e) { message = (e as Error).message; }
    assertEq(message.includes('HTTP 503'), true, 'HTTP error surfaced');
    assertEq(calls.length, 1, 'no further candidates tried after an outage');
  });
});
