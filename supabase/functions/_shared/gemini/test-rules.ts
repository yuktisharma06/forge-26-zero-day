// =============================================================================
// TEST FIXTURE ONLY. NOT PRODUCTION RULES.
// =============================================================================
// The production rule files (wheat-rules.ts, sugarcane-rules.ts) are empty by
// decision of the team lead: thresholds are not validated for Saharanpur.
// These two rules exist only so the Gemini tests have risks to explain. The
// numbers are NOT validated agronomic thresholds. Never import this file from
// production code.
// =============================================================================

import type { RiskRule, SourceRef } from '../types.ts';

const TEST_SOURCE: SourceRef = {
  name: 'Test fixture source (not a real reference)',
  url: 'https://example.invalid/test-fixture',
  citation: 'Fixture used only by unit tests.',
  evidence_type: 'official_classification',
};

export const TEST_RULES: RiskRule[] = [
  {
    id: 'wheat_grain_fill_heat',
    crop: 'wheat',
    growth_stages: ['grain_development_maturity'],
    risk_name: 'Terminal Heat Stress',
    weather_parameter: 'max_temp_c',
    condition_label: 'Maximum temperature',
    threshold_unit: '°C',
    tiers: [
      { severity: 'Low', threshold_operator: 'gt', threshold_value: 30, source: TEST_SOURCE, severity_basis: 'Test fixture: first heat level.' },
      { severity: 'High', threshold_operator: 'gt', threshold_value: 35, source: TEST_SOURCE, severity_basis: 'Test fixture: second heat level.' },
    ],
    caveats: ['Test fixture caveat: only the daily maximum is checked.'],
    precautionary_action:
      'Hot days during grain filling can shorten the filling period. Ask your local KVK whether a light irrigation or an early-harvest plan suits your field and variety.',
    precautionary_action_hi:
      'दाना भरने के समय गर्म दिन दाना भरने की अवधि घटा सकते हैं। अपने खेत और किस्म के लिए हल्की सिंचाई या जल्दी कटाई की योजना उपयुक्त है या नहीं, यह स्थानीय KVK से पूछें।',
  },
  {
    id: 'wheat_heavy_rainfall_event',
    crop: 'wheat',
    growth_stages: ['grain_development_maturity'],
    risk_name: 'Heavy Rainfall Event (drainage concern)',
    weather_parameter: 'precipitation_mm',
    condition_label: 'Daily rainfall',
    threshold_unit: 'mm/day',
    tiers: [
      { severity: 'Low', threshold_operator: 'gte', threshold_value: 64.5, source: TEST_SOURCE, severity_basis: 'Test fixture: heavy-rain level.' },
      { severity: 'Moderate', threshold_operator: 'gte', threshold_value: 115.6, source: TEST_SOURCE, severity_basis: 'Test fixture: very-heavy-rain level.' },
      { severity: 'High', threshold_operator: 'gte', threshold_value: 204.5, source: TEST_SOURCE, severity_basis: 'Test fixture: extremely-heavy-rain level.' },
    ],
    caveats: ['Rainfall alone does not confirm waterlogging; that depends on soil type, field drainage, slope and how wet the soil already is.'],
    precautionary_action:
      'Check that field drainage channels are open and clear before the forecast rain, and hold off irrigation until it has passed. Afterwards, look at low-lying parts of the field for standing water. Ask your local KVK for advice specific to your soil and field.',
    precautionary_action_hi:
      'अनुमानित बारिश से पहले खेत की जल निकासी नालियां खुली और साफ रखें और बारिश बीतने तक सिंचाई रोकें। बाद में खेत के निचले हिस्सों में खड़े पानी की जांच करें। अपनी मिट्टी और खेत के अनुसार सलाह के लिए स्थानीय KVK से संपर्क करें।',
  },
];
