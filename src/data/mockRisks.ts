import type { Bilingual, CropId, WeatherRisk } from '../types/farm';

interface StageAdvisoryFixture {
  risks: WeatherRisk[];
  insufficientData: Bilingual | null;
  aiSummary: Bilingual | null;
}

const RULES_NOT_VALIDATED: Bilingual = {
  hi: 'इस चरण के लिए अभी सत्यापित फसल-जोखिम नियम उपलब्ध नहीं हैं, इसलिए भरोसेमंद जोखिम आकलन नहीं किया जा सकता।',
  en: 'Validated crop-risk rules for this stage are not yet available, so a reliable risk assessment cannot be made.',
};

const NOT_ASSESSED_FIXTURE: StageAdvisoryFixture = {
  risks: [],
  insufficientData: RULES_NOT_VALIDATED,
  aiSummary: null,
};

export const MOCK_STAGE_ADVISORIES: Record<CropId, Record<string, StageAdvisoryFixture>> = {
  sugarcane: {
    germination: NOT_ASSESSED_FIXTURE,
    tillering: NOT_ASSESSED_FIXTURE,
    grand_growth: NOT_ASSESSED_FIXTURE,
    maturity_ripening: NOT_ASSESSED_FIXTURE,
  },
  wheat: {
    early_growth: NOT_ASSESSED_FIXTURE,
    crown_root: NOT_ASSESSED_FIXTURE,
    vegetative_growth: NOT_ASSESSED_FIXTURE,
    reproductive: NOT_ASSESSED_FIXTURE,
    grain_development_maturity: NOT_ASSESSED_FIXTURE,
  },
};
