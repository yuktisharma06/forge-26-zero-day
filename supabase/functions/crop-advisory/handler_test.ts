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

// Replace the temperature / rainfall of selected forecast days (0-based index).
function withDays(over: Record<number, Partial<{ max: number; min: number; rain: number }>>): [number, number, number][] {
  return SAHARANPUR.map(([mx, mn, rn], i) => {
    const o = over[i] ?? {};
    return [o.max ?? mx, o.min ?? mn, o.rain ?? rn] as [number, number, number];
  });
}
const allDays = (o: Partial<{ max: number; min: number; rain: number }>) => withDays({ 0: o, 1: o, 2: o, 3: o, 4: o, 5: o, 6: o });
const ids = (arr: { id: string }[]) => arr.map((x) => x.id);

Deno.test('response keeps risks, weatherWarnings and notAssessedRisks as separate arrays', async () => {
  const r = await call({ ...base, crop: 'wheat', growthStage: 'early_growth' }, makeDeps());
  assertEq(r.status, 200, 'status');
  assertTrue(Array.isArray(r.json.risks), 'risks array');
  assertTrue(Array.isArray(r.json.weatherWarnings), 'weatherWarnings array');
  assertTrue(Array.isArray(r.json.notAssessedRisks), 'notAssessedRisks array');
  assertEq(r.json.assessmentStatus, 'no_significant_risk', 'nothing triggered on the real Saharanpur forecast');
  assertEq(r.json.risks, [], 'risks empty');
  assertEq(r.json.weatherWarnings, [], 'no warnings');
  assertTrue('insufficientReason' in r.json && r.json.insufficientReason === null, 'insufficientReason is null');
  assertEq(r.json.weather.source, 'Open-Meteo', 'weather from Open-Meteo');
});

Deno.test('wheat grain development, Tmax 36 C -> informational heat warning, no High risk', async () => {
  const r = await call({ ...base, crop: 'wheat', growthStage: 'grain_development_maturity' }, makeDeps({ rows: withDays({ 3: { max: 36 } }) }));
  assertEq(r.json.risks, [], 'no crop risk');
  assertEq(r.json.assessmentStatus, 'completed', 'completed');
  assertEq(r.json.weatherWarnings.length, 1, 'one warning (one hot day)');
  const w = r.json.weatherWarnings[0];
  assertEq(w.id, 'wheat_grain_development_heat', 'id');
  assertEq(w.category, 'heat', 'category');
  assertEq(w.crop, 'wheat', 'crop');
  assertEq(w.growthStage, 'grain_development_maturity', 'stage');
  assertEq(w.observedValue, 36, 'value comes from the forecast');
  assertEq(w.unit, '°C', 'unit');
  assertEq(w.date, dateOffset(3), 'date comes from the forecast');
  assertTrue(!('severity' in w), 'warnings carry no severity');
  assertTrue(w.caveat.includes('not a locally validated'), 'caveat present');
  assertTrue(!/confirm.*damage/i.test(w.message) || /cannot confirm/i.test(w.message), 'does not confirm damage');
});

Deno.test('wheat heat exactly 35 C is not a warning (strictly greater)', async () => {
  const r = await call({ ...base, crop: 'wheat', growthStage: 'grain_development_maturity' }, makeDeps({ rows: allDays({ max: 35 }) }));
  assertEq(r.json.weatherWarnings, [], 'no warning at 35');
});

Deno.test('wheat reproductive, Tmax 27 C -> no 26 C flowering rule', async () => {
  const r = await call({ ...base, crop: 'wheat', growthStage: 'reproductive' }, makeDeps({ rows: allDays({ max: 27 }) }));
  assertEq(r.json.risks, [], 'no risk');
  assertEq(r.json.weatherWarnings, [], 'no warning');
  assertEq(r.json.assessmentStatus, 'no_significant_risk', 'status');
  assertTrue(ids(r.json.notAssessedRisks).includes('wheat_flowering_heat_damage'), 'flowering heat listed as not assessed');
});

Deno.test('wheat grain development, Tmax 31 C -> no 30/31 C severity rule and no warning', async () => {
  const r = await call({ ...base, crop: 'wheat', growthStage: 'grain_development_maturity' }, makeDeps({ rows: allDays({ max: 31 }) }));
  assertEq(r.json.risks, [], 'no risk');
  assertEq(r.json.weatherWarnings, [], 'no warning');
  assertTrue(ids(r.json.notAssessedRisks).includes('wheat_terminal_heat_damage'), 'terminal heat damage not assessed');
});

Deno.test('sugarcane, Tmax 39 C -> informational warning at any stage, no Low risk', async () => {
  for (const stage of ['germination', 'tillering', 'grand_growth', 'maturity_ripening']) {
    const r = await call({ ...base, crop: 'sugarcane', growthStage: stage }, makeDeps({ rows: withDays({ 2: { max: 39 } }) }));
    assertEq(r.json.risks, [], `${stage}: no risk`);
    assertEq(ids(r.json.weatherWarnings), ['sugarcane_high_temperature'], `${stage}: warning`);
    assertEq(r.json.weatherWarnings[0].observedValue, 39, `${stage}: value`);
  }
  const at38 = await call({ ...base, crop: 'sugarcane', growthStage: 'tillering' }, makeDeps({ rows: allDays({ max: 38 }) }));
  assertEq(at38.json.weatherWarnings, [], '38 C is not above 38');
});

Deno.test('sugarcane, Tmin -3 C -> no frost severity rule; frost listed as not assessed', async () => {
  const r = await call({ ...base, crop: 'sugarcane', growthStage: 'tillering' }, makeDeps({ rows: allDays({ min: -3 }) }));
  assertEq(r.json.risks, [], 'no risk');
  assertEq(r.json.weatherWarnings, [], 'no warning');
  assertTrue(ids(r.json.notAssessedRisks).includes('sugarcane_frost_damage'), 'sugarcane frost not assessed');
});

Deno.test('wheat cold nights -> no frost severity rule; frost listed as not assessed', async () => {
  const r = await call({ ...base, crop: 'wheat', growthStage: 'reproductive' }, makeDeps({ rows: allDays({ min: -3 }) }));
  assertEq(r.json.risks, [], 'no risk');
  assertEq(r.json.weatherWarnings, [], 'no warning');
  assertTrue(ids(r.json.notAssessedRisks).includes('wheat_frost_damage'), 'wheat frost not assessed');
});

Deno.test('rainfall 70 / 130 / 210 mm -> heavy / very heavy / extremely heavy warning only', async () => {
  const cases: [number, string][] = [[70, 'heavy_rainfall'], [130, 'very_heavy_rainfall'], [210, 'extremely_heavy_rainfall']];
  for (const crop of [['wheat', 'vegetative_growth'], ['sugarcane', 'grand_growth']]) {
    for (const [mm, id] of cases) {
      const r = await call({ ...base, crop: crop[0], growthStage: crop[1] }, makeDeps({ rows: withDays({ 4: { rain: mm } }) }));
      assertEq(r.json.risks, [], `${crop[0]} ${mm} mm: no crop risk`);
      assertEq(ids(r.json.weatherWarnings), [id], `${crop[0]} ${mm} mm: category`);
      assertEq(r.json.weatherWarnings[0].observedValue, mm, 'amount from forecast');
      assertEq(r.json.weatherWarnings[0].date, dateOffset(4), 'date from forecast');
      assertEq(r.json.weatherWarnings[0].category, 'rainfall', 'category');
      assertTrue(!('severity' in r.json.weatherWarnings[0]), 'no severity');
    }
  }
});

Deno.test('IMD rainfall boundaries', async () => {
  const at = async (mm: number) =>
    ids((await call({ ...base, crop: 'wheat', growthStage: 'early_growth' }, makeDeps({ rows: withDays({ 0: { rain: mm } }) }))).json.weatherWarnings);
  assertEq(await at(64.4), [], '64.4 -> none');
  assertEq(await at(64.5), ['heavy_rainfall'], '64.5 -> heavy');
  assertEq(await at(115.5), ['heavy_rainfall'], '115.5 -> heavy');
  assertEq(await at(115.6), ['very_heavy_rainfall'], '115.6 -> very heavy');
  assertEq(await at(204.4), ['very_heavy_rainfall'], '204.4 -> very heavy');
  assertEq(await at(204.5), ['extremely_heavy_rainfall'], '204.5 -> extremely heavy');
});

Deno.test('each forecast day is evaluated independently (one warning per day)', async () => {
  const r = await call({ ...base, crop: 'wheat', growthStage: 'early_growth' }, makeDeps({ rows: withDays({ 1: { rain: 70 }, 2: { rain: 130 }, 5: { rain: 70 } }) }));
  assertEq(r.json.weatherWarnings.map((w: { id: string; date: string }) => `${w.id}@${w.date}`),
    [`heavy_rainfall@${dateOffset(1)}`, `very_heavy_rainfall@${dateOffset(2)}`, `heavy_rainfall@${dateOffset(5)}`], 'per-day warnings');
});

Deno.test('rainfall never claims waterlogging; waterlogging is listed as not assessed', async () => {
  const r = await call({ ...base, crop: 'wheat', growthStage: 'vegetative_growth' }, makeDeps({ rows: withDays({ 3: { rain: 130 } }) }));
  const w = r.json.weatherWarnings[0];
  assertTrue(/does not show waterlogging/i.test(w.caveat), 'caveat says it does not show waterlogging');
  assertTrue(ids(r.json.notAssessedRisks).includes('waterlogging'), 'waterlogging not assessed');
  assertTrue(ids(r.json.notAssessedRisks).includes('water_stress'), 'water stress not assessed');
});

Deno.test('sample weather -> no risks, no warnings, no assessment', async () => {
  const r = await call({ ...base, crop: 'sugarcane', growthStage: 'germination' }, makeDeps({ sample: true, rows: allDays({ max: 45, rain: 300 }) }));
  assertEq(r.json.assessmentStatus, 'insufficient_data', 'assessmentStatus');
  assertEq(r.json.insufficientReason, 'sample_weather', 'reason');
  assertEq(r.json.risks, [], 'risks');
  assertEq(r.json.weatherWarnings, [], 'weatherWarnings');
  assertEq(r.json.notAssessedRisks, [], 'notAssessedRisks');
  assertEq(r.json.weather.dataStatus, 'sample', 'weather labelled as sample');
  assertEq(r.json.aiStatus, 'skipped', 'Gemini not called');
});

Deno.test('stale weather -> no risks, no warnings, no assessment', async () => {
  const deps = makeDeps();
  deps.fetchWeather = () => {
    const w = makeWeather(allDays({ max: 45, rain: 300 }));
    w.daily = w.daily.map((d, i) => ({ ...d, date: dateOffset(-40 + i) }));
    return Promise.resolve({ weather: w, is_fallback: false });
  };
  const r = await call({ ...base, crop: 'sugarcane', growthStage: 'germination' }, deps);
  assertEq(r.json.assessmentStatus, 'insufficient_data', 'assessmentStatus');
  assertEq(r.json.insufficientReason, 'stale_weather', 'reason');
  assertEq(r.json.risks, [], 'risks');
  assertEq(r.json.weatherWarnings, [], 'weatherWarnings');
});

Deno.test('missing measurement -> relevant rule skipped, never treated as zero or as a warning', async () => {
  const deps = makeDeps();
  deps.fetchWeather = () => {
    const w = makeWeather(withDays({ 1: { max: 40, rain: 300 } }));
    w.daily[1] = { ...w.daily[1], max_temp_c: null, precipitation_mm: null }; // the hot, wet day has no values
    w.daily[3] = { ...w.daily[3], max_temp_c: 41 }; // a real hot day still triggers
    return Promise.resolve({ weather: w, is_fallback: false });
  };
  const r = await call({ ...base, crop: 'sugarcane', growthStage: 'tillering' }, deps);
  assertEq(r.json.weatherWarnings.map((x: { date: string }) => x.date), [dateOffset(3)], 'only the day with data');
  assertTrue(r.json.notes.length > 0, 'a note says some values were missing');
  assertEq(r.json.risks, [], 'no risks');
});

Deno.test('all relevant measurements missing -> nothing triggered, not an error', async () => {
  const deps = makeDeps();
  deps.fetchWeather = () => {
    const w = makeWeather(SAHARANPUR);
    w.daily = w.daily.map((d) => ({ ...d, max_temp_c: null, precipitation_mm: null }));
    return Promise.resolve({ weather: w, is_fallback: false });
  };
  const r = await call({ ...base, crop: 'sugarcane', growthStage: 'germination' }, deps);
  assertEq(r.status, 200, 'status');
  assertEq(r.json.weatherWarnings, [], 'no warnings from missing data');
  assertTrue(r.json.notes.length > 0, 'note explains skipped checks');
});

Deno.test('Gemini unavailable -> rule-based advisory, deterministic results unchanged', async () => {
  const rows = withDays({ 3: { max: 36 } });
  const off = await call({ ...base, crop: 'wheat', growthStage: 'grain_development_maturity' }, makeDeps({ rows }));
  assertEq(off.json.aiStatus, 'fallback', 'aiStatus');
  assertEq(off.json.advisory.writtenBy, 'rules', 'rule-based');
  assertTrue(off.json.advisory.actions.length > 0, 'monitoring action present');
  const failing = await call({ ...base, crop: 'wheat', growthStage: 'grain_development_maturity' },
    makeDeps({ rows, explain: () => Promise.resolve({ ok: false as const, reason: 'AI_HTTP_503' }) }));
  assertEq(failing.json.aiNote, 'AI_HTTP_503', 'reason code kept');
  assertEq(failing.json.weatherWarnings, off.json.weatherWarnings, 'warnings identical');
  assertEq(failing.json.risks, off.json.risks, 'risks identical');
});

Deno.test('Gemini explains warnings but cannot change them or add risks', async () => {
  const rows = withDays({ 3: { max: 36 } });
  let seen: Parameters<Deps['explain']>[0] | null = null;
  const explain: Deps['explain'] = (args) => {
    seen = args;
    return Promise.resolve({
      ok: true as const,
      explanation: {
        summary: 'Hot afternoons are forecast while your wheat fills grain. Keep watching the crop.',
        risks: [],
        actions: ['Monitor the crop and local weather advisories.'],
      },
    });
  };
  const plain = await call({ ...base, crop: 'wheat', growthStage: 'grain_development_maturity' }, makeDeps({ rows }));
  const ai = await call({ ...base, crop: 'wheat', growthStage: 'grain_development_maturity' }, makeDeps({ rows, explain }));
  assertEq(ai.json.aiStatus, 'completed', 'aiStatus');
  assertEq(ai.json.advisory.writtenBy, 'ai', 'written by ai');
  assertEq(ai.json.weatherWarnings, plain.json.weatherWarnings, 'warnings unchanged by Gemini');
  assertEq(ai.json.risks, [], 'Gemini cannot create risks');
  assertEq(seen!.risks.length, 0, 'no risks sent');
  assertEq(seen!.warnings!.length, 1, 'warning sent for explanation');
  assertEq(seen!.warnings![0].peak_value, 36, 'forecast value sent');
});

Deno.test('Gemini is not called when nothing was triggered or the weather is unusable', async () => {
  let calls = 0;
  const explain: Deps['explain'] = () => { calls++; return Promise.resolve({ ok: false as const, reason: 'x' }); };
  await call({ ...base, crop: 'wheat', growthStage: 'early_growth' }, makeDeps({ explain }));
  await call({ ...base, crop: 'wheat', growthStage: 'early_growth' }, makeDeps({ explain, sample: true }));
  assertEq(calls, 0, 'explain never called');
});

Deno.test('Hindi request returns Hindi warning, caveat and not-assessed text', async () => {
  const r = await call({ ...base, language: 'hi', crop: 'sugarcane', growthStage: 'grand_growth' }, makeDeps({ rows: withDays({ 2: { max: 40 } }) }));
  const dev = /[\u0900-\u097F]/;
  assertTrue(dev.test(r.json.weatherWarnings[0].message), 'warning message in Hindi');
  assertTrue(dev.test(r.json.weatherWarnings[0].caveat), 'caveat in Hindi');
  assertTrue(dev.test(r.json.notAssessedRisks[0].explanation), 'not-assessed text in Hindi');
  assertTrue(dev.test(r.json.advisory.summary), 'advisory in Hindi');
});

Deno.test('not-assessed list is limited to what is relevant to the crop and stage', async () => {
  const w = await call({ ...base, crop: 'wheat', growthStage: 'early_growth' }, makeDeps());
  assertEq(ids(w.json.notAssessedRisks), ['water_stress', 'waterlogging', 'wheat_frost_damage', 'crop_disease'], 'wheat early growth');
  const s = await call({ ...base, crop: 'sugarcane', growthStage: 'germination' }, makeDeps());
  assertEq(ids(s.json.notAssessedRisks), ['water_stress', 'waterlogging', 'sugarcane_frost_damage', 'sugarcane_heat_damage', 'crop_disease'], 'sugarcane germination');
  for (const n of [...w.json.notAssessedRisks, ...s.json.notAssessedRisks]) {
    assertTrue(typeof n.id === 'string' && typeof n.name === 'string' && typeof n.reason === 'string' && typeof n.explanation === 'string', 'object shape');
  }
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
  // With only weather warnings (no input risks), any risk item from Gemini is invented -> rejected.
  assertEq(parseGeminiExplanation(ok, [], ''), null, 'invented risk rejected when no risks were given');
  const none = '{"summary":"s","risks":[],"actions":["do x"]}';
  assertTrue(parseGeminiExplanation(none, [], '') !== null, 'empty risks accepted');
});

Deno.test('sugarcane_heat_damage is listed as not assessed at every sugarcane stage, and never for wheat', async () => {
  for (const stage of ['germination', 'tillering', 'grand_growth', 'maturity_ripening']) {
    const r = await call({ ...base, crop: 'sugarcane', growthStage: stage }, makeDeps());
    const item = r.json.notAssessedRisks.find((x: { id: string }) => x.id === 'sugarcane_heat_damage');
    assertTrue(item !== undefined, `sugarcane_heat_damage missing at ${stage}`);
    assertEq(item.reason, 'no_validated_threshold', `reason at ${stage}`);
  }
  for (const stage of ['early_growth', 'crown_root', 'vegetative_growth', 'reproductive', 'grain_development_maturity']) {
    const r = await call({ ...base, crop: 'wheat', growthStage: stage }, makeDeps());
    assertTrue(!ids(r.json.notAssessedRisks).includes('sugarcane_heat_damage'), `wheat must not list sugarcane heat (${stage})`);
  }
});

Deno.test('sugarcane heat warning and the heat-damage not-assessed item appear together', async () => {
  const r = await call({ ...base, crop: 'sugarcane', growthStage: 'maturity_ripening' }, makeDeps({ rows: allDays({ max: 39 }) }));
  assertTrue(r.json.weatherWarnings.length > 0, 'informational heat warning present');
  assertEq(r.json.risks, [], 'still no crop risk');
  assertTrue(ids(r.json.notAssessedRisks).includes('sugarcane_heat_damage'), 'heat damage listed as not assessed');
});

Deno.test('weather block uses dataQualityNotes and no longer has weather.warnings', async () => {
  const r = await call({ ...base, crop: 'wheat', growthStage: 'early_growth' }, makeDeps());
  assertTrue(Array.isArray(r.json.weather.dataQualityNotes), 'dataQualityNotes is an array');
  assertTrue(!('warnings' in r.json.weather), 'old weather.warnings key must be gone');
  assertTrue(Array.isArray(r.json.weatherWarnings), 'top-level weatherWarnings still exists');
});
