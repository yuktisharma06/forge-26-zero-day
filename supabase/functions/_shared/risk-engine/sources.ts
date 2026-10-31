// =============================================================================
// Verified source registry for the risk engine
// =============================================================================
// Every threshold used by wheat-rules.ts / sugarcane-rules.ts must point at one
// of these entries. If a threshold cannot be traced to a source here, it does
// not belong in the engine.
//
// Each `citation` states only what the source itself says. Where the source
// does not transfer cleanly to Indian conditions, that is written down in
// `applicability_note` and shown to the user with the result.
// =============================================================================

import type { SourceRef } from '../types.ts';

/** IMD 24-hour rainfall intensity categories (official IMD bulletins). */
export const SRC_IMD_RAINFALL: SourceRef = {
  name: 'India Meteorological Department — rainfall intensity categories',
  url: 'https://rsmcnewdelhi.imd.gov.in/uploads/archive/1/1_8a87a4_19.National%20Bulletin%20No%2019%2012th%20Sept2024%200530%20IST.pdf',
  citation:
    'IMD classifies 24-hour rainfall as heavy (64.5–115.5 mm), very heavy (115.6–204.4 mm) and extremely heavy (204.5 mm or more).',
  evidence_type: 'official_classification',
  applicability_note:
    'These are weather-event categories, not crop-damage thresholds. IMD measures rainfall over 0830–0830 IST; the forecast model reports a calendar-day total for a grid cell.',
};

/** ICAR "Indian Farming" (May 2023) table of wheat cardinal temperatures (Khan et al. 2021). */
export const SRC_ICAR_WHEAT_CARDINAL: SourceRef = {
  name: 'ICAR Indian Farming, May 2023 — Table 1 (after Khan et al. 2021)',
  url: 'https://epubs.icar.org.in/index.php/IndFarm/article/download/133793/50127/361734',
  citation:
    'Table of wheat temperature requirements by stage: maximum temperature is about 26 °C at anthesis and about 30 °C during grain filling.',
  evidence_type: 'research_literature',
  applicability_note:
    'Cardinal (mean ± SD) temperatures from a review table, not a plot-level damage threshold. Secondary citation of Khan et al. 2021.',
};

/** Porter & Gawith (1999) as cited by Schittenhelm et al. */
export const SRC_WHEAT_GRAIN_FILL_MAX: SourceRef = {
  name: 'Schittenhelm et al. (citing Porter & Gawith 1999) — two-week heat stress during grain filling in winter wheat',
  url: 'https://www.openagrar.de/servlets/MCRFileNodeServlet/openagrar_derivate_00034638/dn063013.pdf',
  citation:
    'The maximum temperature for grain filling, above which wheat growth stops, is given as about 35 °C.',
  evidence_type: 'research_literature',
  applicability_note:
    'European winter-wheat study quoting a literature value; used here as an upper physiological limit, not a farm-level yield-loss figure.',
};

/** Freeze-injury table for wheat (Texas A&M AgriLife, adapted from Univ. of Kentucky). */
export const SRC_WHEAT_FREEZE: SourceRef = {
  name: 'Texas A&M AgriLife Extension — Wheat Freeze Injury in Texas',
  url: 'https://varietytesting.tamu.edu/wp-content/uploads/sites/17/legacy-files/wheat/docs/Wheat%20Freeze%20Injury%20in%20Texas%20-%20Final.pdf',
  citation:
    'Approximate injurious temperatures for wheat: boot −2 °C, heading −1 °C, flowering 0 °C; injury generally needs at least 2 hours below the threshold.',
  evidence_type: 'extension_guidance',
  applicability_note:
    'US winter-wheat guidance. Injury depends on how long the temperature stays below the threshold; a daily minimum cannot show duration, so a flag is a screening signal only.',
};

/** SASRI information sheet on frosted sugarcane. */
export const SRC_SASRI_FROST: SourceRef = {
  name: 'South African Sugarcane Research Institute — Information Sheet 4.6, Management of frosted cane',
  url: 'https://sasri.org.za/wp-content/uploads/Information_Sheets/IS_4.6-Frosted-cane.pdf',
  citation:
    'Frost damage to sugarcane starts at about −2 °C (stage 1, minimal setback); −2 to −3 °C gives a definite setback (stage 2); −4 to −5 °C is moderate frost (stage 3); −5 to −7 °C is severe frost that kills the growing point (stage 4).',
  evidence_type: 'research_literature',
  applicability_note:
    'South African guidance; varieties differ in cold sensitivity. The sheet notes underground buds are protected, so it is not applied at germination.',
};

/** Upper temperature limit for sugarcane growth. */
export const SRC_SUGARCANE_UPPER_LIMIT: SourceRef = {
  name: 'African Study Monographs 19(1), 1998 — sugarcane production review (Tanzania)',
  url: 'https://repository.kulib.kyoto-u.ac.jp/dspace/bitstream/2433/68168/1/ASM_19_1.pdf',
  citation:
    'Sugarcane does not grow when temperatures fall below 15 °C or rise above 38 °C. Other reviews report that above 38 °C photosynthesis slows and respiration rises.',
  evidence_type: 'research_literature',
  applicability_note:
    'Review article from a different region, not an Indian operational threshold. Treated as a growth-limiting limit only.',
};
