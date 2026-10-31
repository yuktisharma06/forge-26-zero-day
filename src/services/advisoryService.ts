import type { AdvisoryResponse, FarmerInput } from '../types/farm';
import {
  AdvisoryRequestError,
  CROP_ADVISORY_PATH,
  buildCropAdvisoryRequest,
  parseCropAdvisoryResponse,
  toAdvisoryResponse,
} from './advisoryContract';
import { fetchMockAdvisory } from './mockAdvisoryService';

const USE_MOCK_ADVISORY = import.meta.env.VITE_USE_MOCK_ADVISORY !== 'false';

async function fetchLiveAdvisory(input: FarmerInput): Promise<AdvisoryResponse> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) {
    throw new AdvisoryRequestError('INTERNAL_SERVER_ERROR', 'Advisory service is not configured.');
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${CROP_ADVISORY_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(buildCropAdvisoryRequest(input)),
    });
  } catch {
    throw new AdvisoryRequestError('NETWORK_ERROR', 'Could not reach the advisory service.');
  }

  const raw: unknown = await response.json().catch(() => null);
  return toAdvisoryResponse(parseCropAdvisoryResponse(raw));
}

export function fetchAdvisory(input: FarmerInput): Promise<AdvisoryResponse> {
  return USE_MOCK_ADVISORY ? fetchMockAdvisory(input) : fetchLiveAdvisory(input);
}
