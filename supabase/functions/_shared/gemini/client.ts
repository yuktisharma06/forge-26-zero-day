// =============================================================================
// Minimal Gemini REST client (backend only)
// =============================================================================
// - The API key is read by the caller from the environment and sent in the
//   x-goog-api-key header. It is never put in a URL, logged or returned.
// - Never throws. Every failure becomes a typed reason the caller turns into
//   the deterministic fallback.
// =============================================================================

import type { AiFallbackReason } from '../types.ts';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
export const DEFAULT_TIMEOUT_MS = 20_000;

export type GeminiResult =
  | { ok: true; text: string }
  | { ok: false; reason: AiFallbackReason; detail: string };

export async function callGemini(args: {
  apiKey: string;
  model: string;
  body: unknown;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<GeminiResult> {
  const { apiKey, model, body, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch } = args;
  const url = `${BASE_URL}/${encodeURIComponent(model)}:generateContent`;

  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'TimeoutError' || name === 'AbortError') {
      return { ok: false, reason: 'timeout', detail: `no response within ${timeoutMs} ms` };
    }
    return { ok: false, reason: 'api_error', detail: 'network error' };
  }

  if (!res.ok) {
    // Status only: the error body can echo request details, so it is not logged.
    return { ok: false, reason: 'api_error', detail: `HTTP ${res.status}` };
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    return { ok: false, reason: 'invalid_output', detail: 'response was not JSON' };
  }

  if (json?.promptFeedback?.blockReason) {
    return { ok: false, reason: 'blocked', detail: String(json.promptFeedback.blockReason) };
  }

  const candidate = json?.candidates?.[0];
  const finish = candidate?.finishReason;
  if (finish && finish !== 'STOP' && finish !== 'MAX_TOKENS') {
    return { ok: false, reason: 'blocked', detail: String(finish) };
  }
  if (finish === 'MAX_TOKENS') {
    return { ok: false, reason: 'invalid_output', detail: 'output truncated' };
  }

  const parts: any[] = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
  const text = parts
    .filter((p) => typeof p?.text === 'string' && !p?.thought)
    .map((p) => p.text)
    .join('')
    .trim();

  if (!text) return { ok: false, reason: 'invalid_output', detail: 'empty response' };
  return { ok: true, text };
}
