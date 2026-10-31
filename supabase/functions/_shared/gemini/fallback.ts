// =============================================================================
// Deterministic explanations (no AI)
// =============================================================================
// Used when Gemini is unavailable or its output is rejected, and when there is
// nothing for Gemini to explain. Text comes from the engine and fixed labels
// only, so it carries exactly the engine's facts.
// =============================================================================

import type {
  AiAdvisory,
  AiFallbackReason,
  AiRiskExplanation,
  CropType,
  DetectedRisk,
  GrowthStage,
  Language,
} from '../types.ts';
import { CROP_LABELS, DISCLAIMER, STAGE_LABELS } from './labels.ts';

function explain(r: DetectedRisk, language: Language, crop: CropType, stage: GrowthStage): AiRiskExplanation {
  const days = r.forecast_period.triggered_dates.length;
  if (language === 'hi') {
    return {
      rule_id: r.rule_id,
      // Risk names and weather conditions come from the engine in English.
      why_it_matters:
        `स्वचालित जांच में "${r.risk_name}" (गंभीरता: ${r.severity}) का संकेत मिला। ` +
        `${r.weather_condition} — ${r.forecast_period.start_date} से ${r.forecast_period.end_date} तक, ${days} दिन।`,
      crop_impact:
        `यह चेतावनी आपकी चुनी हुई फसल (${CROP_LABELS[crop].hi}) और अवस्था (${STAGE_LABELS[stage].hi}) के लिए है।`,
      what_to_do: [r.precautionary_action_hi ?? r.precautionary_action],
    };
  }
  return {
    rule_id: r.rule_id,
    why_it_matters: r.reason,
    crop_impact:
      `This warning is for the crop and growth stage you selected: ${CROP_LABELS[crop].en}, ${STAGE_LABELS[stage].en}.`,
    what_to_do: [r.precautionary_action],
  };
}

/** Engine-written advisory used when Gemini cannot be used. */
export function buildFallbackAdvisory(args: {
  risks: DetectedRisk[];
  crop: CropType;
  growth_stage: GrowthStage;
  language: Language;
  reason: AiFallbackReason;
}): AiAdvisory {
  const { risks, crop, growth_stage: stage, language, reason } = args;
  const n = risks.length;
  const summary =
    language === 'hi'
      ? `आपकी ${CROP_LABELS[crop].hi} फसल (${STAGE_LABELS[stage].hi}) के लिए मौसम जांच में ${n} जोखिम मिले। AI से सरल व्याख्या अभी उपलब्ध नहीं है, इसलिए स्वचालित जांच के नतीजे दिखाए जा रहे हैं।`
      : `The weather check found ${n} risk${n === 1 ? '' : 's'} for your ${CROP_LABELS[crop].en} (${STAGE_LABELS[stage].en}). The AI explanation is not available right now, so the results of the automatic check are shown.`;

  return {
    status: 'fallback',
    language,
    generated_by: 'deterministic_fallback',
    fallback_reason: reason,
    summary,
    risks: risks.map((r) => explain(r, language, crop, stage)),
    disclaimer: DISCLAIMER[language],
  };
}

/** Used when there is no risk to explain, or the engine could not assess. */
export function buildNothingToExplain(args: {
  crop: CropType;
  growth_stage: GrowthStage;
  language: Language;
  engineCouldNotAssess: boolean;
}): AiAdvisory {
  const { crop, growth_stage: stage, language, engineCouldNotAssess } = args;
  let summary: string;
  if (language === 'hi') {
    summary = engineCouldNotAssess
      ? 'अभी मौसम का सही पूर्वानुमान न मिलने से जोखिम की जांच नहीं हो सकी। कृपया बाद में दोबारा कोशिश करें।'
      : `आपकी ${CROP_LABELS[crop].hi} फसल (${STAGE_LABELS[stage].hi}) के लिए अगले दिनों के पूर्वानुमान में हमारी जांचों में कोई जोखिम नहीं मिला। कुछ जोखिमों की जांच इस ऐप में अभी नहीं होती, इसलिए अपनी फसल पर नज़र रखें।`;
  } else {
    summary = engineCouldNotAssess
      ? 'The weather risks could not be checked because a reliable forecast is not available right now. Please try again later.'
      : `None of the checks we run flagged a weather risk for your ${CROP_LABELS[crop].en} (${STAGE_LABELS[stage].en}) in the coming days. Some risks are not checked by this app yet, so keep watching your crop.`;
  }
  return {
    status: 'not_needed',
    language,
    generated_by: 'none',
    summary,
    risks: [],
    disclaimer: DISCLAIMER[language],
  };
}
