// =============================================================================
// Sugarcane risk rules
// =============================================================================
// Every tier points at a source in sources.ts. The THRESHOLD comes from the
// source; the Low/Moderate/High LABEL is the engine's documented mapping
// (see `severity_basis` on each tier) and should be confirmed with a local
// agronomist (KVK / ICAR-IISR) before operational use.
//
// Deliberately NOT implemented:
//   - Non-freezing "cold stress" (e.g. daily minimum < 15 °C): sources disagree
//     (15 °C vs ~20 °C) and these are growth-rate limits, not damage thresholds;
//     winter minimums below 15 °C are routine.
//   - Water stress: needs soil moisture / evapotranspiration, which the
//     forecast request does not include, and no verified rainfall-deficit
//     threshold exists. Reported as 'not assessed' instead.
//   - Any rainfall-only "waterlogging" rule.
// Do not add rules without a source. Do not mix thresholds across studies
// inside one tier.
// =============================================================================

import type { RiskRule, SugarcaneStage } from '../types.ts';
import { SRC_SASRI_FROST, SRC_SUGARCANE_UPPER_LIMIT } from './sources.ts';
import { buildHeavyRainfallRule } from './shared-rules.ts';

export const SUGARCANE_STAGES: SugarcaneStage[] = [
  'germination',
  'tillering',
  'grand_growth',
  'maturity_ripening',
];

export const SUGARCANE_RISK_RULES: RiskRule[] = [
  // ── Heat (all stages) ─────────────────────────────────────────────────────
  {
    id: 'sugarcane_heat',
    crop: 'sugarcane',
    growth_stages: SUGARCANE_STAGES,
    risk_name: 'Heat Stress',
    weather_parameter: 'max_temp_c',
    condition_label: 'Maximum temperature',
    threshold_unit: '°C',
    tiers: [
      {
        severity: 'Low',
        threshold_operator: 'gt',
        threshold_value: 38,
        source: SRC_SUGARCANE_UPPER_LIMIT,
        severity_basis:
          'Forecast maximum is above ~38 °C, the temperature above which sugarcane growth is reported to stop. Labelled Low because the source describes a growth limit, not crop damage.',
      },
    ],
    caveats: [
      'Only one source-backed level exists, so higher severities are not assigned.',
      'Review-article limit from another region; stage-specific heat tolerance is not quantified.',
      'Only the daily maximum is checked; duration of heat is not.',
    ],
    precautionary_action:
      'Very hot days slow sugarcane growth. Ask your local KVK about irrigation timing during the hot spell, and avoid stressing the crop in other ways.',
    precautionary_action_hi:
      'बहुत गर्म दिन गन्ने की बढ़वार धीमी कर देते हैं। गर्मी के दौरान सिंचाई के समय के बारे में स्थानीय KVK से पूछें।',
  },

  // ── Frost (above-ground stages) ───────────────────────────────────────────
  {
    id: 'sugarcane_frost',
    crop: 'sugarcane',
    growth_stages: ['tillering', 'grand_growth', 'maturity_ripening'],
    risk_name: 'Frost Risk',
    weather_parameter: 'min_temp_c',
    condition_label: 'Minimum temperature',
    threshold_unit: '°C',
    tiers: [
      {
        severity: 'Low',
        threshold_operator: 'lte',
        threshold_value: -2,
        source: SRC_SASRI_FROST,
        severity_basis:
          'Forecast minimum is at or below −2 °C, where SASRI places stage 1–2 frost damage (minimal to definite growth setback; the crop survives).',
      },
      {
        severity: 'Moderate',
        threshold_operator: 'lte',
        threshold_value: -4,
        source: SRC_SASRI_FROST,
        severity_basis:
          'Forecast minimum is at or below −4 °C, SASRI’s stage 3 (moderate frost: growing point and upper stem damaged).',
      },
      {
        severity: 'High',
        threshold_operator: 'lt',
        threshold_value: -5,
        source: SRC_SASRI_FROST,
        severity_basis:
          'Forecast minimum is below −5 °C, SASRI’s stage 4–5 (severe to extreme frost: growing point killed).',
      },
    ],
    caveats: [
      'South African guidance; varieties differ in cold tolerance.',
      'Not applied at germination: SASRI notes underground buds are protected from frost.',
      'Forecast air temperature can be higher than temperature at canopy level on clear, calm nights.',
    ],
    precautionary_action:
      'Frost can damage the growing point of standing cane. Ask your local KVK or sugar mill about protective measures and harvest planning, and inspect the crop after a frost.',
    precautionary_action_hi:
      'पाला खड़े गन्ने की बढ़वार बिंदु को नुकसान पहुंचा सकता है। बचाव और कटाई की योजना के बारे में स्थानीय KVK या चीनी मिल से पूछें, और पाले के बाद फसल का निरीक्षण करें।',
  },

  // ── Heavy rainfall (all stages) ───────────────────────────────────────────
  buildHeavyRainfallRule('sugarcane', SUGARCANE_STAGES),
];

/** Risks that are intentionally not evaluated, with the reason shown to users. */
export const SUGARCANE_UNSUPPORTED_RISKS: {
  risk_name: string;
  stages: SugarcaneStage[];
  explanation: string;
}[] = [
  {
    risk_name: 'Water stress',
    stages: SUGARCANE_STAGES,
    explanation:
      'Water stress needs soil moisture or evapotranspiration data, which this forecast does not include, and no verified rainfall-deficit threshold exists. It is not assessed.',
  },
  {
    risk_name: 'Cold stress (non-freezing)',
    stages: SUGARCANE_STAGES,
    explanation:
      'Sources disagree on the low-temperature growth limit (about 15 °C vs 20 °C) and describe slower growth rather than damage, so non-freezing cold is not assessed.',
  },
];
