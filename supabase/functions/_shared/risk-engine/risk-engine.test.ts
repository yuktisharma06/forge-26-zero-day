// Run with:  node --experimental-strip-types --test _shared/risk-engine/risk-engine.test.ts
//       or:  deno test _shared/risk-engine/   (Deno supports node:test)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { runRiskEngine, isValidCropStage } from './index.ts';
import { WHEAT_RISK_RULES, WHEAT_STAGES } from './wheat-rules.ts';
import { SUGARCANE_RISK_RULES, SUGARCANE_STAGES } from './sugarcane-rules.ts';
import type { CropType, DailyForecast, GrowthStage, RiskRule } from '../types.ts';

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

// A FAKE rule used only to test the severity machinery. It is not an agricultural rule.
const FAKE_SOURCE = { name: 'Test source', citation: 'Test citation', evidence_type: 'extension_guidance' as const };
const FAKE_RULE: RiskRule = {
  id: 'fake_heat',
  crop: 'wheat',
  growth_stages: ['reproductive'],
  risk_name: 'Fake heat',
  weather_parameter: 'max_temp_c',
  condition_label: 'Maximum temperature',
  threshold_unit: '°C',
  tiers: [
    { severity: 'Low', threshold_operator: 'gt', threshold_value: 30, source: FAKE_SOURCE, severity_basis: 'test low' },
    { severity: 'High', threshold_operator: 'gt', threshold_value: 35, source: FAKE_SOURCE, severity_basis: 'test high' },
  ],
  caveats: ['test caveat'],
  precautionary_action: 'test action',
};
const withFake = (days: DailyForecast[], extra = {}) => run('wheat', 'reproductive', days, { rules: [FAKE_RULE], ...extra });

// ── decision: no validated crop-risk rules exist today ───────────────────────
test('no severity-bearing crop-risk rules are defined (team-lead decision, spec v1.0)', () => {
  assert.equal(WHEAT_RISK_RULES.length, 0);
  assert.equal(SUGARCANE_RISK_RULES.length, 0);
});

test('extreme weather never creates a crop risk at any stage of either crop', () => {
  const extreme = [day(D(1), { max_temp_c: 45, min_temp_c: -6, precipitation_mm: 300 })];
  for (const [crop, stages] of [['wheat', WHEAT_STAGES], ['sugarcane', SUGARCANE_STAGES]] as const) {
    for (const stage of stages) {
      const r = run(crop, stage, extreme);
      assert.equal(r.status, 'ok', `${crop}/${stage}`);
      assert.equal(r.detected_risks.length, 0, `${crop}/${stage} has no crop risk`);
    }
  }
});

// ── guards ───────────────────────────────────────────────────────────────────
test('fallback weather → insufficient_data, nothing assessed (even with a rule defined)', () => {
  const r = runRiskEngine({ crop: 'wheat', growth_stage: 'reproductive', daily_forecast: [day(D(1), { max_temp_c: 40 })], is_fallback: true, rules: [FAKE_RULE] });
  assert.equal(r.status, 'insufficient_data');
  assert.equal(r.detected_risks.length, 0);
});

test('stale weather → insufficient_data (even with a rule defined)', () => {
  const r = withFake([day(D(1), { max_temp_c: 40 })], { is_stale: true });
  assert.equal(r.status, 'insufficient_data');
  assert.equal(r.detected_risks.length, 0);
});

test('empty forecast → insufficient_data', () => {
  assert.equal(run('wheat', 'reproductive', []).status, 'insufficient_data');
});

test('invalid crop/stage → invalid_input', () => {
  assert.equal(run('wheat', 'germination', mild()).status, 'invalid_input');
  assert.equal(run('sugarcane', 'reproductive', mild()).status, 'invalid_input');
  assert.equal(isValidCropStage('wheat', 'reproductive'), true);
  assert.equal(isValidCropStage('sugarcane', 'grand_growth'), true);
});

test('mild forecast → status ok with no risks', () => {
  const r = run('wheat', 'reproductive', mild());
  assert.equal(r.status, 'ok');
  assert.equal(r.detected_risks.length, 0);
});

// ── severity machinery (tested with the FAKE rule) ───────────────────────────
test('boundary and tiers: strictly greater than, highest tier reported once', () => {
  assert.equal(withFake([day(D(1), { max_temp_c: 30 })]).detected_risks.length, 0);
  assert.equal(withFake([day(D(1), { max_temp_c: 30.1 })]).detected_risks[0].severity, 'Low');
  const r = withFake([day(D(1), { max_temp_c: 31 }), day(D(2), { max_temp_c: 36 })]);
  assert.equal(r.detected_risks.length, 1);
  assert.equal(r.detected_risks[0].severity, 'High');
});

test('forecast period lists the days on which the reported tier is crossed', () => {
  const r = withFake([day(D(1), { max_temp_c: 28 }), day(D(2), { max_temp_c: 36 }), day(D(3), { max_temp_c: 28 }), day(D(4), { max_temp_c: 37 })]);
  assert.deepEqual(r.detected_risks[0].forecast_period.triggered_dates, [D(2), D(4)]);
});

test('every detected risk carries all required fields', () => {
  const risk = withFake([day(D(1), { max_temp_c: 36 })]).detected_risks[0];
  for (const k of ['rule_id', 'risk_name', 'severity', 'forecast_period', 'peak_observed_value', 'peak_observed_date', 'source', 'severity_basis', 'caveats', 'precautionary_action'] as const) {
    assert.ok(risk[k] !== undefined && risk[k] !== null, `missing ${k}`);
  }
  assert.equal(risk.peak_observed_value, 36);
});

// ── missing data ─────────────────────────────────────────────────────────────
test('missing value on one day is skipped, never treated as zero or a trigger', () => {
  const r = withFake([day(D(1), { max_temp_c: null }), day(D(2), { max_temp_c: 36 })]);
  assert.deepEqual(r.detected_risks[0].forecast_period.triggered_dates, [D(2)]);
});

test('NaN is treated as missing', () => {
  const r = withFake([day(D(1), { max_temp_c: Number.NaN }), day(D(2), { max_temp_c: 25 })]);
  assert.equal(r.detected_risks.length, 0);
});

test('every needed parameter missing → insufficient_data, not "no risk"', () => {
  const r = withFake([day(D(1), { max_temp_c: null }), day(D(2), { max_temp_c: null })]);
  assert.equal(r.status, 'insufficient_data');
});

// ── determinism ──────────────────────────────────────────────────────────────
test('deterministic and does not mutate input', () => {
  const days = [day(D(1), { max_temp_c: 36 }), day(D(2), { max_temp_c: 31 })];
  const snapshot = JSON.stringify(days);
  const a = withFake(days);
  const b = withFake(days);
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(days), snapshot);
});
