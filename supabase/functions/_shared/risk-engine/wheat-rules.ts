// =============================================================================
// Wheat risk rules
// =============================================================================
// Every tier points at a source in sources.ts. The THRESHOLD comes from the
// source; the Low/Moderate/High LABEL is the engine's documented mapping
// (see `severity_basis` on each tier) and should be confirmed with a local
// agronomist (KVK / ICAR-IIWBR) before operational use.
//
// Deliberately NOT implemented (no verifiable, transferable threshold found):
//   - Cold / frost stress before the reproductive stage
//   - Heat stress before the reproductive stage
//   - Any rainfall-only "waterlogging" rule
// Do not add rules without a source. Do not mix thresholds across studies
// inside one tier.
// =============================================================================

import type { RiskRule, WheatStage } from '../types.ts';
import {
  SRC_ICAR_WHEAT_CARDINAL,
  SRC_WHEAT_FREEZE,
  SRC_WHEAT_GRAIN_FILL_MAX,
} from './sources.ts';
import { buildHeavyRainfallRule } from './shared-rules.ts';

export const WHEAT_STAGES: WheatStage[] = [
  'early_growth',
  'crown_root',
  'vegetative_growth',
  'reproductive',
  'grain_development_maturity',
];

export const WHEAT_RISK_RULES: RiskRule[] = [
  // ── Terminal heat during grain development ────────────────────────────────
  {
    id: 'wheat_grain_fill_heat',
    crop: 'wheat',
    growth_stages: ['grain_development_maturity'],
    risk_name: 'Terminal Heat Stress',
    weather_parameter: 'max_temp_c',
    condition_label: 'Maximum temperature',
    threshold_unit: '°C',
    tiers: [
      {
        severity: 'Low',
        threshold_operator: 'gt',
        threshold_value: 30,
        source: SRC_ICAR_WHEAT_CARDINAL,
        severity_basis:
          'Forecast maximum is above the ~30 °C maximum temperature given for wheat grain filling.',
      },
      {
        severity: 'High',
        threshold_operator: 'gt',
        threshold_value: 35,
        source: SRC_WHEAT_GRAIN_FILL_MAX,
        severity_basis:
          'Forecast maximum is above ~35 °C, the grain-filling temperature at which wheat growth is reported to stop.',
      },
    ],
    caveats: [
      'The thresholds are physiological limits from the literature, not measured yield-loss points for your variety or sowing date.',
      'Only the daily maximum is checked; heat duration and night temperature are not.',
    ],
    precautionary_action:
      'Hot days during grain filling can shorten the filling period. Ask your local KVK whether a light irrigation or an early-harvest plan suits your field and variety.',
    precautionary_action_hi:
      'दाना भरने के समय गर्म दिन दाना भरने की अवधि घटा सकते हैं। अपने खेत और किस्म के लिए हल्की सिंचाई या जल्दी कटाई की योजना उपयुक्त है या नहीं, यह स्थानीय KVK से पूछें।',
  },

  // ── Heat around flowering ─────────────────────────────────────────────────
  {
    id: 'wheat_reproductive_heat',
    crop: 'wheat',
    growth_stages: ['reproductive'],
    risk_name: 'Flowering Heat Stress',
    weather_parameter: 'max_temp_c',
    condition_label: 'Maximum temperature',
    threshold_unit: '°C',
    tiers: [
      {
        severity: 'Low',
        threshold_operator: 'gt',
        threshold_value: 26,
        source: SRC_ICAR_WHEAT_CARDINAL,
        severity_basis:
          'Forecast maximum is above the ~26 °C maximum temperature given for wheat at anthesis.',
      },
    ],
    caveats: [
      'Only one source-backed level exists for this stage, so higher severities are not assigned.',
      'The stage selected (booting to flowering) is broader than anthesis alone.',
      'Cardinal temperature from a review table, not a measured damage threshold.',
    ],
    precautionary_action:
      'Flowering is sensitive to heat. Ask your local KVK about irrigation timing for the coming days and watch the crop for poor grain set.',
    precautionary_action_hi:
      'फूल आने की अवस्था गर्मी के प्रति संवेदनशील होती है। आने वाले दिनों में सिंचाई के समय के बारे में स्थानीय KVK से पूछें और दाना कम बनने के लक्षणों पर नज़र रखें।',
  },

  // ── Freezing temperatures around boot–flowering ───────────────────────────
  {
    id: 'wheat_reproductive_freeze',
    crop: 'wheat',
    growth_stages: ['reproductive'],
    risk_name: 'Frost / Freeze Risk at Booting–Flowering',
    weather_parameter: 'min_temp_c',
    condition_label: 'Minimum temperature',
    threshold_unit: '°C',
    tiers: [
      {
        severity: 'Moderate',
        threshold_operator: 'lte',
        threshold_value: 0,
        source: SRC_WHEAT_FREEZE,
        severity_basis:
          'Forecast minimum is at or below 0 °C, the injurious temperature listed for flowering (the most sensitive stage covered). Capped at Moderate because a daily minimum cannot show the ≥2 h duration the source requires.',
      },
      {
        severity: 'High',
        threshold_operator: 'lte',
        threshold_value: -2,
        source: SRC_WHEAT_FREEZE,
        severity_basis:
          'Forecast minimum is at or below −2 °C, the injurious temperature listed even for the boot stage.',
      },
    ],
    caveats: [
      'Injury needs the temperature to stay below the threshold for about 2 hours; the daily minimum cannot show duration.',
      'Source is US winter-wheat guidance; Indian spring/semi-winter varieties may respond differently.',
      'Forecast air temperature can be higher than temperature at crop level on clear, calm nights.',
    ],
    precautionary_action:
      'Freezing temperatures at booting–flowering can damage the ear. Ask your local KVK about protective measures, and inspect the crop after the cold night.',
    precautionary_action_hi:
      'गभोट से फूल आने की अवस्था में पाला बाली को नुकसान पहुंचा सकता है। बचाव के उपायों के बारे में स्थानीय KVK से पूछें और ठंडी रात के बाद फसल का निरीक्षण करें।',
  },

  // ── Heavy rainfall (all stages) ───────────────────────────────────────────
  buildHeavyRainfallRule('wheat', WHEAT_STAGES),
];

/** Risks that are intentionally not evaluated, with the reason shown to users. */
export const WHEAT_UNSUPPORTED_RISKS: {
  risk_name: string;
  stages: WheatStage[];
  explanation: string;
}[] = [
  {
    risk_name: 'Cold stress',
    stages: ['early_growth', 'crown_root', 'vegetative_growth', 'grain_development_maturity'],
    explanation:
      'No verified, India-applicable low-temperature threshold was found for this stage, so cold stress is not assessed.',
  },
  {
    risk_name: 'Heat stress',
    stages: ['early_growth', 'crown_root', 'vegetative_growth'],
    explanation:
      'No verified heat threshold was found for this stage, so heat stress is not assessed.',
  },
];
