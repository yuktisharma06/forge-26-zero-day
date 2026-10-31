import type { Language, WeatherRisk } from '../types/farm';

export type RiskTone = 'high' | 'moderate' | 'low' | 'potential';

export function riskTone(risk: WeatherRisk): RiskTone {
  return risk.severity ?? 'potential';
}

export function buildSpeechText(risk: WeatherRisk, lang: Language): string {
  const parts = [risk.title[lang], risk.whyItMatters[lang], ...risk.precautions.map((item) => item[lang])];
  return parts.join('. ');
}
