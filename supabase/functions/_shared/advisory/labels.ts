// =============================================================================
// Labels and fixed texts (English + Hindi) for the crop-advisory endpoint.
// Hindi text should be reviewed by a native speaker before the demo.
// Nothing here contains agricultural thresholds - those live in the rule files.
// =============================================================================

import type {
  CropType,
  GrowthStage,
  Language,
  ThresholdOperator,
  WeatherParameter,
} from '../types.ts';

type Bilingual = Record<Language, string>;

export const CROP_LABEL: Record<CropType, Bilingual> = {
  wheat: { en: 'wheat', hi: 'गेहूं' },
  sugarcane: { en: 'sugarcane', hi: 'गन्ना' },
};

export const STAGE_LABEL: Record<GrowthStage, Bilingual> = {
  early_growth: { en: 'early growth', hi: 'शुरुआती वृद्धि' },
  crown_root: { en: 'crown root initiation (CRI)', hi: 'ताज जड़ अवस्था (CRI)' },
  vegetative_growth: { en: 'vegetative growth (tillering)', hi: 'वानस्पतिक वृद्धि (कल्ले निकलना)' },
  reproductive: { en: 'reproductive (flowering)', hi: 'प्रजनन अवस्था (बालियां और फूल)' },
  grain_development_maturity: { en: 'grain development and maturity', hi: 'दाना बनना और पकना' },
  germination: { en: 'germination', hi: 'अंकुरण' },
  tillering: { en: 'tillering', hi: 'कल्ले निकलना' },
  grand_growth: { en: 'grand growth', hi: 'तेज वृद्धि (ग्रैंड ग्रोथ)' },
  maturity_ripening: { en: 'maturity and ripening', hi: 'पकना' },
};

export const PARAM_LABEL: Record<WeatherParameter, Bilingual> = {
  max_temp_c: { en: 'Maximum temperature', hi: 'अधिकतम तापमान' },
  min_temp_c: { en: 'Minimum temperature', hi: 'न्यूनतम तापमान' },
  precipitation_mm: { en: 'Daily rainfall', hi: 'दैनिक वर्षा' },
  precipitation_probability_pct: { en: 'Chance of rain', hi: 'बारिश की संभावना' },
  humidity_pct: { en: 'Average humidity', hi: 'औसत आर्द्रता' },
  wind_speed_kmh: { en: 'Maximum wind speed', hi: 'अधिकतम हवा की गति' },
};

export const OPERATOR_PHRASE: Record<ThresholdOperator, Bilingual> = {
  gt: { en: 'above', hi: 'से अधिक' },
  gte: { en: 'at or above', hi: 'या उससे अधिक' },
  lt: { en: 'below', hi: 'से कम' },
  lte: { en: 'at or below', hi: 'या उससे कम' },
};

export const DISCLAIMER: Bilingual = {
  en: 'This is advisory support based on weather forecasts. It does not replace advice from your local agricultural expert or KVK.',
  hi: 'यह मौसम पूर्वानुमान पर आधारित सलाह है। यह आपके स्थानीय कृषि विशेषज्ञ या KVK की सलाह का विकल्प नहीं है।',
};

/** Why an assessment could not be completed. */
export type InsufficientReason =
  | 'sample_weather'
  | 'stale_weather'
  | 'no_forecast'
  | 'no_rules'
  | 'unassessable';

export const INSUFFICIENT_MESSAGE: Record<InsufficientReason, Bilingual> = {
  sample_weather: {
    en: 'Live weather could not be fetched right now, so no risk check was done. Please try again in a few minutes.',
    hi: 'अभी लाइव मौसम की जानकारी नहीं मिल सकी, इसलिए जोखिम की जांच नहीं हुई। कृपया कुछ मिनट बाद फिर कोशिश करें।',
  },
  stale_weather: {
    en: 'The weather forecast we received looks out of date, so no risk check was done. Please try again later.',
    hi: 'मिला हुआ मौसम पूर्वानुमान पुराना लग रहा है, इसलिए जोखिम की जांच नहीं हुई। कृपया बाद में फिर कोशिश करें।',
  },
  no_forecast: {
    en: 'No forecast days were returned by the weather service, so no risk check was done.',
    hi: 'मौसम सेवा से कोई पूर्वानुमान नहीं मिला, इसलिए जोखिम की जांच नहीं हुई।',
  },
  no_rules: {
    en: 'We do not yet have verified weather-risk rules for this crop and growth stage, so we cannot give a reliable assessment.',
    hi: 'इस फसल और अवस्था के लिए अभी हमारे पास सत्यापित मौसम-जोखिम नियम नहीं हैं, इसलिए भरोसेमंद आकलन नहीं दे सकते।',
  },
  unassessable: {
    en: 'Some weather values needed for the risk checks were missing, so a reliable assessment could not be completed.',
    hi: 'जोखिम जांच के लिए जरूरी कुछ मौसम आंकड़े उपलब्ध नहीं थे, इसलिए भरोसेमंद आकलन पूरा नहीं हो सका।',
  },
};
