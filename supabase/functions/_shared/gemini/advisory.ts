// =============================================================================
// Phase D orchestrator: engine results → farmer-friendly advisory
// =============================================================================
// Flow
//   1. Engine could not assess, or flagged nothing  → fixed text, Gemini NOT called.
//   2. No API key                                    → engine-written fallback.
//   3. Call Gemini with the engine's facts only.
//   4. Parse + validate (guard.ts). Any failure      → engine-written fallback.
//   5. Otherwise                                     → Gemini's explanations.
//
// Gemini can only EXPLAIN. Risk names, severities, thresholds, periods and
// sources always come from the engine (detected_risks) and are never taken
// from the model. This function never throws.
// =============================================================================

import type { AiAdvisory, AiFallbackReason, CropType, GrowthStage, Language } from '../types.ts';
import type { RiskEngineResult } from '../risk-engine/index.ts';
import { DISCLAIMER } from './labels.ts';
import { buildFacts, buildRequestBody } from './prompt.ts';
import { callGemini } from './client.ts';
import { validateAiOutput } from './guard.ts';
import { buildFallbackAdvisory, buildNothingToExplain } from './fallback.ts';

/** Model IDs change often; override with the GEMINI_MODEL secret. */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

export interface AdvisoryInput {
  crop: CropType;
  growth_stage: GrowthStage;
  language: Language;
  engine: RiskEngineResult;
}

export interface AdvisoryDeps {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export async function generateAiAdvisory(
  input: AdvisoryInput,
  deps: AdvisoryDeps = {},
): Promise<AiAdvisory> {
  const { crop, growth_stage, language, engine } = input;

  try {
    // 1. Nothing to explain ------------------------------------------------------
    if (engine.status !== 'ok') {
      return buildNothingToExplain({ crop, growth_stage, language, engineCouldNotAssess: true });
    }
    if (engine.detected_risks.length === 0) {
      return buildNothingToExplain({ crop, growth_stage, language, engineCouldNotAssess: false });
    }

    const fallback = (reason: AiFallbackReason, detail?: string): AiAdvisory => {
      console.warn(`[advisory] Gemini not used: ${reason}${detail ? ` (${detail})` : ''}`);
      return buildFallbackAdvisory({ risks: engine.detected_risks, crop, growth_stage, language, reason });
    };

    // 2. Not configured -----------------------------------------------------------
    if (!deps.apiKey) return fallback('not_configured');

    // 3. Ask Gemini ---------------------------------------------------------------
    const facts = buildFacts({ crop, growth_stage, engine });
    const model = deps.model?.trim() || DEFAULT_GEMINI_MODEL;
    const result = await callGemini({
      apiKey: deps.apiKey,
      model,
      body: buildRequestBody(facts, language),
      timeoutMs: deps.timeoutMs,
      fetchImpl: deps.fetchImpl,
    });
    if (!result.ok) return fallback(result.reason, result.detail);

    // 4. Parse + validate -------------------------------------------------------------
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripCodeFence(result.text));
    } catch {
      return fallback('invalid_output', 'not valid JSON');
    }
    const checked = validateAiOutput(parsed, facts, language);
    if (!checked.ok) return fallback(checked.reason, checked.detail);

    // 5. Accepted -------------------------------------------------------------------------
    return {
      status: 'generated',
      language,
      generated_by: 'gemini',
      model,
      summary: checked.value.summary,
      risks: checked.value.risks,
      disclaimer: DISCLAIMER[language],
    };
  } catch (err) {
    // Last-resort safety net: the deterministic results must always get through.
    console.error('[advisory] unexpected error:', err instanceof Error ? err.name : 'unknown');
    return engine.detected_risks.length > 0
      ? buildFallbackAdvisory({ risks: engine.detected_risks, crop, growth_stage, language, reason: 'api_error' })
      : buildNothingToExplain({ crop, growth_stage, language, engineCouldNotAssess: engine.status !== 'ok' });
  }
}

/** Models sometimes wrap JSON in ```json fences even when asked not to. */
function stripCodeFence(text: string): string {
  const m = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1] : text;
}
