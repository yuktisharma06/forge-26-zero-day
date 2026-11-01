// =============================================================================
// Sugarcane crop-risk rules (validated, severity-bearing)
// =============================================================================
// There are currently NO validated sugarcane crop-risk rules.
//
// Decision (team lead, risk-rules specification v1.0):
//   - Tmax > 38 C is an informational weather warning only (../weather-warnings).
//   - Frost categories (Tmin <= -2 / -4 / < -5 C) are removed: not validated
//     for Saharanpur or for a daily-minimum method.
//   - Rainfall categories are weather warnings, never crop-damage severity.
// Do not re-add rules without a reliable source and regional validation.
// =============================================================================

import type { RiskRule, SugarcaneStage } from '../types.ts';

export const SUGARCANE_STAGES: SugarcaneStage[] = [
  'germination',
  'tillering',
  'grand_growth',
  'maturity_ripening',
];

export const SUGARCANE_RISK_RULES: RiskRule[] = [];
