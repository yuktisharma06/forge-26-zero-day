import { buildMockForecast } from '../data/mockWeather';
import { MOCK_STAGE_ADVISORIES } from '../data/mockRisks';
import type { AdvisoryResponse, FarmerInput } from '../types/farm';

const MOCK_LATENCY_MS = 800;

export async function fetchAdvisory(input: FarmerInput): Promise<AdvisoryResponse> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

  const stageAdvisory = MOCK_STAGE_ADVISORIES[input.cropId][input.stageId];
  if (!stageAdvisory) {
    throw new Error(`No advisory available for ${input.cropId} at stage ${input.stageId}`);
  }

  return {
    forecast: buildMockForecast(),
    risks: stageAdvisory.risks,
    insufficientData: stageAdvisory.insufficientData,
    aiSummary: stageAdvisory.aiSummary,
  };
}
