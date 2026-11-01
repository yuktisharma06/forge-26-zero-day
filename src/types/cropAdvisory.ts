import type { AssessmentStatus, CropId, Language, RiskLevel } from './farm';

export interface CropAdvisoryRequest {
  location: string;
  crop: CropId;
  sowingDate?: string;
  growthStage: string;
  language: Language;
  latitude?: number;
  longitude?: number;
}

export interface CropAdvisoryLocation {
  name: string;
  latitude: number;
  longitude: number;
}

export interface CropAdvisoryDailyForecast {
  date: string;
  temperatureMaxC: number | null;
  temperatureMinC: number | null;
  precipitationMm: number | null;
  precipitationProbabilityPct: number | null;
  humidityPercent: number | null;
  windSpeedKmh: number | null;
}

export interface CropAdvisoryWeather {
  source: string;
  dataStatus: 'live' | 'sample';
  timezone: string;
  fetchedAt: string;
  forecastDays: number;
  startDate: string;
  endDate: string;
  dailyForecast: CropAdvisoryDailyForecast[];
  dataQualityNotes: string[];
  note: string | null;
}

export interface CropAdvisorySource {
  title: string;
  url: string | null;
  citation: string;
  evidenceType:
    | 'official_classification'
    | 'extension_guidance'
    | 'research_literature';
  applicabilityNote: string | null;
}

export interface CropAdvisoryRisk {
  id: string;
  name: string;
  severity: RiskLevel;
  weatherCondition: string;
  forecastPeriod: string;
  triggeredDates: string[];
  peakValue: number | null;
  peakDate: string | null;
  reason: string;
  severityBasis: string;
  caveats: string[];
  preventiveAction: string | null;
  source: CropAdvisorySource | null;
}

export interface CropAdvisoryWeatherWarning {
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

export interface CropAdvisoryNotAssessedRisk {
  id: string;
  name: string;
  reason:
    | 'insufficient_field_data'
    | 'no_validated_threshold'
    | 'insufficient_evidence';
  explanation: string;
}

export interface CropAdvisoryAdvice {
  summary: string;
  actions: string[];
  language: Language;
  writtenBy: 'ai' | 'rules';
  disclaimer: string;
}

export type CropAdvisoryAiStatus = 'completed' | 'fallback' | 'skipped';

export type CropAdvisoryInsufficientReason =
  | 'sample_weather'
  | 'stale_weather'
  | 'no_forecast'
  | 'no_rules'
  | 'unassessable';

export interface CropAdvisorySuccess {
  success: true;
  assessmentStatus: AssessmentStatus;
  crop: CropId;
  growthStage: string;
  sowingDate: string | null;
  location: CropAdvisoryLocation;
  weather: CropAdvisoryWeather;
  notes: string[];
  notAssessedRisks: CropAdvisoryNotAssessedRisk[];
  generatedAt: string;
  insufficientReason: CropAdvisoryInsufficientReason | null;
  weatherWarnings: CropAdvisoryWeatherWarning[];
  risks: CropAdvisoryRisk[];
  advisory: CropAdvisoryAdvice;
  aiStatus: CropAdvisoryAiStatus;
  aiNote: string | null;
}

export type CropAdvisoryErrorCode =
  | 'INVALID_INPUT'
  | 'LOCATION_NOT_FOUND'
  | 'WEATHER_API_ERROR'
  | 'AI_SERVICE_ERROR'
  | 'INTERNAL_SERVER_ERROR';

export interface CropAdvisoryFailure {
  success: false;
  error: {
    code: CropAdvisoryErrorCode;
    message: string;
  };
}

export type CropAdvisoryResponse =
  | CropAdvisorySuccess
  | CropAdvisoryFailure;