// Tests for crop-advisory. Run from the supabase/functions folder:
//   deno test --allow-env crop-advisory/handler_test.ts
// No network is used: weather, geocoding and Gemini are replaced by stand-ins.

import { handleRequest, type Deps } from './handler.ts';
import type { DailyForecast, WeatherSummary } from '../_shared/types.ts';
import { containsUnapprovedDose, parseGeminiExplanation } from '../_shared/advisory/gemini.ts';

function assertEq<T>(actual: T, expected: T, msg: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
function assertTrue(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// Forecast dates start today so the "stale data" check never trips.
function dateOffset(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Real Saharanpur numbers from the 31 Oct 2026 test run (max, min, rain mm).
const SAHARANPUR: [number, number, number][] = [
  [26.4, 16.8, 0], [26.9, 15.8, 0], [27.5, 16.5, 0], [27.3, 15.7, 0],
  [26.7, 15.1, 0], [26.7, 14.6, 0], [26.5, 14.4, 0],
];

function makeWeather(rows: [number, number, number][]): WeatherSummary {
  const daily: DailyForecast[] = rows.map(([max, min, rain], i) => ({
    date: dateOffset(i),
    max_temp_c: max,
    min_temp_c: min,
    precipitation_mm: rain,
    precipitation_probability_pct: rain > 0 ? 80 : 0,
    humidity_pct: 80,
    wind_speed_kmh: 10,
  }));
  return {
    location: 'Saharanpur, Uttar Pradesh',
    latitude: 29.98,
    longitude: 77.51,
    daily,
    fetched_at: new Date().toISOString(),
    source: 'Open-Meteo',
  };
}

function makeDeps(opts: {
  rows?: [number, number, number][];
  sample?: boolean;
  explain?: Deps['explain'];
  geocodeFails?: string;
} = {}): Deps {
  return {
    fetchWeather: () =>
      Promise.resolve({ weather: makeWeather(opts.rows ?? SAHARANPUR), is_fallback: opts.sample ?? false }),
    geocode: () => {
      if (opts.geocodeFails) return Promise.reject(new Error(opts.geocodeFails));
      return Promise.resolve({
        name: 'Saharanpur, Uttar Pradesh, India', latitude: 29.98, longitude: 77.51, country: 'India',
      });
    },
    explain: opts.explain ?? (() => Promise.resolve({ ok: false as const, reason: 'AI_NOT_CONFIGURED' })),
    env: () => undefined,
  };
}

async function call(body: unknown, deps: Deps) {
  const res = await handleRequest(
    new Request('http://x/crop-advisory', { method: 'POST', body: JSON.stringify(body) }),
    deps,
  );
  return { status: res.status, json: await res.json() };
}

const base = { location: 'Saharanpur', language: 'en' };

Deno.test('wheat early_growth with the real Saharanpur forecast -> no significant risk', async () => {
  const r = await call({ ...base, crop: 'wheat', growthStage: 'early_growth' }, makeDeps());
  assertEq(r.status, 200, 'status');
  assertEq(r.json.assessmentStatus, 'no_significant_risk', 'assessmentStatus');
  assertEq(r.json.risks, [], 'risks');
  assertEq(r.json.aiStatus, 'skipped', 'aiStatus');
});

const HOT_FLOWERING = SAHARANPUR.map(([_, min, rain]) => [27.5, min, rain] as [number, number, number]);

Deno.test('wheat reproductive with 27 C days -> Low risk, flat source, no "potential" severity', async () => {
  const r = await call({ ...base, crop: 'wheat', growthStage: 'reproductive' }, makeDeps({ rows: HOT_FLOWERING }));
  assertEq(r.json.assessmentStatus, 'completed', 'assessmentStatus');
  const risk = r.json.risks.find((x: { id: string }) => x.id === 'wheat_reproductive_heat');
  assertEq(risk.severity, 'low', 'engine severity passes through lowercased');
  // Contract shape: source.title and source.url are plain strings / null, never objects.
  assertEq(typeof risk.source.title, 'string', 'source.title is a string');
  assertTrue(risk.source.url === null || typeof risk.source.url === 'string', 'source.url is string or null');
  assertEq(typeof risk.source.citation, 'string', 'source.citation');
  assertEq(risk.source.evidenceType, 'research_literature', 'evidence type exposed');
  assertTrue(typeof risk.source.applicabilityNote === 'string', 'applicability note exposed');
  assertTrue(Array.isArray(risk.caveats) && risk.caveats.length > 0, 'caveats exposed');
  assertEq(risk.triggeredDates.length, 7, 'all 7 days cross 26 C');
  assertEq(r.json.aiStatus, 'fallback', 'no Gemini key -> rule-based text');
  assertEq(r.json.advisory.writtenBy, 'rules', 'written by rules');
  assertTrue(r.json.advisory.actions.length > 0, 'advisory still has actions');
});

Deno.test('every returned severity is low, moderate or high', async () => {
  const cases: [string, string, [number, number, number][]][] = [
    ['wheat', 'reproductive', HOT_FLOWERING],
    ['wheat', 'grain_development_maturity', SAHARANPUR.map(([_, mn, rn]) => [36, mn, rn] as [number, number, number])],
    ['sugarcane', 'tillering', SAHARANPUR.map(([mx, _, rn]) => [mx, -4.5, rn] as [number, number, number])],
  ];
  for (const [crop, stage, rows] of cases) {
    const r = await call({ ...base, crop, growthStage: stage }, makeDeps({ rows }));
    assertTrue(r.json.risks.length > 0, `${crop}/${stage} has a risk`);
    for (const risk of r.json.risks) {
      assertTrue(['low', 'moderate', 'high'].includes(risk.severity), `bad severity ${risk.severity}`);
    }
  }
});

Deno.test('terminal heat: 32 C -> low, 36 C -> high (highest tier crossed)', async () => {
  const at = (t: number) => SAHARANPUR.map(([_, mn, rn]) => [t, mn, rn] as [number, number, number]);
  const low = await call({ ...base, crop: 'wheat', growthStage: 'grain_development_maturity' }, makeDeps({ rows: at(32) }));
  assertEq(low.json.risks.find((x: { id: string }) => x.id === 'wheat_grain_fill_heat').severity, 'low', '32 C');
  const high = await call({ ...base, crop: 'wheat', growthStage: 'grain_development_maturity' }, makeDeps({ rows: at(36) }));
  assertEq(high.json.risks.find((x: { id: string }) => x.id === 'wheat_grain_fill_heat').severity, 'high', '36 C');
});

Deno.test('sugarcane frost applies at tillering but not at germination', async () => {
  const cold = SAHARANPUR.map(([mx, _, rn]) => [mx, -4.5, rn] as [number, number, number]);
  const t = await call({ ...base, crop: 'sugarcane', growthStage: 'tillering' }, makeDeps({ rows: cold }));
  assertEq(t.json.risks.find((x: { id: string }) => x.id === 'sugarcane_frost').severity, 'moderate', 'tillering -4.5 C');
  const g = await call({ ...base, crop: 'sugarcane', growthStage: 'germination' }, makeDeps({ rows: cold }));
  assertEq(g.json.assessmentStatus, 'no_significant_risk', 'germination: frost rule not applied');
});

Deno.test('Gemini text is used when valid, and the engine still decides the risks', async () => {
  let seen: Parameters<Deps['explain']>[0] | null = null;
  const explain: Deps['explain'] = (args) => {
    seen = args;
    return Promise.resolve({
      ok: true as const,
      explanation: {
        summary: 'Hot days may affect your wheat.',
        risks: [{ rule_id: 'wheat_reproductive_heat', title: 'Hot days at flowering', reason: 'Heat may affect flowering.' }],
        actions: ['Ask your local KVK about irrigation timing.'],
      },
    });
  };
  const r = await call({ ...base, crop: 'wheat', growthStage: 'reproductive' }, makeDeps({ rows: HOT_FLOWERING, explain }));
  assertEq(r.json.aiStatus, 'completed', 'aiStatus');
  assertEq(r.json.risks[0].name, 'Hot days at flowering', 'AI title used');
  assertEq(r.json.risks[0].severity, 'low', 'severity untouched by AI');
  assertEq(r.json.advisory.writtenBy, 'ai', 'written by ai');
  // Gemini receives the source name as a string plus the evidence notes.
  const sent = seen!.risks[0];
  assertEq(typeof sent.source_name, 'string', 'source_name is a string');
  assertEq(sent.evidence_type, 'research_literature', 'evidence_type passed to Gemini');
  assertTrue(sent.caveats.length > 0, 'caveats passed to Gemini');
});

Deno.test('Gemini failure -> deterministic risks kept, rule-based advisory, aiStatus fallback', async () => {
  const explain: Deps['explain'] = () => Promise.resolve({ ok: false as const, reason: 'AI_HTTP_503' });
  const r = await call({ ...base, crop: 'wheat', growthStage: 'reproductive' }, makeDeps({ rows: HOT_FLOWERING, explain }));
  assertEq(r.status, 200, 'still 200');
  assertEq(r.json.assessmentStatus, 'completed', 'assessmentStatus');
  assertEq(r.json.risks.length > 0, true, 'risks kept');
  assertEq(r.json.aiStatus, 'fallback', 'aiStatus');
  assertEq(r.json.advisory.writtenBy, 'rules', 'rule-based text');
});

Deno.test('no-risk result lists the risks that were NOT assessed', async () => {
  const r = await call({ ...base, crop: 'wheat', growthStage: 'early_growth' }, makeDeps());
  assertEq(r.json.assessmentStatus, 'no_significant_risk', 'assessmentStatus');
  assertTrue(r.json.notAssessedRisks.length > 0, 'not-assessed list present');
});

Deno.test('Hindi request with a risk returns Hindi reason and Hindi action', async () => {
  const r = await call({ ...base, language: 'hi', crop: 'wheat', growthStage: 'reproductive' }, makeDeps({ rows: HOT_FLOWERING }));
  assertTrue(/[\u0900-\u097F]/.test(r.json.risks[0].reason), 'reason in Hindi');
  assertTrue(/[\u0900-\u097F]/.test(r.json.risks[0].preventiveAction), 'action in Hindi');
});

Deno.test('sample weather never reaches the risk engine -> insufficient_data', async () => {
  const r = await call({ ...base, crop: 'sugarcane', growthStage: 'germination' }, makeDeps({ sample: true }));
  assertEq(r.json.assessmentStatus, 'insufficient_data', 'assessmentStatus');
  assertEq(r.json.insufficientReason, 'sample_weather', 'reason');
  assertEq(r.json.risks, [], 'risks');
  assertEq(r.json.weather.dataStatus, 'sample', 'weather labelled as sample');
});

Deno.test('missing weather values the rules need -> insufficient_data, not "no risk"', async () => {
  const deps = makeDeps();
  deps.fetchWeather = () => {
    const w = makeWeather(SAHARANPUR);
    // sugarcane germination rules need max temp (heat) and rainfall (heavy rain)
    w.daily = w.daily.map((d) => ({ ...d, max_temp_c: null, precipitation_mm: null }));
    return Promise.resolve({ weather: w, is_fallback: false });
  };
  const r = await call({ ...base, crop: 'sugarcane', growthStage: 'germination' }, deps);
  assertEq(r.json.assessmentStatus, 'insufficient_data', 'assessmentStatus');
  assertEq(r.json.insufficientReason, 'unassessable', 'reason');
  assertEq(r.json.risks, [], 'risks');
});

Deno.test('contract stage name CRI is accepted and mapped', async () => {
  const r = await call({ ...base, crop: 'wheat', growthStage: 'CRI', sowingDate: '2026-11-01' }, makeDeps());
  assertEq(r.status, 200, 'status');
  assertEq(r.json.growthStage, 'crown_root', 'canonical stage id');
  assertEq(r.json.sowingDate, '2026-11-01', 'sowing date echoed');
});

Deno.test('crop and stage mismatch -> 400 INVALID_INPUT', async () => {
  const r = await call({ ...base, crop: 'wheat', growthStage: 'maturity_ripening' }, makeDeps());
  assertEq(r.status, 400, 'status');
  assertEq(r.json.success, false, 'success flag');
  assertEq(r.json.error.code, 'INVALID_INPUT', 'error code');
});

Deno.test('missing location, bad date, bad language -> 400', async () => {
  assertEq((await call({ crop: 'wheat', growthStage: 'early_growth' }, makeDeps())).status, 400, 'no location');
  assertEq((await call({ ...base, crop: 'wheat', growthStage: 'early_growth', sowingDate: '01-11-2026' }, makeDeps())).status, 400, 'bad date');
  assertEq((await call({ ...base, language: 'fr', crop: 'wheat', growthStage: 'early_growth' }, makeDeps())).status, 400, 'bad language');
});

Deno.test('unknown place -> 404 LOCATION_NOT_FOUND', async () => {
  const deps = makeDeps({ geocodeFails: 'Location not found: "Zzzz".' });
  const r = await call({ ...base, location: 'Zzzz', crop: 'wheat', growthStage: 'early_growth' }, deps);
  assertEq(r.status, 404, 'status');
  assertEq(r.json.error.code, 'LOCATION_NOT_FOUND', 'code');
});

Deno.test('Hindi request returns Hindi advisory text', async () => {
  const r = await call({ ...base, language: 'hi', crop: 'wheat', growthStage: 'early_growth' }, makeDeps());
  assertTrue(/[\u0900-\u097F]/.test(r.json.advisory.summary), 'summary contains Devanagari');
});

Deno.test('dose guard rejects invented doses but allows approved ones', () => {
  assertEq(containsUnapprovedDose('Spray 5 ml per litre', 'Irrigate lightly'), true, 'invented dose rejected');
  assertEq(containsUnapprovedDose('Use KNO3 @ 2%', 'Apply KNO3 @ 2% foliar spray'), false, 'approved dose allowed');
  assertEq(containsUnapprovedDose('Temperature near 15 °C', 'x'), false, 'plain temperatures are fine');
});

Deno.test('Gemini output with unknown rule id or bad JSON is rejected', () => {
  const ok = '{"summary":"s","risks":[{"rule_id":"a","title":"t","reason":"r"}],"actions":["do x"]}';
  assertTrue(parseGeminiExplanation(ok, ['a'], '') !== null, 'valid output accepted');
  assertEq(parseGeminiExplanation(ok, ['b'], ''), null, 'unknown rule id rejected');
  assertEq(parseGeminiExplanation('not json', ['a'], ''), null, 'bad JSON rejected');
});
