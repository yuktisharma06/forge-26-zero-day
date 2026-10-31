// =============================================================================
// generate-advisory — Main Edge Function
// =============================================================================
// This is the single entry point the frontend will call.
// Phases B–E will implement the full logic; this scaffold wires up the
// request/response shell, CORS handling, input validation, and error envelopes.
//
// Current state (Phase A): scaffold only — returns HTTP 501 Not Implemented.
// =============================================================================

import { corsHeaders } from '../_shared/cors.ts';
import type { FarmerInput, AdvisoryResponse } from '../_shared/types.ts';

Deno.serve(async (req: Request): Promise<Response> => {
  // ── Preflight ──────────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ── Method guard ───────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    // ── Parse & validate farmer input ────────────────────────────────────────
    let body: Partial<FarmerInput>;
    try {
      body = await req.json();
    } catch {
      return errorResponse(400, 'Invalid JSON in request body.');
    }

    const validationError = validateFarmerInput(body);
    if (validationError) {
      return errorResponse(400, validationError);
    }

    // Type assertion is safe because validateFarmerInput confirmed required fields.
    const farmerInput = body as FarmerInput;

    // ── TODO (Phase B): Fetch weather forecast from Open-Meteo ───────────────
    // ── TODO (Phase C): Run crop-specific risk engine ────────────────────────
    // ── TODO (Phase D): Call Gemini for advisory text ────────────────────────
    // ── TODO (Phase E): Persist advisory to Supabase DB ─────────────────────

    // Phase A scaffold — return 501 until Phases B–E are implemented.
    return new Response(
      JSON.stringify({
        status: 'not_implemented',
        message:
          'Backend scaffold is in place. Weather, risk engine, and Gemini integration will be added in Phases B–E.',
        received_input: {
          location: farmerInput.location,
          crop: farmerInput.crop,
          growth_stage: farmerInput.growth_stage,
          language: farmerInput.language,
        },
      }),
      {
        status: 501,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('[generate-advisory] Unhandled error:', err);
    return errorResponse(
      500,
      'An unexpected error occurred. Please try again.',
    );
  }
});

// =============================================================================
// Input validation
// =============================================================================

const VALID_CROPS = new Set(['sugarcane', 'wheat']);
const VALID_LANGUAGES = new Set(['en', 'hi']);
const VALID_WHEAT_STAGES = new Set([
  'early_growth',
  'cri',
  'vegetative_growth',
  'reproductive',
  'grain_development_maturity',
]);
const VALID_SUGARCANE_STAGES = new Set([
  'germination',
  'tillering',
  'grand_growth',
  'maturity_ripening',
]);

function validateFarmerInput(body: Partial<FarmerInput>): string | null {
  if (!body.location || typeof body.location !== 'string' || body.location.trim() === '') {
    return 'location is required.';
  }

  if (typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
    return 'latitude and longitude are required and must be numbers.';
  }

  if (body.latitude < -90 || body.latitude > 90) {
    return 'latitude must be between -90 and 90.';
  }

  if (body.longitude < -180 || body.longitude > 180) {
    return 'longitude must be between -180 and 180.';
  }

  if (!body.crop || !VALID_CROPS.has(body.crop)) {
    return `crop must be one of: ${[...VALID_CROPS].join(', ')}.`;
  }

  if (!body.growth_stage) {
    return 'growth_stage is required.';
  }

  const validStages =
    body.crop === 'wheat' ? VALID_WHEAT_STAGES : VALID_SUGARCANE_STAGES;
  if (!validStages.has(body.growth_stage)) {
    return `growth_stage '${body.growth_stage}' is not valid for crop '${body.crop}'.`;
  }

  if (!body.language || !VALID_LANGUAGES.has(body.language)) {
    return `language must be one of: ${[...VALID_LANGUAGES].join(', ')}.`;
  }

  return null; // all required fields valid
}

// =============================================================================
// Helpers
// =============================================================================

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
