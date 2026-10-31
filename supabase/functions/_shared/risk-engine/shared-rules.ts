// =============================================================================
// Rules shared by both crops
// =============================================================================
import type { CropType, GrowthStage, RiskRule } from '../types.ts';
import { SRC_IMD_RAINFALL } from './sources.ts';

/**
 * Heavy-rainfall event rule built on IMD's official 24-hour intensity categories.
 *
 * What this rule does NOT claim: that waterlogging has occurred. Waterlogging
 * depends on soil type, drainage, slope and antecedent moisture, none of which
 * the forecast contains. The flag means "a heavy-rainfall event is forecast —
 * check drainage", nothing stronger.
 *
 * Stage sensitivity to excess water is not quantified by a source we could
 * verify, so the rule applies to every stage and says so in its caveats.
 */
export function buildHeavyRainfallRule(
  crop: CropType,
  stages: GrowthStage[],
): RiskRule {
  return {
    id: `${crop}_heavy_rainfall_event`,
    crop,
    growth_stages: stages,
    risk_name: 'Heavy Rainfall Event (drainage concern)',
    weather_parameter: 'precipitation_mm',
    condition_label: 'Daily rainfall',
    threshold_unit: 'mm/day',
    tiers: [
      {
        severity: 'Low',
        threshold_operator: 'gte',
        threshold_value: 64.5,
        source: SRC_IMD_RAINFALL,
        severity_basis:
          'Forecast rainfall reaches IMD’s “heavy rain” category (64.5–115.5 mm in 24 h).',
      },
      {
        severity: 'Moderate',
        threshold_operator: 'gte',
        threshold_value: 115.6,
        source: SRC_IMD_RAINFALL,
        severity_basis:
          'Forecast rainfall reaches IMD’s “very heavy rain” category (115.6–204.4 mm in 24 h).',
      },
      {
        severity: 'High',
        threshold_operator: 'gte',
        threshold_value: 204.5,
        source: SRC_IMD_RAINFALL,
        severity_basis:
          'Forecast rainfall reaches IMD’s “extremely heavy rain” category (204.5 mm or more in 24 h).',
      },
    ],
    caveats: [
      'Rainfall alone does not confirm waterlogging; that depends on soil type, field drainage, slope and how wet the soil already is.',
      'No verified source quantifies how sensitive this growth stage is to excess water, so the same IMD categories are applied at every stage.',
      'Forecast rainfall is a model estimate for a grid cell and can differ from rain at the farm.',
    ],
    precautionary_action:
      'Check that field drainage channels are open and clear before the forecast rain, and hold off irrigation until it has passed. Afterwards, look at low-lying parts of the field for standing water. Ask your local KVK for advice specific to your soil and field.',
    precautionary_action_hi:
      'अनुमानित बारिश से पहले खेत की जल निकासी नालियां खुली और साफ रखें और बारिश बीतने तक सिंचाई रोकें। बाद में खेत के निचले हिस्सों में खड़े पानी की जांच करें। अपनी मिट्टी और खेत के अनुसार सलाह के लिए स्थानीय KVK से संपर्क करें।',
  };
}
