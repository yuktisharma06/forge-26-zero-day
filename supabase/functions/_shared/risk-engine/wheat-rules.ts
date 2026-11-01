// =============================================================================
// Wheat crop-risk rules (validated, severity-bearing)
// =============================================================================
// There are currently NO validated wheat crop-risk rules.
//
// Decision (team lead, risk-rules specification v1.0): temperature, frost and
// rainfall conditions are not sufficiently validated for Saharanpur to assign
// Low / Moderate / High crop-damage severity. They are reported instead as
// informational weather warnings (see ../weather-warnings) or as not-assessed
// conditions (see ../not-assessed).
//
// Removed rules (do not re-add without a reliable source, a clear measurement
// basis, stage and exposure duration, and regional agronomic validation):
//   - Flowering heat, Tmax > 26 C
//   - Terminal heat, Tmax > 30 C (and the proposed 31 C)
//   - Reproductive-stage freeze, Tmin <= 0 C / <= -2 C
//   - Rainfall categories mapped to crop-damage severity
// =============================================================================

import type { RiskRule, WheatStage } from '../types.ts';

export const WHEAT_STAGES: WheatStage[] = [
  'early_growth',
  'crown_root',
  'vegetative_growth',
  'reproductive',
  'grain_development_maturity',
];

export const WHEAT_RISK_RULES: RiskRule[] = [];
