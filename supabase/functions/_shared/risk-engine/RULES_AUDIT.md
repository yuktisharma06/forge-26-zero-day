# Risk rule audit — Phase C

## What changed and why
The engine in the repo cited IMD KALP, IMD MAUSAM and ICAR-IIFSR for most thresholds, but
several could not be traced to those sources (some rule notes even said the number used differed
from the source). Several rules cited only "general agricultural guidance". Under the Phase C
rule *"do not invent thresholds"*, every rule now needs a source that says what the rule claims.

I could not open the KALP / MAUSAM / IIFSR pages the old rules cited, so those old claims are
**unverified, not proven wrong**. If you can paste the relevant passages, rules can be restored.

## Rules kept (all in `wheat-rules.ts`, `sugarcane-rules.ts`, `shared-rules.ts`)
| Crop | Stages | Risk | Thresholds (→ severity) | Source |
|---|---|---|---|---|
| Wheat | grain development/maturity | Terminal heat (Tmax) | >30 °C → Low; >35 °C → High | ICAR Indian Farming 2023 (Khan et al. 2021); Porter & Gawith 1999 via Schittenhelm et al. |
| Wheat | reproductive | Flowering heat (Tmax) | >26 °C → Low | ICAR Indian Farming 2023 (Khan et al. 2021) |
| Wheat | reproductive | Freeze (Tmin) | ≤0 °C → Moderate; ≤−2 °C → High | Texas A&M AgriLife freeze-injury table |
| Sugarcane | all | Heat (Tmax) | >38 °C → Low | African Study Monographs 19(1), 1998 |
| Sugarcane | tillering, grand growth, maturity | Frost (Tmin) | ≤−2 → Low; ≤−4 → Moderate; <−5 → High | SASRI Information Sheet 4.6 |
| Both | all | Heavy rainfall event | ≥64.5 → Low; ≥115.6 → Moderate; ≥204.5 mm/day → High | IMD rainfall categories |

**Thresholds come from the sources. The Low/Moderate/High labels are the engine's mapping**, explained in each tier's
`severity_basis`. Please have an agronomist/KVK confirm that mapping.

## Rules removed (old id → reason)
- `wheat_grain_dev_terminal_heat_moderate` (30 °C, "validated"): KALP could not be checked. 30 °C is now supported by the ICAR table, labelled Low.
- `wheat_reproductive_heat_moderate/high` (28/32 °C): no source found; replaced by the 26 °C anthesis limit.
- `wheat_early_growth_frost` (2 °C), `wheat_crown_root_cold_stress` (5 °C): "general guidance", not a source.
- `wheat_crown_root_excess_rain` (30 mm), `wheat_vegetative_excess_rain` (40 mm): invented; replaced by IMD categories.
- Sugarcane rain rules (50 / 75 mm): no source for those numbers; replaced by IMD categories.
- `sugarcane_germination_cold_stress`, `sugarcane_tillering_cold_stress` (15 °C), `sugarcane_maturity_cold_stress` (10 °C): sources disagree (15 vs ~20 °C), describe slower growth not damage, and winter minimums below 15 °C are routine.
- `sugarcane_grand_growth_heat_stress` (40 °C): not supported; 38 °C used instead.
- The 'Potential Risk' / `validation_status` tier is gone: a rule is either sourced (and gets a severity) or not in the engine.

## Not assessed (reported as `not_assessed`, never guessed)
- Sugarcane water stress: needs soil moisture / evapotranspiration, and no verified rainfall-deficit threshold exists.
- Wheat cold before booting, wheat heat before booting, sugarcane non-freezing cold.

## Known limits
- Daily forecasts only: no heat/cold duration (wheat freeze injury needs ~2 h), no night-heat check.
- Forecast air temperature can differ from crop-level temperature on clear, calm nights.
- Several sources are non-Indian (US wheat freeze table, South African frost sheet). Each result shows this in `caveats`.
