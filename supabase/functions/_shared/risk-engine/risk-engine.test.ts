// Run with:  node --experimental-strip-types --test functions/_shared/risk-engine/
//       or:  deno test functions/_shared/risk-engine/   (Deno supports node:test)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { runRiskEngine, isValidCropStage } from './index.ts';
import { WHEAT_RISK_RULES, WHEAT_STAGES } from './wheat-rules.ts';
import { SUGARCANE_RISK_RULES, SUGARCANE_STAGES } from './sugarcane-rules.ts';
import type { DailyForecast, GrowthStage, CropType } from '../types.ts';

// ── helpers ──────────────────────────────────────────────────────────────────
function day(date: string, o: Partial<DailyForecast> = {}): DailyForecast {
  return {
    date,
    max_temp_c: 25,
    min_temp_c: 12,
    precipitation_mm: 0,
    precipitation_probability_pct: 10,
    humidity_pct: 60,
    wind_speed_kmh: 10,
    ...o,
  };
}
const D = (n: number) => `2026-11-${String(n).padStart(2, '0')}`;
function run(crop: CropType, stage: GrowthStage, days: DailyForecast[], extra = {}) {
  return runRiskEngine({ crop, growth_stage: stage, daily_forecast: days, is_fallback: false, ...extra });
}
const mild = () => [day(D(1)), day(D(2)), day(D(3))];

// ── guards ───────────────────────────────────────────────────────────────────
test('fallback weather → insufficient_data, nothing assessed', () => {
  const r = runRiskEngine({ crop: 'wheat', growth_stage: 'reproductive', daily_forecast: [day(D(1), { max_temp_c: 40 })], is_fallback: true });
  assert.equal(r.status, 'insufficient_data');
  assert.equal(r.detected_risks.length, 0);
});

test('stale weather → insufficient_data', () => {
  const r = run('wheat', 'reproductive', mild(), { is_stale: true });
  assert.equal(r.status, 'insufficient_data');
});

test('empty forecast → insufficient_data', () => {
  assert.equal(run('wheat', 'reproductive', []).status, 'insufficient_data');
});

test('invalid crop/stage → invalid_input', () => {
  assert.equal(run('wheat', 'tillering', mild()).status, 'invalid_input');
  assert.equal(run('sugarcane', 'crown_root', mild()).status, 'invalid_input');
  assert.equal(isValidCropStage('wheat', 'crown_root'), true);
});

test('mild forecast → status ok with no risks', () => {
  const r = run('wheat', 'grain_development_maturity', mild());
  assert.equal(r.status, 'ok');
  assert.equal(r.detected_risks.length, 0);
});

// ── wheat heat ───────────────────────────────────────────────────────────────
test('wheat grain-fill heat: boundary and tiers', () => {
  const at = (t: number) => run('wheat', 'grain_development_maturity', [day(D(1), { max_temp_c: t })]);
  assert.equal(at(30).detected_risks.length, 0, '30 °C is not above 30');
  assert.equal(at(31).detected_risks[0].severity, 'Low');
  assert.equal(at(35).detected_risks[0].severity, 'Low', '35 is not above 35');
  assert.equal(at(35.5).detected_risks[0].severity, 'High');
});

test('only the highest tier is reported, once per rule', () => {
  const r = run('wheat', 'grain_development_maturity', [day(D(1), { max_temp_c: 32 }), day(D(2), { max_temp_c: 37 })]);
  const heat = r.detected_risks.filter((x) => x.rule_id === 'wheat_grain_fill_heat');
  assert.equal(heat.length, 1);
  assert.equal(heat[0].severity, 'High');
  assert.deepEqual(heat[0].forecast_period.triggered_dates, [D(2)]);
});

test('forecast period spans first to last triggering day', () => {
  const r = run('wheat', 'grain_development_maturity', [
    day(D(1), { max_temp_c: 31 }), day(D(2), { max_temp_c: 25 }), day(D(3), { max_temp_c: 33 }), day(D(4), { max_temp_c: 32 }),
  ]);
  const h = r.detected_risks[0];
  assert.equal(h.forecast_period.start_date, D(1));
  assert.equal(h.forecast_period.end_date, D(4));
  assert.deepEqual(h.forecast_period.triggered_dates, [D(1), D(3), D(4)]);
  assert.equal(h.peak_observed_value, 33);
  assert.equal(h.peak_observed_date, D(3));
});

test('wheat reproductive heat uses the anthesis limit', () => {
  const r = run('wheat', 'reproductive', [day(D(1), { max_temp_c: 27 })]);
  assert.equal(r.detected_risks[0].risk_name, 'Flowering Heat Stress');
  assert.equal(r.detected_risks[0].severity, 'Low');
});

test('wheat heat is not flagged at earlier stages (no verified threshold)', () => {
  const r = run('wheat', 'vegetative_growth', [day(D(1), { max_temp_c: 40 })]);
  assert.equal(r.detected_risks.length, 0);
  assert.ok(r.not_assessed.some((n) => n.risk_name === 'Heat stress' && n.reason === 'no_supported_data'));
});

// ── wheat freeze ─────────────────────────────────────────────────────────────
test('wheat reproductive freeze: tiers', () => {
  const at = (t: number) => run('wheat', 'reproductive', [day(D(1), { min_temp_c: t })]).detected_risks.filter((x) => x.rule_id === 'wheat_reproductive_freeze');
  assert.equal(at(0.5).length, 0);
  assert.equal(at(0)[0].severity, 'Moderate');
  assert.equal(at(-1.9)[0].severity, 'Moderate');
  assert.equal(at(-2)[0].severity, 'High');
});

// ── rainfall ─────────────────────────────────────────────────────────────────
test('rainfall uses IMD categories only', () => {
  const at = (mm: number) => run('wheat', 'crown_root', [day(D(1), { precipitation_mm: mm })]).detected_risks;
  assert.equal(at(30).length, 0, 'old invented 30 mm rule is gone');
  assert.equal(at(64.4).length, 0);
  assert.equal(at(64.5)[0].severity, 'Low');
  assert.equal(at(115.6)[0].severity, 'Moderate');
  assert.equal(at(204.5)[0].severity, 'High');
});

test('rainfall result never claims confirmed waterlogging', () => {
  const r = run('sugarcane', 'tillering', [day(D(1), { precipitation_mm: 120 })]).detected_risks[0];
  assert.match(r.reason, /does not confirm waterlogging/i);
  assert.ok(r.caveats.some((c) => /does not confirm waterlogging/i.test(c)));
  assert.doesNotMatch(r.risk_name, /confirmed/i);
});

// ── sugarcane ────────────────────────────────────────────────────────────────
test('sugarcane frost tiers follow SASRI stages', () => {
  const at = (t: number) => run('sugarcane', 'grand_growth', [day(D(1), { min_temp_c: t })]).detected_risks.filter((x) => x.rule_id === 'sugarcane_frost');
  assert.equal(at(-1.9).length, 0);
  assert.equal(at(-2)[0].severity, 'Low');
  assert.equal(at(-4)[0].severity, 'Moderate');
  assert.equal(at(-5)[0].severity, 'Moderate', 'exactly -5 is not below -5');
  assert.equal(at(-5.1)[0].severity, 'High');
});

test('sugarcane frost is not applied at germination', () => {
  const r = run('sugarcane', 'germination', [day(D(1), { min_temp_c: -6 })]);
  assert.equal(r.detected_risks.filter((x) => x.rule_id === 'sugarcane_frost').length, 0);
});

test('sugarcane heat above 38 °C', () => {
  assert.equal(run('sugarcane', 'tillering', [day(D(1), { max_temp_c: 38 })]).detected_risks.length, 0);
  assert.equal(run('sugarcane', 'tillering', [day(D(1), { max_temp_c: 39 })]).detected_risks[0].severity, 'Low');
});

test('sugarcane non-freezing cold is not flagged', () => {
  assert.equal(run('sugarcane', 'tillering', [day(D(1), { min_temp_c: 8 })]).detected_risks.length, 0);
});

test('sugarcane water stress is reported as not assessed', () => {
  const r = run('sugarcane', 'grand_growth', mild());
  const w = r.not_assessed.find((n) => n.risk_name === 'Water stress');
  assert.ok(w);
  assert.equal(w!.reason, 'no_supported_data');
});

// ── missing data ─────────────────────────────────────────────────────────────
test('missing parameter → that risk not_assessed, others still run', () => {
  const days = [day(D(1), { max_temp_c: null, precipitation_mm: 130 }), day(D(2), { max_temp_c: null })];
  const r = run('wheat', 'grain_development_maturity', days);
  assert.equal(r.status, 'ok');
  assert.ok(r.not_assessed.some((n) => n.rule_id === 'wheat_grain_fill_heat' && n.reason === 'insufficient_data'));
  assert.equal(r.detected_risks[0].rule_id, 'wheat_heavy_rainfall_event');
});

test('partial missing days are reported in data_coverage', () => {
  const r = run('wheat', 'grain_development_maturity', [day(D(1), { max_temp_c: null }), day(D(2), { max_temp_c: 33 })]);
  assert.deepEqual(r.detected_risks[0].data_coverage, { days_with_data: 1, days_in_forecast: 2 });
});

test('NaN is treated as missing', () => {
  const r = run('wheat', 'grain_development_maturity', [day(D(1), { max_temp_c: NaN })]);
  assert.ok(r.not_assessed.some((n) => n.rule_id === 'wheat_grain_fill_heat'));
});

test('every needed parameter missing → insufficient_data, not "no risk"', () => {
  const blank = { max_temp_c: null, min_temp_c: null, precipitation_mm: null } as Partial<DailyForecast>;
  const r = run('wheat', 'reproductive', [day(D(1), blank), day(D(2), blank)]);
  assert.equal(r.status, 'insufficient_data');
  assert.equal(r.detected_risks.length, 0);
});

// ── determinism / output shape ───────────────────────────────────────────────
test('deterministic and does not mutate input', () => {
  const input = [day(D(1), { max_temp_c: 36, precipitation_mm: 70 })];
  const snapshot = JSON.stringify(input);
  const a = run('wheat', 'grain_development_maturity', input);
  const b = run('wheat', 'grain_development_maturity', input);
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(input), snapshot);
});

test('results are sorted by severity, highest first', () => {
  const r = run('wheat', 'grain_development_maturity', [day(D(1), { max_temp_c: 36, precipitation_mm: 70 })]);
  assert.deepEqual(r.detected_risks.map((x) => x.severity), ['High', 'Low']);
});

test('every detected risk carries all required fields', () => {
  const r = run('wheat', 'grain_development_maturity', [day(D(1), { max_temp_c: 36 })]).detected_risks[0];
  for (const k of ['risk_name', 'severity', 'weather_condition', 'forecast_period', 'reason', 'source'] as const) {
    assert.ok(r[k], `${k} missing`);
  }
  assert.ok(['Low', 'Moderate', 'High'].includes(r.severity));
  assert.ok(r.source.name && r.source.url && r.source.citation);
});

// ── rule-book audit: fails if a rule is added without a source ───────────────
test('audit: every tier has a named, cited source and a severity basis', () => {
  for (const rule of [...WHEAT_RISK_RULES, ...SUGARCANE_RISK_RULES]) {
    assert.ok(rule.tiers.length > 0, rule.id);
    assert.ok(rule.caveats.length > 0, `${rule.id} needs caveats`);
    let last = 0;
    for (const t of rule.tiers) {
      assert.ok(t.source?.name && t.source?.citation && t.source?.url, `${rule.id}: source incomplete`);
      assert.ok(t.severity_basis.length > 20, `${rule.id}: severity_basis missing`);
      const rank = { Low: 1, Moderate: 2, High: 3 }[t.severity];
      assert.ok(rank > last, `${rule.id}: tiers must ascend in severity`);
      last = rank;
    }
  }
});

test('audit: every stage has at least one rule', () => {
  for (const s of WHEAT_STAGES) assert.ok(WHEAT_RISK_RULES.some((r) => r.growth_stages.includes(s)), s);
  for (const s of SUGARCANE_STAGES) assert.ok(SUGARCANE_RISK_RULES.some((r) => r.growth_stages.includes(s)), s);
});
