
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

  // Backend weather information
  dataStatus?: 'live' | 'sample';
  timezone?: string;
  forecastDays?: number;
  startDate?: string;
  endDate?: string;
  dataQualityNotes?: string[];
  note?: string | null;
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

  // Additional backend risk information
  triggeredDates?: string[];
  peakValue?: number | null;
  peakDate?: string | null;
  severityBasis?: string;
  caveats?: string[];
}

export interface WeatherWarning {
  id: string;
  category: 'heat' | 'rainfall';
  name: string;
  crop: CropId;
  growthStage: string;
  date: string;
  observedValue: number;
  unit: string;
  message: string;
  caveat: string;
}

export interface NotAssessedRisk {
  id: string;
  name: string;
  reason: string;
  explanation: string;
}

export type AssessmentStatus =
  | 'completed'
  | 'no_significant_risk'
  | 'insufficient_data';

export interface AdvisoryResponse {
  assessmentStatus: AssessmentStatus;
  forecast: WeatherForecast;
  risks: WeatherRisk[];
  insufficientData: Bilingual | null;
  aiSummary: Bilingual | null;
  aiFallback: boolean;
  actions: Bilingual[];

  // Additional backend response information
  weatherWarnings?: WeatherWarning[];
  notAssessedRisks?: NotAssessedRisk[];
  notes?: string[];
  generatedAt?: string;
  insufficientReason?: string | null;
  aiStatus?: 'completed' | 'fallback' | 'skipped';
  aiNote?: string | null;
  advisoryWrittenBy?: 'ai' | 'rules';
  advisoryDisclaimer?: string;
}
