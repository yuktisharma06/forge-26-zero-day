// =============================================================================
// Weather warnings (informational only)
// =============================================================================
// Implements the approved warning rules (risk-rules specification v1.0):
//   RAIN-01  IMD daily rainfall categories (heavy / very heavy / extremely heavy)
//   HEAT-01  Wheat, grain development: daily Tmax > 35 C
//   HEAT-02  Sugarcane, all stages:    daily Tmax > 38 C
//
// A weather warning is NOT a crop risk: it has no Low/Moderate/High severity and
// never claims crop damage, waterlogging, disease or yield loss.
//
// Pure and deterministic. Live, fresh weather only: sample/stale/empty forecasts
// produce no warnings. Missing measurements are skipped, never treated as zero.
// Each forecast day is evaluated independently.
// =============================================================================

import type { CropType, DailyForecast, GrowthStage, Language } from '../types.ts';

export type WarningCategory = 'heat' | 'rainfall';

export interface WeatherWarning {
  id: string;
  category: WarningCategory;
  /** Short title in the requested language. */
  name: string;
  crop: CropType;
  growthStage: GrowthStage;
  date: string;
  observedValue: number;
  unit: string;
  message: string;
  caveat: string;
}

/** All warnings of one kind, collapsed for the advisory text and for Gemini. */
export interface WarningGroup {
  id: string;
  name: string;
  category: WarningCategory;
  dates: string[];
  peakValue: number;
  unit: string;
  message: string;
  caveat: string;
  /** The only action text that may be shown or restated for this warning. */
  action: string;
}

export interface WarningInput {
  crop: CropType;
  growth_stage: GrowthStage;
  daily_forecast: DailyForecast[];
  is_fallback: boolean;
  is_stale?: boolean;
  language: Language;
}

export interface WarningResult {
  warnings: WeatherWarning[];
  /** Forecast days on which a measurement needed by an applicable rule was missing. */
  daysWithMissingData: number;
}

type Bilingual = Record<Language, string>;

interface WarningDef {
  id: string;
  category: WarningCategory;
  name: Bilingual;
  message: Bilingual;
  caveat: Bilingual;
  action: Bilingual;
}

const RAIN_CAVEAT: Bilingual = {
  en: 'This is an IMD rainfall-intensity category. It does not show waterlogging, flooding or crop damage.',
  hi: 'यह IMD की वर्षा-तीव्रता की श्रेणी है। यह जलभराव, बाढ़ या फसल को नुकसान की पुष्टि नहीं करती।',
};
const RAIN_ACTION: Bilingual = {
  en: 'Monitor field conditions and local weather advisories.',
  hi: 'खेत की स्थिति और स्थानीय मौसम सलाह पर नजर रखें।',
};

const DEFS: Record<string, WarningDef> = {
  heavy_rainfall: {
    id: 'heavy_rainfall',
    category: 'rainfall',
    name: { en: 'Heavy rainfall', hi: 'भारी वर्षा' },
    message: {
      en: 'Heavy rainfall is forecast. Monitor field conditions and local weather advisories.',
      hi: 'भारी वर्षा का पूर्वानुमान है। खेत की स्थिति और स्थानीय मौसम सलाह पर नजर रखें।',
    },
    caveat: RAIN_CAVEAT,
    action: RAIN_ACTION,
  },
  very_heavy_rainfall: {
    id: 'very_heavy_rainfall',
    category: 'rainfall',
    name: { en: 'Very heavy rainfall', hi: 'बहुत भारी वर्षा' },
    message: {
      en: 'Very heavy rainfall is forecast. Monitor field conditions and local weather advisories.',
      hi: 'बहुत भारी वर्षा का पूर्वानुमान है। खेत की स्थिति और स्थानीय मौसम सलाह पर नजर रखें।',
    },
    caveat: RAIN_CAVEAT,
    action: RAIN_ACTION,
  },
  extremely_heavy_rainfall: {
    id: 'extremely_heavy_rainfall',
    category: 'rainfall',
    name: { en: 'Extremely heavy rainfall', hi: 'अत्यंत भारी वर्षा' },
    message: {
      en: 'Extremely heavy rainfall is forecast. Monitor field conditions and local weather advisories.',
      hi: 'अत्यंत भारी वर्षा का पूर्वानुमान है। खेत की स्थिति और स्थानीय मौसम सलाह पर नजर रखें।',
    },
    caveat: RAIN_CAVEAT,
    action: RAIN_ACTION,
  },
  wheat_grain_development_heat: {
    id: 'wheat_grain_development_heat',
    category: 'heat',
    name: { en: 'High daytime temperature', hi: 'दिन का उच्च तापमान' },
    message: {
      en: 'High daytime temperatures are forecast during wheat grain development. Sustained heat can affect grain filling, but the daily maximum alone cannot confirm crop damage.',
      hi: 'गेहूं में दाना बनने की अवस्था के दौरान दिन के ऊंचे तापमान का पूर्वानुमान है। लंबे समय तक गर्मी दाना भरने को प्रभावित कर सकती है, लेकिन केवल दैनिक अधिकतम तापमान से फसल को नुकसान की पुष्टि नहीं होती।',
    },
    caveat: {
      en: 'Indicative warning only; not a locally validated crop-damage threshold. A single daily maximum does not show how long the heat lasts.',
      hi: 'यह केवल संकेतात्मक चेतावनी है, स्थानीय रूप से सत्यापित फसल-नुकसान सीमा नहीं। एक दिन का अधिकतम तापमान यह नहीं बताता कि गर्मी कितने समय रहेगी।',
    },
    action: {
      en: 'Monitor the crop and local weather advisories. Ask your local KVK if you are concerned.',
      hi: 'फसल और स्थानीय मौसम सलाह पर नजर रखें। चिंता हो तो स्थानीय KVK से पूछें।',
    },
  },
  sugarcane_high_temperature: {
    id: 'sugarcane_high_temperature',
    category: 'heat',
    name: { en: 'Very high daytime temperature', hi: 'दिन का बहुत उच्च तापमान' },
    message: {
      en: 'Very high daytime temperatures are forecast. Such conditions may place sugarcane under heat stress, particularly if they persist. This is an indicative weather warning, not confirmation of crop damage.',
      hi: 'दिन के बहुत ऊंचे तापमान का पूर्वानुमान है। ऐसी स्थिति में गन्ने पर गर्मी का तनाव पड़ सकता है, खासकर यदि यह कई दिन रहे। यह केवल संकेतात्मक मौसम चेतावनी है, फसल को नुकसान की पुष्टि नहीं।',
    },
    caveat: {
      en: 'The threshold is indicative and not a locally validated one-day damage threshold for Saharanpur.',
      hi: 'यह सीमा केवल संकेतात्मक है, सहारनपुर के लिए स्थानीय रूप से सत्यापित एक-दिवसीय नुकसान सीमा नहीं।',
    },
    action: {
      en: 'Monitor the crop and local weather advisories. Ask your local KVK if you are concerned.',
      hi: 'फसल और स्थानीय मौसम सलाह पर नजर रखें। चिंता हो तो स्थानीय KVK से पूछें।',
    },
  },
};

// ── Thresholds (approved by the team lead; do not change without sign-off) ────
const WHEAT_HEAT_ABOVE_C = 35; // HEAT-01, strictly greater
const SUGARCANE_HEAT_ABOVE_C = 38; // HEAT-02, strictly greater
const RAIN_HEAVY_MM = 64.5; // RAIN-01 (IMD), inclusive lower bounds
const RAIN_VERY_HEAVY_MM = 115.6;
const RAIN_EXTREME_MM = 204.5;

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function rainfallDefId(mm: number): string | null {
  if (mm >= RAIN_EXTREME_MM) return 'extremely_heavy_rainfall';
  if (mm >= RAIN_VERY_HEAVY_MM) return 'very_heavy_rainfall';
  if (mm >= RAIN_HEAVY_MM) return 'heavy_rainfall';
  return null;
}

export function evaluateWeatherWarnings(input: WarningInput): WarningResult {
  const { crop, growth_stage: stage, language: lang } = input;
  const forecast = Array.isArray(input.daily_forecast) ? input.daily_forecast : [];

  // Never assess sample, stale or missing weather.
  if (input.is_fallback || input.is_stale || forecast.length === 0) {
    return { warnings: [], daysWithMissingData: 0 };
  }

  const heatApplies =
    (crop === 'wheat' && stage === 'grain_development_maturity') || crop === 'sugarcane';
  const heatId = crop === 'wheat' ? 'wheat_grain_development_heat' : 'sugarcane_high_temperature';
  const heatLimit = crop === 'wheat' ? WHEAT_HEAT_ABOVE_C : SUGARCANE_HEAT_ABOVE_C;

  const warnings: WeatherWarning[] = [];
  let daysWithMissingData = 0;

  const make = (defId: string, date: string, value: number, unit: string): WeatherWarning => {
    const def = DEFS[defId];
    return {
      id: def.id,
      category: def.category,
      name: def.name[lang],
      crop,
      growthStage: stage,
      date,
      observedValue: value,
      unit,
      message: def.message[lang],
      caveat: def.caveat[lang],
    };
  };

  for (const day of forecast) {
    let missing = false;

    // RAIN-01
    if (isNum(day.precipitation_mm)) {
      const id = rainfallDefId(day.precipitation_mm);
      if (id) warnings.push(make(id, day.date, day.precipitation_mm, 'mm'));
    } else {
      missing = true;
    }

    // HEAT-01 / HEAT-02
    if (heatApplies) {
      if (isNum(day.max_temp_c)) {
        if (day.max_temp_c > heatLimit) warnings.push(make(heatId, day.date, day.max_temp_c, '°C'));
      } else {
        missing = true;
      }
    }

    if (missing) daysWithMissingData++;
  }

  return { warnings, daysWithMissingData };
}

/** Collapses per-day warnings into one entry per warning type. */
export function groupWarnings(warnings: WeatherWarning[], lang: Language): WarningGroup[] {
  const byId = new Map<string, WarningGroup>();
  for (const w of warnings) {
    const g = byId.get(w.id);
    if (g) {
      g.dates.push(w.date);
      g.peakValue = Math.max(g.peakValue, w.observedValue);
    } else {
      byId.set(w.id, {
        id: w.id,
        name: w.name,
        category: w.category,
        dates: [w.date],
        peakValue: w.observedValue,
        unit: w.unit,
        message: w.message,
        caveat: w.caveat,
        action: DEFS[w.id].action[lang],
      });
    }
  }
  return [...byId.values()];
}
