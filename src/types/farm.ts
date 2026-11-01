export type Language = 'hi' | 'en';

export interface Bilingual {
  hi: string;
  en: string;
}

export type CropId = 'sugarcane' | 'wheat';

export interface GrowthStage {
  id: string;
  label: Bilingual;
  description: Bilingual;
  imageUrl: string;
}

export interface CropDefinition {
  id: CropId;
  name: Bilingual;
  description: Bilingual;
  imageUrl: string;
  stages: GrowthStage[];
}

export interface FarmerLocation {
  id: string;
  name: Bilingual;
  source: 'list' | 'gps';
  latitude: number;
  longitude: number;
}

export interface FarmerInput {
  location: FarmerLocation;
  cropId: CropId;
  stageId: string;
  sowingDate: string;
  language: Language;
}

export interface DailyForecast {
  date: string;
  tempMax: number | null;
  tempMin: number | null;
  precipitation: number | null;
  rainProbability: number | null;
  humidity: number | null;
  windSpeed: number | null;
}

export interface WeatherForecast {
  source: string | null;
  fetchedAt: string;
  daily: DailyForecast[];
}

export type RiskLevel = 'low' | 'moderate' | 'high';

export interface RiskSource {
  name: string;
  url: string | null;
}

export interface WeatherRisk {
  id: string;
  title: Bilingual;
  severity: RiskLevel | null;
  forecastPeriod: Bilingual;
  weatherCondition: Bilingual;
  whyItMatters: Bilingual;
  precautions: Bilingual[];
  sources: RiskSource[];
}

export type AssessmentStatus = 'completed' | 'no_significant_risk' | 'insufficient_data';

export interface AdvisoryResponse {
  assessmentStatus: AssessmentStatus;
  forecast: WeatherForecast;
  risks: WeatherRisk[];
  insufficientData: Bilingual | null;
  aiSummary: Bilingual | null;
  aiFallback: boolean;
  actions: Bilingual[];
}
