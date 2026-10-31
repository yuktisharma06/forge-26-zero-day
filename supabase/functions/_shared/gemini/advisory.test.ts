// Run with: node --experimental-strip-types --test supabase/functions/_shared/gemini/advisory.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { runRiskEngine } from '../risk-engine/index.ts';
import { generateAiAdvisory } from './advisory.ts';
import { validateAiOutput, normalizeDigits } from './guard.ts';
import { buildFacts, buildRequestBody } from './prompt.ts';
import type { DailyForecast, Language } from '../types.ts';

// ── fixtures ─────────────────────────────────────────────────────────────────
function day(date: string, o: Partial<DailyForecast> = {}): DailyForecast {
  return { date, max_temp_c: 25, min_temp_c: 12, precipitation_mm: 0, precipitation_probability_pct: 10, humidity_pct: 60, wind_speed_kmh: 10, ...o };
}
// One High heat risk + one Low heavy-rain risk, both on 2026-11-04.
const hotWet = runRiskEngine({
  crop: 'wheat', growth_stage: 'grain_development_maturity', is_fallback: false,
  daily_forecast: [day('2026-11-02'), day('2026-11-03', { max_temp_c: 33 }), day('2026-11-04', { max_temp_c: 36, precipitation_mm: 70 })],
});
const calm = runRiskEngine({ crop: 'wheat', growth_stage: 'grain_development_maturity', is_fallback: false, daily_forecast: [day('2026-11-02')] });
const noData = runRiskEngine({ crop: 'wheat', growth_stage: 'grain_development_maturity', is_fallback: true, daily_forecast: [day('2026-11-02')] });

const HEAT = 'wheat_grain_fill_heat';
const RAIN = 'wheat_heavy_rainfall_event';

const goodEn = {
  summary: 'A very hot day is forecast on 2026-11-04 while your wheat is filling grain. Heavy rain is also forecast that day.',
  risks: [
    { rule_id: HEAT, why_it_matters: 'Very hot days can stop the wheat from growing well while the grain is filling.', crop_impact: 'Hot weather at this stage can shorten the time the grain has to fill.', what_to_do: ['Ask your local KVK about light irrigation.', 'Ask about an early-harvest plan for your field.'] },
    { rule_id: RAIN, why_it_matters: 'This is a heavy-rain warning. It does not mean the field is waterlogged.', crop_impact: 'Standing water can be a problem for the crop, so drainage is worth checking.', what_to_do: ['Keep drain channels open and clear.', 'Hold off irrigation until the rain has passed.'] },
  ],
};
const goodHi = {
  summary: '4 नवंबर को बहुत गर्मी और तेज बारिश का पूर्वानुमान है। आपकी गेहूं की फसल दाना भर रही है।',
  risks: [
    { rule_id: HEAT, why_it_matters: 'बहुत गर्म दिन दाना भरने के समय फसल की बढ़वार रोक सकते हैं।', crop_impact: 'इस अवस्था में गर्मी से दाना भरने का समय कम हो सकता है।', what_to_do: ['हल्की सिंचाई के बारे में स्थानीय KVK से पूछें।'] },
    { rule_id: RAIN, why_it_matters: 'यह तेज बारिश की चेतावनी है, खेत में जलभराव की पुष्टि नहीं।', crop_impact: 'खेत में पानी रुकना फसल के लिए समस्या हो सकता है।', what_to_do: ['जल निकासी की नालियां साफ रखें।', 'बारिश बीतने तक सिंचाई रोकें।'] },
  ],
};

function geminiReply(payload: unknown, extra: Record<string, unknown> = {}) {
  const body = { candidates: [{ content: { parts: [{ text: typeof payload === 'string' ? payload : JSON.stringify(payload) }] }, finishReason: 'STOP' }], ...extra };
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}
function mockFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return await handler(url, init); }) as unknown as typeof fetch;
  return { fn, calls };
}
const run = (language: Language, deps: Parameters<typeof generateAiAdvisory>[1], engine = hotWet) =>
  generateAiAdvisory({ crop: 'wheat', growth_stage: 'grain_development_maturity', language, engine }, deps);

// ── happy path ────────────────────────────────────────────────────────────────
test('engine fixture has the two risks the tests expect', () => {
  assert.deepEqual(hotWet.detected_risks.map((r) => r.rule_id).sort(), [HEAT, RAIN].sort());
});

test('English: Gemini output accepted when it passes every guardrail', async () => {
  const m = mockFetch(() => geminiReply(goodEn));
  const a = await run('en', { apiKey: 'k', model: 'm1', fetchImpl: m.fn });
  assert.equal(a.status, 'generated');
  assert.equal(a.generated_by, 'gemini');
  assert.equal(a.model, 'm1');
  assert.deepEqual(a.risks.map((r) => r.rule_id), hotWet.detected_risks.map((r) => r.rule_id), 'engine order kept');
  assert.ok(a.disclaimer.length > 20);
});

test('Hindi: Devanagari output accepted, Devanagari digits normalised', async () => {
  const m = mockFetch(() => geminiReply(goodHi));
  const a = await run('hi', { apiKey: 'k', fetchImpl: m.fn });
  assert.equal(a.status, 'generated');
  assert.equal(normalizeDigits('४ नवंबर'), '4 नवंबर');
});

test('Gemini output never carries severity or thresholds (engine data stays authoritative)', async () => {
  const m = mockFetch(() => geminiReply({ ...goodEn, risks: goodEn.risks.map((r) => ({ ...r, severity: 'Low' })) }));
  const a = await run('en', { apiKey: 'k', fetchImpl: m.fn });
  for (const r of a.risks) assert.equal('severity' in r, false);
});

// ── request contents ────────────────────────────────────────────────────────────
test('request: key in header only, facts-only prompt, no location/raw forecast', async () => {
  const m = mockFetch(() => geminiReply(goodEn));
  await run('en', { apiKey: 'SECRET-KEY', model: 'test-model', fetchImpl: m.fn });
  const { url, init } = m.calls[0];
  assert.match(url, /models\/test-model:generateContent$/);
  assert.equal(url.includes('SECRET-KEY'), false, 'key must not be in the URL');
  assert.equal((init.headers as Record<string, string>)['x-goog-api-key'], 'SECRET-KEY');
  const body = JSON.parse(String(init.body));
  assert.equal(body.generationConfig.responseMimeType, 'application/json');
  assert.ok(body.generationConfig.temperature <= 0.3);
  const prompt = body.contents[0].parts[0].text as string;
  assert.ok(prompt.includes(HEAT) && prompt.includes('approved_action_en'));
  assert.equal(prompt.includes('Saharanpur'), false);
  assert.equal(prompt.includes('precipitation_probability_pct'), false, 'raw forecast not sent');
  assert.match(body.systemInstruction.parts[0].text, /NEVER mention pesticides/);
});

test('response never leaks the API key', async () => {
  const m = mockFetch(() => geminiReply(goodEn));
  const a = await run('en', { apiKey: 'SECRET-KEY', fetchImpl: m.fn });
  assert.equal(JSON.stringify(a).includes('SECRET-KEY'), false);
});

// ── fallback paths ────────────────────────────────────────────────────────────────
test('no API key → fallback built from engine text, Gemini not called', async () => {
  const m = mockFetch(() => geminiReply(goodEn));
  const a = await run('en', { fetchImpl: m.fn });
  assert.equal(m.calls.length, 0);
  assert.equal(a.status, 'fallback');
  assert.equal(a.fallback_reason, 'not_configured');
  assert.equal(a.generated_by, 'deterministic_fallback');
  assert.equal(a.risks.length, 2);
  assert.equal(a.risks[0].what_to_do[0], hotWet.detected_risks[0].precautionary_action);
});

test('Hindi fallback uses the engine Hindi action text', async () => {
  const a = await run('hi', {});
  assert.equal(a.status, 'fallback');
  assert.equal(a.risks[0].what_to_do[0], hotWet.detected_risks[0].precautionary_action_hi);
});

test('HTTP error → fallback api_error', async () => {
  const m = mockFetch(() => new Response('boom', { status: 503 }));
  const a = await run('en', { apiKey: 'k', fetchImpl: m.fn });
  assert.equal(a.fallback_reason, 'api_error');
  assert.equal(a.risks.length, 2);
});

test('timeout → fallback timeout', async () => {
  const m = mockFetch(() => { const e = new Error('t'); e.name = 'TimeoutError'; throw e; });
  assert.equal((await run('en', { apiKey: 'k', fetchImpl: m.fn })).fallback_reason, 'timeout');
});

test('network failure → fallback api_error', async () => {
  const m = mockFetch(() => { throw new TypeError('fetch failed'); });
  assert.equal((await run('en', { apiKey: 'k', fetchImpl: m.fn })).fallback_reason, 'api_error');
});

test('safety block → fallback blocked', async () => {
  const m = mockFetch(() => new Response(JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } }), { status: 200 }));
  assert.equal((await run('en', { apiKey: 'k', fetchImpl: m.fn })).fallback_reason, 'blocked');
});

test('truncated output → fallback invalid_output', async () => {
  const m = mockFetch(() => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"summary":"x' }] }, finishReason: 'MAX_TOKENS' }] }), { status: 200 }));
  assert.equal((await run('en', { apiKey: 'k', fetchImpl: m.fn })).fallback_reason, 'invalid_output');
});

test('not JSON → fallback invalid_output', async () => {
  const m = mockFetch(() => geminiReply('Sure! Here is your advice.'));
  assert.equal((await run('en', { apiKey: 'k', fetchImpl: m.fn })).fallback_reason, 'invalid_output');
});

test('JSON wrapped in code fences is still accepted', async () => {
  const m = mockFetch(() => geminiReply('```json\n' + JSON.stringify(goodEn) + '\n```'));
  assert.equal((await run('en', { apiKey: 'k', fetchImpl: m.fn })).status, 'generated');
});

test('fallback never changes the engine results', async () => {
  const before = JSON.stringify(hotWet);
  await run('en', {});
  assert.equal(JSON.stringify(hotWet), before);
});

// ── nothing to explain ──────────────────────────────────────────────────────────────
test('no risks flagged → Gemini not called', async () => {
  const m = mockFetch(() => geminiReply(goodEn));
  const a = await run('en', { apiKey: 'k', fetchImpl: m.fn }, calm);
  assert.equal(m.calls.length, 0);
  assert.equal(a.status, 'not_needed');
  assert.equal(a.risks.length, 0);
  assert.match(a.summary, /None of the checks/);
});

test('engine could not assess → Gemini not called, says so honestly', async () => {
  const m = mockFetch(() => geminiReply(goodEn));
  const a = await run('hi', { apiKey: 'k', fetchImpl: m.fn }, noData);
  assert.equal(m.calls.length, 0);
  assert.equal(a.status, 'not_needed');
  assert.match(a.summary, /नहीं हो सकी/);
});

// ── guardrails ────────────────────────────────────────────────────────────────────────
const facts = buildFacts({ crop: 'wheat', growth_stage: 'grain_development_maturity', engine: hotWet });
const withRisk0 = (patch: Record<string, unknown>) => ({ ...goodEn, risks: [{ ...goodEn.risks[0], ...patch }, goodEn.risks[1]] });
const hiWith = (patch: Record<string, unknown>) => ({ ...goodHi, risks: [{ ...goodHi.risks[0], ...patch }, goodHi.risks[1]] });
const rejected = (payload: unknown, lang: Language = 'en') => {
  const r = validateAiOutput(payload, facts, lang);
  assert.equal(r.ok, false);
  return r as Extract<typeof r, { ok: false }>;
};

test('guard: accepts the good fixtures', () => {
  assert.equal(validateAiOutput(goodEn, facts, 'en').ok, true);
  assert.equal(validateAiOutput(goodHi, facts, 'hi').ok, true);
});

test('guard: rejects a missing or extra risk, or a duplicate', () => {
  rejected({ ...goodEn, risks: [goodEn.risks[0]] });
  rejected({ ...goodEn, risks: [...goodEn.risks, { ...goodEn.risks[0], rule_id: 'invented_rule' }] });
  rejected({ ...goodEn, risks: [goodEn.risks[0], goodEn.risks[0]] });
});

test('guard: rejects an invented temperature / threshold', () => {
  const r = rejected(withRisk0({ why_it_matters: 'Wheat suffers when the temperature goes above 40 degrees.' }));
  assert.equal(r.reason, 'guardrail_rejected');
  rejected(withRisk0({ crop_impact: 'Yield can fall by 20 percent.' }));
});

test('guard: allows numbers that are in the engine results', () => {
  assert.equal(validateAiOutput(withRisk0({ why_it_matters: 'The temperature may reach 36 °C on 2026-11-04, above the 35 °C limit.' }), facts, 'en').ok, true);
});

test('guard: rejects doses and quantities in English', () => {
  // 4 and 36 appear in the engine results, so the number check passes and only the dose rule can reject.
  for (const t of ['Mix 4 ml in a tank.', 'Apply 36 kg per acre.', 'Use 4 g of it.', 'Use a 4% solution.', 'Add it per acre.']) {
    const r = rejected(withRisk0({ what_to_do: [t] }));
    assert.match(r.detail, /dose or quantity/, t);
  }
});

test('guard: rejects doses and quantities in Hindi', () => {
  assert.match(rejected(hiWith({ what_to_do: ['4 मिली डालें।'] }), 'hi').detail, /dose or quantity/);
  assert.match(rejected(hiWith({ what_to_do: ['४ किलो डालें।'] }), 'hi').detail, /dose or quantity/);
  assert.match(rejected(hiWith({ what_to_do: ['प्रति एकड़ देखें।'] }), 'hi').detail, /dose or quantity/);
  assert.match(rejected(hiWith({ what_to_do: ['36 ग्राम डालें।'] }), 'hi').detail, /dose or quantity/);
});

test('guard: rejects chemical and treatment terms (English)', () => {
  for (const t of ['Spray a fungicide.', 'Apply urea now.', 'Use a pesticide.', 'Spraying helps.', 'Add fertiliser.']) {
    assert.equal(rejected(withRisk0({ what_to_do: [t] })).reason, 'guardrail_rejected');
  }
});

test('guard: rejects chemical and treatment terms (Hindi) but not unrelated words', () => {
  assert.match(rejected(hiWith({ what_to_do: ['कीटनाशक का उपयोग करें।'] }), 'hi').detail, /chemical/);
  assert.match(rejected(hiWith({ what_to_do: ['खाद डालें।'] }), 'hi').detail, /chemical/);
  assert.match(rejected(hiWith({ what_to_do: ['छिड़काव करें।'] }), 'hi').detail, /chemical/);
  // "खाद्य" (food) contains the letters of "खाद" but is a different word: must be accepted.
  assert.equal(validateAiOutput(hiWith({ what_to_do: ['खाद्य सुरक्षा के लिए स्थानीय KVK से पूछें।'] }), facts, 'hi').ok, true);
});

test('guard: wrong language is rejected', () => {
  rejected(goodHi, 'en');   // Hindi when English was asked
  rejected(goodEn, 'hi');   // English when Hindi was asked
});

test('guard: malformed shapes are rejected', () => {
  rejected(null);
  rejected({ summary: '', risks: [] });
  rejected({ ...goodEn, risks: [{ ...goodEn.risks[0], what_to_do: [] }, goodEn.risks[1]] });
  rejected({ ...goodEn, summary: 'x'.repeat(900) });
});

test('guardrail rejection in the full flow → fallback with the reason', async () => {
  const m = mockFetch(() => geminiReply(withRisk0({ what_to_do: ['Spray 200 ml of fungicide per acre.'] })));
  const a = await run('en', { apiKey: 'k', fetchImpl: m.fn });
  assert.equal(a.status, 'fallback');
  assert.equal(a.fallback_reason, 'guardrail_rejected');
  assert.equal(JSON.stringify(a).includes('fungicide'), false, 'rejected text must not reach the farmer');
});

test('fixed engine action texts themselves pass the guard (no self-rejection)', () => {
  const engineText = hotWet.detected_risks.map((r) => ({ en: r.precautionary_action, hi: r.precautionary_action_hi ?? '' }));
  for (const t of engineText) {
    const ok = withRisk0({ what_to_do: [t.en] });
    assert.equal(validateAiOutput(ok, facts, 'en').ok, true, t.en);
  }
});

test('request body builder produces the expected structure', () => {
  const b = buildRequestBody(facts, 'hi');
  assert.equal(b.generationConfig.responseSchema.type, 'OBJECT');
  assert.match(b.contents[0].parts[0].text, /Hindi/);
});
