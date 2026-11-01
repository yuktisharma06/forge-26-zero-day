import type { AdvisoryResponse, FarmerInput } from '../types/farm';
import {
  AdvisoryRequestError,
  CROP_ADVISORY_PATH,
  buildCropAdvisoryRequest,
  isFailureBody,
  parseCropAdvisoryResponse,
  toAdvisoryResponse,
  type AdvisoryErrorCode,
} from './advisoryContract';
import { fetchMockAdvisory } from './mockAdvisoryService';

export const ADVISORY_USES_MOCK = import.meta.env.VITE_USE_MOCK_ADVISORY !== 'false';

const ADVISORY_TIMEOUT_MS = 20000;

function codeForHttpStatus(status: number): AdvisoryErrorCode {
  if (status === 400) return 'INVALID_INPUT';
  if (status === 404) return 'LOCATION_NOT_FOUND';
  return 'INTERNAL_SERVER_ERROR';
}

async function requestLiveAdvisory(input: FarmerInput): Promise<AdvisoryResponse> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) {
    throw new AdvisoryRequestError('INTERNAL_SERVER_ERROR', 'Advisory service is not configured.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ADVISORY_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${CROP_ADVISORY_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(buildCropAdvisoryRequest(input)),
      signal: controller.signal,
    });

    if (!response.ok) {
      const failureBody: unknown = await response.json().catch(() => null);
      if (isFailureBody(failureBody)) parseCropAdvisoryResponse(failureBody);
      throw new AdvisoryRequestError(codeForHttpStatus(response.status), 'Advisory request failed.');
    }

    const raw: unknown = await response.json();
    return toAdvisoryResponse(parseCropAdvisoryResponse(raw));
  } catch (error) {
    if (error instanceof AdvisoryRequestError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AdvisoryRequestError('TIMEOUT', 'The advisory request timed out.');
    }
    if (error instanceof SyntaxError) {
      throw new AdvisoryRequestError('INVALID_RESPONSE', 'Advisory response was not valid JSON.');
    }
    throw new AdvisoryRequestError('NETWORK_ERROR', 'Could not reach the advisory service.');
  } finally {
    clearTimeout(timer);
  }
}

export function fetchAdvisory(input: FarmerInput): Promise<AdvisoryResponse> {
  return ADVISORY_USES_MOCK ? fetchMockAdvisory(input) : requestLiveAdvisory(input);
}
