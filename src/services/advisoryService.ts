import { buildMockForecast } from '../data/mockWeather';
import { MOCK_STAGE_ADVISORIES } from '../data/mockRisks';
import type { AdvisoryResponse, FarmerInput } from '../types/farm';
import {
  ADVISORY_FUNCTION_PATH,
  buildAdvisoryRequest,
  parseContractResponse,
  toAdvisoryResponse,
} from './advisoryContract';

const MOCK_LATENCY_MS = 800;
const USE_MOCK_ADVISORY = import.meta.env.VITE_USE_MOCK_ADVISORY !== 'false';

async function fetchMockAdvisory(input: FarmerInput): Promise<AdvisoryResponse> {
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
    actions: [],
  };
}

async function fetchLiveAdvisory(input: FarmerInput): Promise<AdvisoryResponse> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error('Advisory service is not configured');
  }

  const response = await fetch(`${supabaseUrl}${ADVISORY_FUNCTION_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(buildAdvisoryRequest(input)),
  });

  const raw: unknown = await response.json().catch(() => null);
  return toAdvisoryResponse(parseContractResponse(raw));
}

export function fetchAdvisory(input: FarmerInput): Promise<AdvisoryResponse> {
  return USE_MOCK_ADVISORY ? fetchMockAdvisory(input) : fetchLiveAdvisory(input);
}
