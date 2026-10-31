// =============================================================================
// Wheat Risk Rules
// =============================================================================
// Sources:
//   [KALP] IMD KALP Operational Framework
//          https://mausam.imd.gov.in/imd_latest/contents/agromet/kalp/kalp.pdf
//   [MAUSAM-W] IMD MAUSAM — Climatic Impacts on Wheat in Uttar Pradesh
//              https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/1179
//
// CRITICAL — validation_status rules:
//   'validated'            → automated Low/Moderate/High severity is applied
//   'research_observation' → qualitative "Potential Risk" warning only
//   'pending_validation'   → qualitative warning; needs local KVK/ICAR confirmation
//
// DO NOT add rules without a verifiable agricultural source.
// DO NOT invent or combine numerical thresholds across different studies.
// =============================================================================

import type { RiskRule } from '../types.ts';

export const WHEAT_RISK_RULES: RiskRule[] = [

  // ── GRAIN DEVELOPMENT / MATURITY ────────────────────────────────────────
  // IMD KALP explicitly identifies max temp > 30°C during grain filling as
  // a validated operational threshold for wheat in north India.
  {
    id: 'wheat_grain_dev_terminal_heat_moderate',
    crop: 'wheat',
    growth_stage: 'grain_development_maturity',
    weather_parameter: 'max_temp_c',
    threshold_operator: 'gt',
    threshold_value: 30,
    threshold_unit: '°C',
    risk_name: 'Terminal Heat Stress',
    risk_severity: 'Moderate',
    validation_status: 'validated',
    source: 'IMD KALP Operational Framework',
    source_url: 'https://mausam.imd.gov.in/imd_latest/contents/agromet/kalp/kalp.pdf',
    precautionary_action:
      'Provide light irrigation to cool the crop canopy. Consider potassium-based foliar spray (KNO₃ 13:0:45 @ 2%) to improve heat tolerance. Harvest as soon as grain is physiologically mature to avoid further heat damage.',
    precautionary_action_hi:
      'फसल को ठंडा रखने के लिए हल्की सिंचाई करें। गर्मी सहनशीलता बढ़ाने के लिए पोटेशियम आधारित पर्णीय स्प्रे (KNO₃ 13:0:45 @ 2%) का उपयोग करें। दाने पकते ही शीघ्र कटाई करें।',
    notes:
      'IMD KALP operational framework identifies max temperature > 30°C during grain filling as a wheat heat-risk condition in north India. Source-attributed validated threshold used for automated classification.',
  },

  // Research observation for temperatures exceeding 35°C — referenced in ICAR wheat UP studies
  {
    id: 'wheat_grain_dev_terminal_heat_high',
    crop: 'wheat',
    growth_stage: 'grain_development_maturity',
    weather_parameter: 'max_temp_c',
    threshold_operator: 'gt',
    threshold_value: 35,
    threshold_unit: '°C',
    risk_name: 'Severe Terminal Heat Stress',
    risk_severity: 'High',
    validation_status: 'research_observation',
    source: 'IMD MAUSAM — Climatic Impacts on Wheat in UP',
    source_url: 'https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/1179',
    precautionary_action:
      'Emergency irrigation if possible. Apply antitranspirant foliar spray (kaolin). Prioritise early harvest to salvage yield. Consult local KVK for region-specific guidance.',
    precautionary_action_hi:
      'यदि संभव हो तत्काल सिंचाई करें। काओलिन का पर्णीय छिड़काव करें। जल्दी कटाई करें। स्थानीय कृषि विज्ञान केंद्र से परामर्श लें।',
    notes:
      'Temperature above 35°C during grain filling is referenced in multiple ICAR research contexts as causing significant yield loss. Research observation — validate threshold with local KVK before treating as operational.',
  },

  // ── REPRODUCTIVE STAGE (Booting / Flowering) ────────────────────────────
  {
    id: 'wheat_reproductive_heat_moderate',
    crop: 'wheat',
    growth_stage: 'reproductive',
    weather_parameter: 'max_temp_c',
    threshold_operator: 'gt',
    threshold_value: 28,
    threshold_unit: '°C',
    risk_name: 'Flowering Heat Stress',
    risk_severity: 'Moderate',
    validation_status: 'research_observation',
    source: 'IMD MAUSAM — Climatic Impacts on Wheat in UP',
    source_url: 'https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/1179',
    precautionary_action:
      'Apply light irrigation in the evening to reduce canopy temperature. Avoid irrigating during peak afternoon heat. Monitor for grain shrivelling. Consult local KVK for regional guidance.',
    precautionary_action_hi:
      'शाम को हल्की सिंचाई करें। दोपहर की चरम गर्मी में सिंचाई से बचें। दाने सिकुड़ने पर ध्यान दें। स्थानीय कृषि विज्ञान केंद्र से परामर्श लें।',
    notes:
      'Temperatures > 28°C during flowering can reduce pollen viability in wheat. Research observation context; local adaptation confirmation recommended before operational use.',
  },

  {
    id: 'wheat_reproductive_heat_high',
    crop: 'wheat',
    growth_stage: 'reproductive',
    weather_parameter: 'max_temp_c',
    threshold_operator: 'gt',
    threshold_value: 32,
    threshold_unit: '°C',
    risk_name: 'High Flowering Heat Stress',
    risk_severity: 'High',
    validation_status: 'research_observation',
    source: 'IMD MAUSAM — Climatic Impacts on Wheat in UP',
    source_url: 'https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/1179',
    precautionary_action:
      'Provide emergency irrigation. Apply potassium foliar spray (KCl @ 2%). Contact local KVK immediately. Significant yield loss is likely — document for insurance purposes.',
    precautionary_action_hi:
      'तत्काल सिंचाई करें। पोटाश का पर्णीय छिड़काव करें (KCl @ 2%)। स्थानीय KVK से तुरंत संपर्क करें। गंभीर उपज हानि की संभावना है।',
    notes:
      'Research observation requiring local validation. Temperature context and measurement method vary across wheat studies.',
  },

  // ── EARLY GROWTH (Emergence / Seedling) ─────────────────────────────────
  {
    id: 'wheat_early_growth_frost',
    crop: 'wheat',
    growth_stage: 'early_growth',
    weather_parameter: 'min_temp_c',
    threshold_operator: 'lt',
    threshold_value: 2,
    threshold_unit: '°C',
    risk_name: 'Frost Risk',
    risk_severity: 'Low',
    validation_status: 'pending_validation',
    source: 'General agricultural guidance for wheat in north India',
    precautionary_action:
      'Light irrigation before anticipated frost to raise soil temperature. Monitor seedlings for frost damage. Consult KVK if frost persists for multiple consecutive days.',
    precautionary_action_hi:
      'पाले से पहले हल्की सिंचाई करें। अंकुरों में पाले की क्षति की निगरानी करें। लगातार कई दिन पाला पड़े तो KVK से संपर्क करें।',
    notes:
      'Pending validation against ICAR/KVK Saharanpur-specific frost thresholds. Used as qualitative warning only until local data is confirmed.',
  },

  // ── CRI — Crown Root Initiation ──────────────────────────────────────────
  {
    id: 'wheat_cri_cold_stress',
    crop: 'wheat',
    growth_stage: 'cri',
    weather_parameter: 'min_temp_c',
    threshold_operator: 'lt',
    threshold_value: 5,
    threshold_unit: '°C',
    risk_name: 'Cold Stress at CRI Stage',
    risk_severity: 'Low',
    validation_status: 'pending_validation',
    source: 'General agricultural guidance for wheat in north India',
    precautionary_action:
      'Apply the first CRI irrigation to moderate soil temperature. Avoid nitrogen application during cold-stress periods.',
    precautionary_action_hi:
      'पहली CRI सिंचाई करें। ठंड के दौरान नाइट्रोजन उर्वरक देने से बचें।',
    notes:
      'Threshold pending validation. Qualitative warning only — cold during CRI stage can impair crown root development.',
  },

  {
    id: 'wheat_cri_excess_rain',
    crop: 'wheat',
    growth_stage: 'cri',
    weather_parameter: 'precipitation_mm',
    threshold_operator: 'gt',
    threshold_value: 30,
    threshold_unit: 'mm/day',
    risk_name: 'Excess Rainfall / Waterlogging Risk at CRI',
    risk_severity: 'Moderate',
    validation_status: 'pending_validation',
    source: 'General agricultural guidance for wheat drainage management',
    precautionary_action:
      'Ensure field drainage channels are clear. Avoid irrigating until soil moisture decreases. Excess water at CRI stage can impair crown root development and increase disease susceptibility.',
    precautionary_action_hi:
      'खेत की नाली साफ रखें। मिट्टी में नमी कम होने तक सिंचाई न करें। CRI अवस्था में अत्यधिक पानी से जड़ विकास प्रभावित हो सकता है।',
    notes:
      'Rainfall > 30mm/day is a qualitative indicator of potential waterlogging. Actual waterlogging depends on soil type and drainage infrastructure. Pending validation.',
  },

  // ── VEGETATIVE GROWTH (Tillering) ────────────────────────────────────────
  {
    id: 'wheat_vegetative_excess_rain',
    crop: 'wheat',
    growth_stage: 'vegetative_growth',
    weather_parameter: 'precipitation_mm',
    threshold_operator: 'gt',
    threshold_value: 40,
    threshold_unit: 'mm/day',
    risk_name: 'Excess Rainfall During Tillering',
    risk_severity: 'Low',
    validation_status: 'pending_validation',
    source: 'General agricultural guidance for wheat in Uttar Pradesh',
    precautionary_action:
      'Clear field drainage channels to prevent waterlogging. Delay any planned irrigation. Monitor for yellowing leaves or disease signs.',
    precautionary_action_hi:
      'जल निकासी नालियों को साफ करें। नियोजित सिंचाई में देरी करें। पीली पत्तियों या बीमारी के संकेतों की निगरानी करें।',
    notes:
      'Qualitative warning based on excess rainfall potential. Not a confirmed crop-damage prediction. Pending local validation.',
  },
];
