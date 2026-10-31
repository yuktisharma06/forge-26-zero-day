import type { AdvisoryResponse, Bilingual, FarmerInput } from '../types/farm';
import type { CropAdvisoryErrorCode, CropAdvisoryRequest, CropAdvisorySuccess } from '../types/cropAdvisory';

export const CROP_ADVISORY_PATH = '/functions/v1/crop-advisory';

export type AdvisoryErrorCode = CropAdvisoryErrorCode | 'NETWORK_ERROR';

const KNOWN_ERROR_CODES: readonly string[] = [
  'INVALID_INPUT',
  'LOCATION_NOT_FOUND',
  'WEATHER_API_ERROR',
  'AI_SERVICE_ERROR',
  'INTERNAL_SERVER_ERROR',
];

export class AdvisoryRequestError extends Error {
  readonly code: AdvisoryErrorCode;

  constructor(code: AdvisoryErrorCode, message: string) {
    super(message);
    this.name = 'AdvisoryRequestError';
    this.code = code;
  }
}

export function buildCropAdvisoryRequest(input: FarmerInput): CropAdvisoryRequest {
  return {
    location: input.location.name.en,
    crop: input.cropId,
    sowingDate: input.sowingDate,
    growthStage: input.stageId,
    language: input.language,
  };
}

export function parseCropAdvisoryResponse(raw: unknown): CropAdvisorySuccess {
  if (typeof raw !== 'object' || raw === null || !('success' in raw)) {
    throw new AdvisoryRequestError('INTERNAL_SERVER_ERROR', 'Unexpected response from the advisory service.');
  }

  const response = raw as {
    success?: unknown;
    assessmentStatus?: unknown;
    risks?: unknown;
    weather?: { dailyForecast?: unknown };
    advisory?: unknown;
    error?: { code?: string; message?: string };
  };

  if (response.success === false) {
    const code = response.error?.code ?? '';
    const known = KNOWN_ERROR_CODES.includes(code) ? (code as AdvisoryErrorCode) : 'INTERNAL_SERVER_ERROR';
    throw new AdvisoryRequestError(known, response.error?.message ?? 'Advisory request failed.');
  }

  if (
    response.success !== true ||
    !Array.isArray(response.risks) ||
    !Array.isArray(response.weather?.dailyForecast) ||
    !response.advisory ||
    typeof response.assessmentStatus !== 'string'
  ) {
    throw new AdvisoryRequestError('INTERNAL_SERVER_ERROR', 'Advisory response is missing required fields.');
  }

  return response as CropAdvisorySuccess;
}

function sameText(text: string): Bilingual {
  return { hi: text, en: text };
}

export function toAdvisoryResponse(data: CropAdvisorySuccess): AdvisoryResponse {
  const summary = data.advisory.summary ? sameText(data.advisory.summary) : null;

  return {
    assessmentStatus: data.assessmentStatus,
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
