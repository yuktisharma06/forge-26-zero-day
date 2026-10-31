// =============================================================================
// Sugarcane Risk Rules
// =============================================================================
// Sources:
//   [IIFSR] ICAR-IIFSR Sugarcane Crop Management
//           https://dss.iifsr.org.in/sugarcane_management.php
//   [MAUSAM-SC] IMD MAUSAM — Extreme Weather Impacts on Sugarcane in UP
//               https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/1187
//
// CRITICAL — validation_status rules:
//   'validated'            → automated Low/Moderate/High severity is applied
//   'research_observation' → qualitative "Potential Risk" warning only; no automated severity
//   'pending_validation'   → qualitative warning; needs local KVK/ICAR confirmation
//
// DO NOT add rules without a verifiable agricultural source.
// DO NOT invent or combine numerical thresholds across different studies.
// DO NOT claim rainfall alone confirms actual field waterlogging.
// =============================================================================

import type { RiskRule } from '../types.ts';

export const SUGARCANE_RISK_RULES: RiskRule[] = [

  // ── GERMINATION ─────────────────────────────────────────────────────────────
  // ICAR-IIFSR guidance: adequate soil moisture and warm temperatures
  // (>20°C) are critical for sett germination. Cold stress slows germination.
  {
    id: 'sugarcane_germination_cold_stress',
    crop: 'sugarcane',
    growth_stage: 'germination',
    weather_parameter: 'min_temp_c',
    threshold_operator: 'lt',
    threshold_value: 15,
    threshold_unit: '°C',
    risk_name: 'Cold Stress During Germination',
    risk_severity: 'Moderate',
    validation_status: 'research_observation',
    source: 'ICAR-IIFSR Sugarcane Crop Management',
    source_url: 'https://dss.iifsr.org.in/sugarcane_management.php',
    precautionary_action:
      'Avoid planting during cold spells. If already planted, delay irrigation temporarily to avoid further cooling of the seed bed. Monitor germination rate and replant gaps if germination is poor.',
    precautionary_action_hi:
      'ठंड के दौरान बुवाई से बचें। यदि बुवाई हो चुकी है तो अस्थायी रूप से सिंचाई बंद रखें। अंकुरण दर देखें और खाली जगहों पर दोबारा बुवाई करें।',
    notes:
      'ICAR-IIFSR guidance identifies temperatures below 20°C as suboptimal for germination. The 15°C threshold is used here as a qualitative cold-stress indicator. Local KVK validation for Saharanpur recommended.',
  },

  {
    id: 'sugarcane_germination_excess_rain',
    crop: 'sugarcane',
    growth_stage: 'germination',
    weather_parameter: 'precipitation_mm',
    threshold_operator: 'gt',
    threshold_value: 50,
    threshold_unit: 'mm/day',
    risk_name: 'Excess Rainfall / Waterlogging Risk During Germination',
    risk_severity: 'Moderate',
    validation_status: 'pending_validation',
    source: 'ICAR-IIFSR Sugarcane Crop Management',
    source_url: 'https://dss.iifsr.org.in/sugarcane_management.php',
    precautionary_action:
      'Ensure drainage channels are open and functional. Avoid irrigating waterlogged fields. Waterlogging during germination can rot setts and reduce plant population.',
    precautionary_action_hi:
      'जल निकासी नालियां खुली रखें। जलभराव वाले खेतों में सिंचाई न करें। अंकुरण के समय जलभराव से गन्ने के टुकड़े सड़ सकते हैं।',
    notes:
      'Rainfall >50 mm/day is a qualitative indicator of potential waterlogging risk. Actual waterlogging depends on soil type, field slope, and drainage infrastructure. Rainfall alone does not confirm waterlogging. Pending local validation.',
  },

  // ── TILLERING ───────────────────────────────────────────────────────────────
  // ICAR-IIFSR: tillering is critical for yield; excessive rainfall and
  // waterlogging during this phase can reduce tiller count and promote disease.
  {
    id: 'sugarcane_tillering_excess_rain',
    crop: 'sugarcane',
    growth_stage: 'tillering',
    weather_parameter: 'precipitation_mm',
    threshold_operator: 'gt',
    threshold_value: 50,
    threshold_unit: 'mm/day',
    risk_name: 'Excess Rainfall / Waterlogging Risk During Tillering',
    risk_severity: 'Moderate',
    validation_status: 'pending_validation',
    source: 'ICAR-IIFSR Sugarcane Crop Management',
    source_url: 'https://dss.iifsr.org.in/sugarcane_management.php',
    precautionary_action:
      'Clear drainage channels immediately. Avoid irrigation. Excess water during tillering can cause poor root aeration, reduce tiller count, and increase risk of root rot.',
    precautionary_action_hi:
      'तुरंत जल निकासी नालियां साफ करें। सिंचाई न करें। कल्ले निकलने की अवस्था में अत्यधिक पानी से जड़ों में ऑक्सीजन की कमी और सड़न हो सकती है।',
    notes:
      'Qualitative indicator of potential waterlogging risk during tillering based on ICAR-IIFSR drainage guidance. Rainfall alone does not confirm actual waterlogging. Pending local validation.',
  },

  {
    id: 'sugarcane_tillering_cold_stress',
    crop: 'sugarcane',
    growth_stage: 'tillering',
    weather_parameter: 'min_temp_c',
    threshold_operator: 'lt',
    threshold_value: 15,
    threshold_unit: '°C',
    risk_name: 'Cold Stress During Tillering',
    risk_severity: 'Low',
    validation_status: 'research_observation',
    source: 'IMD MAUSAM — Extreme Weather Impacts on Sugarcane in UP',
    source_url: 'https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/1187',
    precautionary_action:
      'Cold conditions during tillering can slow tiller emergence. Avoid heavy irrigation in cold weather. Monitor tiller development and consult local KVK if persistent cold is expected.',
    precautionary_action_hi:
      'ठंड के मौसम में कल्लों का निकलना धीमा हो सकता है। ठंड में अधिक सिंचाई से बचें। कल्लों के विकास की निगरानी करें और लंबी ठंड की स्थिति में KVK से संपर्क करें।',
    notes:
      'Research observation from IMD MAUSAM context on temperature stress in sugarcane in UP. Qualitative warning only; local validation recommended.',
  },

  // ── GRAND GROWTH ─────────────────────────────────────────────────────────────
  // ICAR-IIFSR: grand growth phase requires adequate water availability.
  // Insufficient rainfall combined with dry conditions can cause water stress.
  {
    id: 'sugarcane_grand_growth_heat_stress',
    crop: 'sugarcane',
    growth_stage: 'grand_growth',
    weather_parameter: 'max_temp_c',
    threshold_operator: 'gt',
    threshold_value: 40,
    threshold_unit: '°C',
    risk_name: 'Heat Stress During Grand Growth',
    risk_severity: 'Moderate',
    validation_status: 'research_observation',
    source: 'IMD MAUSAM — Extreme Weather Impacts on Sugarcane in UP',
    source_url: 'https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/1187',
    precautionary_action:
      'Ensure adequate irrigation during peak heat periods to maintain canopy moisture. Avoid midday irrigation that can scorch leaves. Consult local KVK for region-specific guidance.',
    precautionary_action_hi:
      'अधिक गर्मी के दौरान उचित सिंचाई सुनिश्चित करें। दोपहर में सिंचाई से बचें। स्थानीय कृषि विज्ञान केंद्र से सलाह लें।',
    notes:
      'Temperature above 40°C during grand growth phase is referenced in IMD MAUSAM research as a potential heat stress condition for sugarcane in UP. Research observation; local validation recommended before operational use.',
  },

  {
    id: 'sugarcane_grand_growth_excess_rain',
    crop: 'sugarcane',
    growth_stage: 'grand_growth',
    weather_parameter: 'precipitation_mm',
    threshold_operator: 'gt',
    threshold_value: 75,
    threshold_unit: 'mm/day',
    risk_name: 'Excess Rainfall / Waterlogging Risk During Grand Growth',
    risk_severity: 'Low',
    validation_status: 'pending_validation',
    source: 'ICAR-IIFSR Sugarcane Crop Management',
    source_url: 'https://dss.iifsr.org.in/sugarcane_management.php',
    precautionary_action:
      'Clear drainage channels. Avoid irrigating until soil moisture decreases. Grand growth phase plants are more tolerant of excess water than early stages, but prolonged waterlogging can reduce root function.',
    precautionary_action_hi:
      'जल निकासी नालियां साफ रखें। मिट्टी में नमी कम होने तक सिंचाई न करें। ग्रैंड ग्रोथ में फसल कुछ अधिक पानी सह सकती है लेकिन लंबे समय तक जलभराव हानिकारक है।',
    notes:
      'Qualitative waterlogging risk indicator for grand growth stage. Actual waterlogging risk depends heavily on field drainage. Rainfall alone does not confirm waterlogging. Pending local validation.',
  },

  // ── MATURITY / RIPENING ──────────────────────────────────────────────────────
  // ICAR-IIFSR: dry and cool conditions during ripening promote sucrose
  // accumulation. Excess rainfall or high temperatures at this stage are
  // unfavourable for juice quality and may delay harvest.
  {
    id: 'sugarcane_maturity_excess_rain',
    crop: 'sugarcane',
    growth_stage: 'maturity_ripening',
    weather_parameter: 'precipitation_mm',
    threshold_operator: 'gt',
    threshold_value: 50,
    threshold_unit: 'mm/day',
    risk_name: 'Excess Rainfall During Maturity / Ripening',
    risk_severity: 'Moderate',
    validation_status: 'pending_validation',
    source: 'ICAR-IIFSR Sugarcane Crop Management',
    source_url: 'https://dss.iifsr.org.in/sugarcane_management.php',
    precautionary_action:
      'Avoid irrigation at this stage. Excess water during ripening can dilute cane juice (lower brix), reduce sucrose content, and make harvesting difficult. Ensure drainage is maintained.',
    precautionary_action_hi:
      'पकने की अवस्था में सिंचाई से बचें। अत्यधिक पानी से रस पतला (कम ब्रिक्स) हो जाता है, चीनी की मात्रा कम होती है और कटाई मुश्किल हो जाती है।',
    notes:
      'Qualitative indicator based on ICAR-IIFSR guidance that dry conditions during ripening improve sucrose accumulation. Actual impact depends on drainage and soil moisture levels. Rainfall alone does not confirm waterlogging.',
  },

  {
    id: 'sugarcane_maturity_heat_stress',
    crop: 'sugarcane',
    growth_stage: 'maturity_ripening',
    weather_parameter: 'max_temp_c',
    threshold_operator: 'gt',
    threshold_value: 38,
    threshold_unit: '°C',
    risk_name: 'Heat Stress During Maturity / Ripening',
    risk_severity: 'Low',
    validation_status: 'research_observation',
    source: 'ICAR-IIFSR Sugarcane Crop Management',
    source_url: 'https://dss.iifsr.org.in/sugarcane_management.php',
    precautionary_action:
      'High temperatures during ripening can slow sucrose accumulation. Plan harvest timing with local KVK or sugar mill advisor. Monitor juice brix levels if possible.',
    precautionary_action_hi:
      'पकने के समय अधिक गर्मी से चीनी जमा होने की प्रक्रिया धीमी पड़ सकती है। कटाई का समय KVK या चीनी मिल के सलाहकार से तय करें।',
    notes:
      'Research observation — warm temperatures during ripening are unfavourable for sucrose accumulation in sugarcane. Qualitative warning only. Validate with local KVK before operational use.',
  },

  {
    id: 'sugarcane_maturity_cold_stress',
    crop: 'sugarcane',
    growth_stage: 'maturity_ripening',
    weather_parameter: 'min_temp_c',
    threshold_operator: 'lt',
    threshold_value: 10,
    threshold_unit: '°C',
    risk_name: 'Cold Stress During Maturity / Ripening',
    risk_severity: 'Low',
    validation_status: 'research_observation',
    source: 'IMD MAUSAM — Extreme Weather Impacts on Sugarcane in UP',
    source_url: 'https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/1187',
    precautionary_action:
      'Temperatures below 10°C can damage ripening canes. Plan harvest before severe cold events. Consult local KVK and sugar mill for harvest scheduling.',
    precautionary_action_hi:
      '10°C से कम तापमान पर पकती हुई फसल को नुकसान हो सकता है। ठंड से पहले कटाई की योजना बनाएं। KVK और चीनी मिल से कटाई का समय तय करें।',
    notes:
      'Research observation on cold temperature impacts on sugarcane at maturity stage in UP context (IMD MAUSAM). Qualitative warning only. Validate threshold with local KVK.',
  },
];
