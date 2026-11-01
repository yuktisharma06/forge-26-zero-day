import type { AssessmentStatus, CropId, Language, RiskLevel } from './farm';

export interface CropAdvisoryRequest {
  location: string;
  crop: CropId;
  sowingDate?: string;
  growthStage: string;
  language: Language;
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
  humidityPercent: number | null;
  windSpeedKmh: number | null;
}

export interface CropAdvisoryWeather {
  source: string;
  timezone: string;
  fetchedAt: string;
  dailyForecast: CropAdvisoryDailyForecast[];
}

export interface CropAdvisorySource {
  title: string;
  url: string;
}

export interface CropAdvisoryRisk {
  name: string;
  severity: RiskLevel;
  weatherCondition: string;
  forecastPeriod: string;
  reason: string;
  source?: CropAdvisorySource | null;
}

export interface CropAdvisoryAdvice {
  summary: string;
  actions: string[];
  language: Language;
}

export interface CropAdvisorySuccess {
  success: true;
  assessmentStatus: AssessmentStatus;
  crop: CropId;
  growthStage: string;
  location: CropAdvisoryLocation;
  weather: CropAdvisoryWeather;
  risks: CropAdvisoryRisk[];
  advisory: CropAdvisoryAdvice;
  aiStatus: string;
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

export type CropAdvisoryResponse = CropAdvisorySuccess | CropAdvisoryFailure;
