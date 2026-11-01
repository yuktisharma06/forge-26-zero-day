// =============================================================================
// Not-assessed conditions
// =============================================================================
// Conditions that CANNOT be reliably assessed from the forecast data we have.
// They are listed so that an empty `risks` array is never read as "everything
// was checked and is fine". Only entries relevant to the selected crop and
// growth stage are returned, to keep the dashboard short.
//
// Contains no thresholds.
// =============================================================================

import type { CropType, GrowthStage, Language } from '../types.ts';

export type NotAssessedReason =
  | 'insufficient_field_data'
  | 'no_validated_threshold'
  | 'insufficient_evidence';

export interface NotAssessedItem {
  id: string;
  name: string;
  reason: NotAssessedReason;
  explanation: string;
}

type Bilingual = Record<Language, string>;

interface Def {
  id: string;
  name: Bilingual;
  reason: NotAssessedReason;
  explanation: Bilingual;
  applies: (crop: CropType, stage: GrowthStage) => boolean;
}

const DEFS: Def[] = [
  {
    id: 'water_stress',
    name: { en: 'Water stress / drought', hi: 'पानी की कमी / सूखा' },
    reason: 'insufficient_field_data',
    explanation: {
      en: 'Soil moisture, irrigation and field water availability data are not available, so water stress cannot be assessed from the forecast.',
      hi: 'मिट्टी की नमी, सिंचाई और खेत में पानी की उपलब्धता का डेटा नहीं है, इसलिए पूर्वानुमान से पानी की कमी का आकलन नहीं हो सकता।',
    },
    applies: () => true,
  },
  {
    id: 'waterlogging',
    name: { en: 'Waterlogging', hi: 'जलभराव' },
    reason: 'insufficient_field_data',
    explanation: {
      en: 'Rainfall forecasts alone cannot establish whether a field is waterlogged. Soil, drainage, and field-condition information is not available.',
      hi: 'केवल वर्षा के पूर्वानुमान से यह तय नहीं हो सकता कि खेत में जलभराव है या नहीं। मिट्टी, जल-निकास और खेत की स्थिति की जानकारी उपलब्ध नहीं है।',
    },
    applies: () => true,
  },
  {
    id: 'wheat_frost_damage',
    name: { en: 'Frost damage', hi: 'पाले से नुकसान' },
    reason: 'no_validated_threshold',
    explanation: {
      en: 'No sufficiently validated, stage-specific Indian threshold and exposure-duration rule is available for wheat frost damage.',
      hi: 'गेहूं में पाले से नुकसान के लिए पर्याप्त रूप से सत्यापित, अवस्था-आधारित भारतीय सीमा और अवधि का नियम उपलब्ध नहीं है।',
    },
    applies: (c) => c === 'wheat',
  },
  {
    id: 'wheat_flowering_heat_damage',
    name: { en: 'Heat damage at flowering', hi: 'फूल आने पर गर्मी से नुकसान' },
    reason: 'no_validated_threshold',
    explanation: {
      en: 'The temperature values found in the literature for flowering are optimum-temperature references, not damage triggers, so heat damage at flowering is not assessed.',
      hi: 'फूल आने की अवस्था के लिए साहित्य में मिले तापमान मान अनुकूल तापमान के संदर्भ हैं, नुकसान की सीमा नहीं, इसलिए इस अवस्था में गर्मी से नुकसान का आकलन नहीं किया जाता।',
    },
    applies: (c, s) => c === 'wheat' && s === 'reproductive',
  },
  {
    id: 'wheat_terminal_heat_damage',
    name: { en: 'Terminal heat damage', hi: 'दाना भरते समय गर्मी से नुकसान' },
    reason: 'no_validated_threshold',
    explanation: {
      en: 'The available evidence does not justify a daily maximum-temperature damage threshold for grain filling, so damage is not assessed. A separate informational heat warning may still appear.',
      hi: 'उपलब्ध प्रमाण दाना भरने की अवस्था के लिए दैनिक अधिकतम तापमान की नुकसान-सीमा को उचित नहीं ठहराते, इसलिए नुकसान का आकलन नहीं किया जाता। अलग से सूचनात्मक गर्मी चेतावनी फिर भी आ सकती है।',
    },
    applies: (c, s) => c === 'wheat' && s === 'grain_development_maturity',
  },
  {
    id: 'sugarcane_frost_damage',
    name: { en: 'Frost damage', hi: 'पाले से नुकसान' },
    reason: 'no_validated_threshold',
    explanation: {
      en: 'The available frost categories are not validated for the pilot region or for a daily minimum-temperature method, so frost damage is not assessed.',
      hi: 'उपलब्ध पाला श्रेणियां पायलट क्षेत्र या दैनिक न्यूनतम तापमान विधि के लिए सत्यापित नहीं हैं, इसलिए पाले से नुकसान का आकलन नहीं किया जाता।',
    },
    applies: (c) => c === 'sugarcane',
  },
  {
    id: 'sugarcane_heat_damage',
    name: { en: 'Heat damage', hi: 'गर्मी से नुकसान' },
    reason: 'no_validated_threshold',
    explanation: {
      en: 'No validated heat-damage threshold is available for sugarcane in the pilot region, so crop heat damage is not assessed. A separate informational heat warning may still appear.',
      hi: 'पायलट क्षेत्र में गन्ने के लिए गर्मी से नुकसान की कोई सत्यापित सीमा उपलब्ध नहीं है, इसलिए फसल को गर्मी से नुकसान का आकलन नहीं किया जाता। अलग से सूचनात्मक गर्मी चेतावनी फिर भी आ सकती है।',
    },
    applies: (c) => c === 'sugarcane',
  },
  {
    id: 'crop_disease',
    name: { en: 'Crop disease', hi: 'फसल रोग' },
    reason: 'insufficient_evidence',
    explanation: {
      en: 'Weather variables alone cannot confirm the presence or outbreak of a crop disease.',
      hi: 'केवल मौसम के आंकड़ों से फसल रोग की मौजूदगी या प्रकोप की पुष्टि नहीं हो सकती।',
    },
    applies: () => true,
  },
  {
    id: 'wind_damage',
    name: { en: 'Wind damage / lodging', hi: 'हवा से नुकसान / फसल गिरना' },
    reason: 'no_validated_threshold',
    explanation: {
      en: 'No validated, crop-stage-specific wind threshold is included, so wind damage is not assessed.',
      hi: 'फसल की अवस्था के अनुसार कोई सत्यापित हवा-सीमा शामिल नहीं है, इसलिए हवा से नुकसान का आकलन नहीं किया जाता।',
    },
    applies: (c, s) =>
      (c === 'wheat' && (s === 'reproductive' || s === 'grain_development_maturity')) ||
      (c === 'sugarcane' && (s === 'grand_growth' || s === 'maturity_ripening')),
  },
];

export function notAssessedFor(crop: CropType, stage: GrowthStage, lang: Language): NotAssessedItem[] {
  return DEFS.filter((d) => d.applies(crop, stage)).map((d) => ({
    id: d.id,
    name: d.name[lang],
    reason: d.reason,
    explanation: d.explanation[lang],
  }));
}
