# Risk rules — decision record

Source of truth: *KisanRakshak — Approved Crop Risk Rules* (v1.0) and *API Contract Addendum* (proposed v1.0).

## Crop risks with Low / Moderate / High severity
**None.** `WHEAT_RISK_RULES` and `SUGARCANE_RISK_RULES` are empty on purpose. An empty `risks` array is valid.
The engine in `index.ts` is kept for future rules that pass the checklist below.

## Informational weather warnings (no severity) — `_shared/weather-warnings/index.ts`
| ID | Applies to | Trigger |
|---|---|---|
| `heavy_rainfall` | both crops, all stages | daily rain 64.5–115.5 mm (IMD) |
| `very_heavy_rainfall` | both crops, all stages | 115.6–204.4 mm (IMD) |
| `extremely_heavy_rainfall` | both crops, all stages | ≥ 204.5 mm (IMD) |
| `wheat_grain_development_heat` | wheat, `grain_development_maturity` | daily Tmax > 35 °C |
| `sugarcane_high_temperature` | sugarcane, all stages | daily Tmax > 38 °C |

Each forecast day is evaluated on its own. Missing values are skipped, never treated as zero.
Sample, stale or empty weather produces no warnings.

## Removed (do not re-add without a new source)
Wheat flowering heat > 26 °C · wheat terminal heat > 30 °C and > 31 °C · wheat freeze severity ·
sugarcane > 38 °C as a Low risk · sugarcane frost severity · rainfall mapped to crop-damage severity.

## Not assessed — `_shared/not-assessed/index.ts`
Water stress, waterlogging, wheat frost damage, wheat flowering heat damage, wheat terminal heat damage,
sugarcane frost damage, crop disease, wind damage. Only entries relevant to the crop and stage are returned.

## A future rule needs all of
A reliable source · a clear measurement basis · the relevant crop stage · exposure duration where applicable ·
agronomic validation for the target region.
