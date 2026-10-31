import type { AdvisoryResponse, Bilingual, FarmerInput, Language, RiskLevel } from '../types/farm';

export const ADVISORY_FUNCTION_PATH = '/functions/v1/crop-advisory';

export interface AdvisoryRequestBody {
  location: string;
  crop: string;
  sowingDate: string;
  growthStage: string;
  language: Language;
}

interface ContractSource {
  title: string;
  url: string;
}

interface ContractRisk {
  name: string;
  severity: RiskLevel;
  weatherCondition: string;
  forecastPeriod: string;
  reason: string;
  source?: ContractSource | null;
}

interface ContractDay {
  date: string;
  temperatureMaxC: number;
  temperatureMinC: number;
  precipitationMm: number;
  humidityPercent: number;
  windSpeedKmh: number;
}

export interface ContractSuccess {
  success: true;
  assessmentStatus: 'completed' | 'no_significant_risk' | 'insufficient_data';
  crop: string;
  growthStage: string;
  location: { name: string; latitude: number; longitude: number };
  weather: { source: string; timezone: string; fetchedAt: string; dailyForecast: ContractDay[] };
  risks: ContractRisk[];
  advisory: { summary: string; actions: string[]; language: Language };
  aiStatus: string;
}

export interface ContractFailure {
  success: false;
  error: { code: string; message: string };
}

export type ContractResponse = ContractSuccess | ContractFailure;

export class AdvisoryRequestError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AdvisoryRequestError';
    this.code = code;
  }
}

export function buildAdvisoryRequest(input: FarmerInput): AdvisoryRequestBody {
  return {
    location: input.location.name.en,
    crop: input.cropId,
    sowingDate: input.sowingDate,
    growthStage: input.stageId,
    language: input.language,
  };
}

export function parseContractResponse(raw: unknown): ContractSuccess {
  if (typeof raw !== 'object' || raw === null || !('success' in raw)) {
    throw new AdvisoryRequestError('INTERNAL_SERVER_ERROR', 'Unexpected response from the advisory service.');
  }

  const response = raw as ContractResponse;
  if (response.success === false) {
    throw new AdvisoryRequestError(response.error?.code ?? 'INTERNAL_SERVER_ERROR', response.error?.message ?? '');
  }

  if (!Array.isArray(response.risks) || !Array.isArray(response.weather?.dailyForecast) || !response.advisory) {
    throw new AdvisoryRequestError('INTERNAL_SERVER_ERROR', 'Advisory response is missing required fields.');
  }

  return response;
}

function sameText(text: string): Bilingual {
  return { hi: text, en: text };
}

export function toAdvisoryResponse(data: ContractSuccess): AdvisoryResponse {
  const summary = data.advisory.summary ? sameText(data.advisory.summary) : null;

  return {
    forecast: {
      fetchedAt: data.weather.fetchedAt,
      daily: data.weather.dailyForecast.map((day) => ({
        date: day.date,
        tempMax: day.temperatureMaxC,
        tempMin: day.temperatureMinC,
        precipitation: day.precipitationMm,
        rainProbability: null,
        humidity: day.humidityPercent,
        windSpeed: day.windSpeedKmh,
      })),
    },
    risks: data.risks.map((risk, index) => ({
      id: `${index}-${risk.name}`,
      title: sameText(risk.name),
      severity: risk.severity,
      forecastPeriod: sameText(risk.forecastPeriod),
      weatherCondition: sameText(risk.weatherCondition),
      whyItMatters: sameText(risk.reason),
      precautions: [],
      sources: risk.source ? [{ name: risk.source.title, url: risk.source.url }] : [],
    })),
    insufficientData: data.assessmentStatus === 'insufficient_data' ? summary : null,
    aiSummary: data.aiStatus === 'completed' ? summary : null,
    actions: data.advisory.actions.map(sameText),
  };
}
