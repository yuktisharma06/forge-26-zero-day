import type { AdvisoryResponse, Bilingual, FarmerInput } from '../types/farm';
import type { CropAdvisoryErrorCode, CropAdvisoryRequest, CropAdvisorySuccess } from '../types/cropAdvisory';

export const CROP_ADVISORY_PATH = '/functions/v1/crop-advisory';

export type AdvisoryErrorCode = CropAdvisoryErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'INVALID_RESPONSE';

const KNOWN_ERROR_CODES: readonly string[] = [
  'INVALID_INPUT',
  'LOCATION_NOT_FOUND',
  'WEATHER_API_ERROR',
  'AI_SERVICE_ERROR',
  'INTERNAL_SERVER_ERROR',
];

const ASSESSMENT_STATUSES: readonly string[] = ['completed', 'no_significant_risk', 'insufficient_data'];
const RISK_SEVERITIES: readonly string[] = ['low', 'moderate', 'high'];

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
    ...(input.sowingDate ? { sowingDate: input.sowingDate } : {}),
    growthStage: input.stageId,
    language: input.language,
  };
}

export function isFailureBody(raw: unknown): boolean {
  return typeof raw === 'object' && raw !== null && (raw as { success?: unknown }).success === false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasValidRisks(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (risk) =>
        isRecord(risk) &&
        typeof risk.name === 'string' &&
        typeof risk.severity === 'string' &&
        RISK_SEVERITIES.includes(risk.severity) &&
        typeof risk.weatherCondition === 'string' &&
        typeof risk.forecastPeriod === 'string' &&
        typeof risk.reason === 'string',
    )
  );
}

function isNullableNumber(value: unknown): boolean {
  return value === null || typeof value === 'number';
}

function hasValidWeather(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.fetchedAt === 'string' &&
    Array.isArray(value.dailyForecast) &&
    value.dailyForecast.every(
      (day) =>
        isRecord(day) &&
        typeof day.date === 'string' &&
        isNullableNumber(day.temperatureMaxC) &&
        isNullableNumber(day.temperatureMinC) &&
        isNullableNumber(day.precipitationMm) &&
        isNullableNumber(day.humidityPercent) &&
        isNullableNumber(day.windSpeedKmh),
    )
  );
}

function hasValidAdvisory(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.summary === 'string' &&
    Array.isArray(value.actions) &&
    value.actions.every((action) => typeof action === 'string')
  );
}

export function parseCropAdvisoryResponse(raw: unknown): CropAdvisorySuccess {
  if (!isRecord(raw) || !('success' in raw)) {
    throw new AdvisoryRequestError('INVALID_RESPONSE', 'Unexpected response from the advisory service.');
  }

  if (raw.success === false) {
    const error = isRecord(raw.error) ? raw.error : {};
    const code = typeof error.code === 'string' ? error.code : '';
    const known = KNOWN_ERROR_CODES.includes(code) ? (code as AdvisoryErrorCode) : 'INTERNAL_SERVER_ERROR';
    const message = typeof error.message === 'string' ? error.message : 'Advisory request failed.';
    throw new AdvisoryRequestError(known, message);
  }

  if (
    raw.success !== true ||
    typeof raw.assessmentStatus !== 'string' ||
    !ASSESSMENT_STATUSES.includes(raw.assessmentStatus) ||
    !hasValidRisks(raw.risks) ||
    !hasValidWeather(raw.weather) ||
    !hasValidAdvisory(raw.advisory) ||
    typeof raw.aiStatus !== 'string'
  ) {
    throw new AdvisoryRequestError('INVALID_RESPONSE', 'Advisory response is missing required fields.');
  }

  return raw as unknown as CropAdvisorySuccess;
}

function sameText(text: string): Bilingual {
  return { hi: text, en: text };
}

export function toAdvisoryResponse(data: CropAdvisorySuccess): AdvisoryResponse {
  const summary = data.advisory.summary ? sameText(data.advisory.summary) : null;

  return {
    assessmentStatus: data.assessmentStatus,
    forecast: {
      source: data.weather.source || null,
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
   risks: data.risks.map((risk) => ({
  id: risk.id,
  title: sameText(risk.name),
  severity: risk.severity,
  forecastPeriod: sameText(risk.forecastPeriod),
  weatherCondition: sameText(risk.weatherCondition),
  whyItMatters: sameText(risk.reason),
  precautions: risk.preventiveAction
    ? [sameText(risk.preventiveAction)]
    : [],
  sources: risk.source?.url
    ? [{ name: risk.source.title, url: risk.source.url }]
    : [],
})),

insufficientData: data.insufficientReason
      ? sameText(data.insufficientReason)
      : null,

    aiSummary: summary,
    aiFallback:
      data.aiStatus === 'fallback' || data.advisory.writtenBy === 'rules',
    actions: data.advisory.actions.map(sameText),

    weatherWarnings: data.weatherWarnings,
    notAssessedRisks: data.notAssessedRisks,
    notes: data.notes,
    generatedAt: data.generatedAt,
    insufficientReason: data.insufficientReason,
    aiStatus: data.aiStatus,
    aiNote: data.aiNote,
    advisoryWrittenBy: data.advisory.writtenBy,
    advisoryDisclaimer: data.advisory.disclaimer,
  };
}