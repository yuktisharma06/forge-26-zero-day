// =============================================================================
// Gemini explanation helper
// =============================================================================
// Gemini only EXPLAINS risks the deterministic engine already found.
// It never decides whether a risk exists and never sets severity.
//
// Safety layers:
//   1. The prompt forbids new thresholds, products, doses and chemicals.
//   2. The answer must be valid JSON in a fixed shape.
//   3. Output checks (any failure rejects the whole answer and the caller uses the
//      deterministic text instead):
//        - language: Hindi answers must be in Devanagari, English answers must not
//        - numbers: every number must already appear in the facts sent to Gemini
//          (blocks invented temperatures, rainfall amounts, thresholds, percentages)
//        - doses: dose-like numbers ("5 ml", "2%") not in the approved text are rejected
//        - per-area rates ("per acre", "प्रति एकड़") are always rejected
//        - chemical / pesticide / fertiliser / spray terms are always rejected
//   4. One retry for temporary Google errors (429, 5xx, network). Timeouts are not retried.
//   5. The location name is NOT sent to Gemini (it does not need it).
//
// The API key is read by the caller from Deno.env and passed in. It is never
// logged and never returned in a response.
// =============================================================================

import type { Language } from '../types.ts';

export interface GeminiRiskInput {
  rule_id: string;
  risk_name: string;
  /** 'low' | 'moderate' | 'high', assigned by the risk engine. */
  severity: string;
  weather_condition: string;
  forecast_period: string;
  /** Name of the source the threshold comes from. */
  source_name: string;
  /** 'official_classification' | 'extension_guidance' | 'research_literature' */
  evidence_type: string;
  /** How well the source transfers to this farmer (may be empty). */
  applicability_note: string;
  /** Limits of the rule. */
  caveats: string[];
  /** The only actions Gemini may restate. */
  approved_action: string;
}

/** An informational weather warning. It is NOT a crop risk and has no severity. */
export interface GeminiWarningInput {
  id: string;
  name: string;
  dates: string[];
  peak_value: number;
  unit: string;
  message: string;
  caveat: string;
  /** The only action Gemini may restate for this warning. */
  approved_action: string;
}

export interface GeminiExplanation {
  summary: string;
  risks: { rule_id: string; title: string; reason: string }[];
  actions: string[];
}

export type ExplainResult =
  | { ok: true; explanation: GeminiExplanation }
  | { ok: false; reason: string };

export interface ExplainArgs {
  apiKey: string | undefined;
  model: string;
  language: Language;
  cropLabel: string;
  stageLabel: string;
  /** Kept for callers; deliberately NOT sent to Gemini. */
  locationName?: string;
  risks: GeminiRiskInput[];
  /** Informational weather warnings (may be empty). */
  warnings?: GeminiWarningInput[];
  timeoutMs?: number;
  /** Test hooks. */
  fetchImpl?: typeof fetch;
  /** Pause before the single retry (ms). Default 1500. */
  retryDelayMs?: number;
}

const SYSTEM_PROMPT = `You write short, simple advisory text for small farmers in Uttar Pradesh, India.

STRICT RULES
- Use ONLY the facts in the JSON you are given. Do not add any weather values, thresholds, products, chemicals, doses, quantities or percentages that are not in it.
- Never claim that rainfall alone confirms waterlogging. Say it "may" cause problems.
- Each risk is a screening signal from a published reference level, not confirmed damage. Never say damage will happen. Say it "may" be affected.
- If applicability_note or caveats say the level is a general guide, comes from another region, or is not a damage threshold, say so briefly in simple words. Do not present the level as a proven damage point.
- Do not change or restate the severity in a different strength. Do not add risks that are not in the JSON.
- The JSON may contain "weather_warnings". They are informational weather alerts, NOT crop risks and they have no severity. Never call a warning a risk. Never say a warning means crop damage, yield loss, waterlogging, flooding, frost injury or disease. Keep the meaning of its caveat.
- The "risks" array in your answer may only contain items whose rule_id is in the input "risks". If the input "risks" is empty, answer with "risks": [].
- For "actions", rewrite ONLY the approved_action texts in simpler words. Do not invent new actions. Do not merge in advice from your own knowledge.
- Use simple words, short sentences, no jargon.
- Write in the requested language ("en" = English, "hi" = Hindi in Devanagari).
- Reply with JSON ONLY, no markdown, in exactly this shape:
{"summary": string, "risks": [{"rule_id": string, "title": string, "reason": string}], "actions": [string]}
- "summary": 2 to 3 sentences. "title": under 60 characters. "reason": 1 to 2 sentences on why this weather may affect the crop. "actions": at most 6.`;

export async function explainRisks(args: ExplainArgs): Promise<ExplainResult> {
  if (!args.apiKey) {
    return { ok: false, reason: 'AI_NOT_CONFIGURED' };
  }
  const warnings = args.warnings ?? [];
  if (args.risks.length === 0 && warnings.length === 0) {
    return { ok: false, reason: 'NO_FINDINGS' };
  }

  const userPayload = JSON.stringify({
    language: args.language,
    crop: args.cropLabel,
    growth_stage: args.stageLabel,
    risks: args.risks,
    weather_warnings: warnings,
  });

  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userPayload }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  });

  const call = () => callOnce(args, requestBody);
  let attempt = await call();
  if (!attempt.ok && attempt.retryable) {
    await new Promise((r) => setTimeout(r, args.retryDelayMs ?? RETRY_DELAY_MS));
    attempt = await call();
  }
  if (!attempt.ok) return { ok: false, reason: attempt.reason };
  const response = attempt.response;

  let text: string | undefined;
  try {
    const data = await response.json();
    text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch {
    return { ok: false, reason: 'AI_BAD_RESPONSE' };
  }
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, reason: 'AI_EMPTY_RESPONSE' };
  }

  const approvedPool = [
    ...args.risks.map((r) => `${r.approved_action} ${r.weather_condition} ${r.forecast_period} ${r.risk_name}`),
    ...warnings.map((w) => `${w.approved_action} ${w.message} ${w.caveat} ${w.name} ${w.peak_value} ${w.unit} ${w.dates.join(' ')}`),
  ].join(' ');
  const parsed = parseGeminiExplanation(
    text,
    args.risks.map((r) => r.rule_id),
    approvedPool,
    { language: args.language, facts: userPayload },
  );
  return parsed
    ? { ok: true, explanation: parsed }
    : { ok: false, reason: 'AI_REJECTED_OUTPUT' };
}

// -----------------------------------------------------------------------------
// HTTP call with one retry for temporary errors
// -----------------------------------------------------------------------------

const RETRY_DELAY_MS = 1_500;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

type Attempt =
  | { ok: true; response: Response }
  | { ok: false; reason: string; retryable: boolean };

async function callOnce(args: ExplainArgs, body: string): Promise<Attempt> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:generateContent`;
  let response: Response;
  try {
    response = await (args.fetchImpl ?? fetch)(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': args.apiKey as string },
      body,
      signal: AbortSignal.timeout(args.timeoutMs ?? 12_000),
    });
  } catch (err) {
    // Do not log the request (it holds the key header). Log only the error name.
    const name = err instanceof Error ? err.name : 'unknown';
    console.warn('[gemini] request failed:', name);
    const timedOut = name === 'TimeoutError' || name === 'AbortError';
    return { ok: false, reason: 'AI_NETWORK_ERROR', retryable: !timedOut };
  }
  if (!response.ok) {
    console.warn('[gemini] HTTP', response.status);
    return { ok: false, reason: `AI_HTTP_${response.status}`, retryable: RETRYABLE_STATUS.has(response.status) };
  }
  return { ok: true, response };
}

// -----------------------------------------------------------------------------
// Validation (pure, unit-tested)
// -----------------------------------------------------------------------------

// Numbers followed by a dose-like unit. Hindi units sit outside the \b group
// because JavaScript's \b only understands ASCII word characters.
const DOSE_PATTERN =
  /\d+(?:\.\d+)?\s*(?:%|(?:ml|ltr|litres?|liters?|kg|gm|grams?|ppm|mg|g|l)\b|किलो|ग्राम|लीटर|मिली)/gi;

function squash(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}

/** True if `text` has a dose-like number that is not already in `approvedPool`. */
export function containsUnapprovedDose(text: string, approvedPool: string): boolean {
  const pool = squash(approvedPool);
  const matches = text.match(DOSE_PATTERN) ?? [];
  return matches.some((m) => !pool.includes(squash(m)));
}

// ── Extra output checks ──────────────────────────────────────────────────────
const DEVANAGARI = /[\u0900-\u097F]/;
const NOT_DEV_AFTER = '(?![\\u0900-\\u097F])';

/** Devanagari digits (०-९) -> ASCII so number checks see them. */
function normalizeDigits(s: string): string {
  return s.replace(/[\u0966-\u096F]/g, (d) => String(d.charCodeAt(0) - 0x0966));
}
function extractNumbers(s: string): number[] {
  return (normalizeDigits(s).match(/\d+(?:\.\d+)?/g) ?? []).map((m) => parseFloat(m));
}

const PER_AREA_EN =
  /\bper\s+(?:acre|acres|ha|hectare|hectares|bigha|litre|liter|pump|tank)\b|\/\s*(?:acre|ha|hectare|bigha|l|litre|liter)\b/i;
const PER_AREA_HI = new RegExp(`प्रति\\s*(?:एकड़|हेक्टेयर|बीघा|लीटर|पंप|टैंक)${NOT_DEV_AFTER}`);

const CHEMICAL_EN =
  /\b(?:pesticides?|insecticides?|fungicides?|herbicides?|weedicides?|chemicals?|fertili[sz]ers?|sprays?|spraying|urea|potash|npk|dap|kno3|kcl|kaolin|antitranspirants?|mancozeb|chlorpyrifos|imidacloprid)\b/i;
const HI_TERMS = [
  'कीटनाशक', 'फफूंदनाशक', 'फफूंदीनाशक', 'खरपतवारनाशक', 'रसायन', 'उर्वरक',
  'खाद', 'यूरिया', 'पोटाश', 'छिड़काव', 'स्प्रे', 'दवा', 'दवाई', 'दवाइयां', 'दवाएं',
];
const CHEMICAL_HI = new RegExp(`(?<![\\u0900-\\u097F])(?:${HI_TERMS.join('|')})${NOT_DEV_AFTER}`);

export interface ParseOptions {
  /** When given, the answer must be in this language. */
  language?: Language;
  /** The exact facts sent to Gemini. When given, every number in the answer must appear in it. */
  facts?: string;
}

export function parseGeminiExplanation(
  raw: string,
  knownRuleIds: string[],
  approvedPool: string,
  options: ParseOptions = {},
): GeminiExplanation | null {
  let obj: unknown;
  try {
    const cleaned = raw.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
    obj = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (typeof obj !== 'object' || obj === null) return null;
  const o = obj as Record<string, unknown>;

  if (typeof o.summary !== 'string' || o.summary.trim() === '' || o.summary.length > 700) return null;
  if (!Array.isArray(o.risks) || !Array.isArray(o.actions)) return null;
  if (o.actions.length > 6) return null;

  const risks: GeminiExplanation['risks'] = [];
  for (const item of o.risks) {
    if (typeof item !== 'object' || item === null) return null;
    const r = item as Record<string, unknown>;
    if (typeof r.rule_id !== 'string' || !knownRuleIds.includes(r.rule_id)) return null;
    if (typeof r.title !== 'string' || r.title.length === 0 || r.title.length > 80) return null;
    if (typeof r.reason !== 'string' || r.reason.length === 0 || r.reason.length > 500) return null;
    risks.push({ rule_id: r.rule_id, title: r.title.trim(), reason: r.reason.trim() });
  }

  const actions: string[] = [];
  for (const a of o.actions) {
    if (typeof a !== 'string' || a.trim() === '' || a.length > 400) return null;
    actions.push(a.trim());
  }

  const everything = [o.summary, ...risks.map((r) => `${r.title} ${r.reason}`), ...actions].join(' ');
  if (containsUnapprovedDose(everything, approvedPool)) return null;

  const normalized = normalizeDigits(everything);
  if (PER_AREA_EN.test(normalized) || PER_AREA_HI.test(normalized)) return null;
  if (CHEMICAL_EN.test(everything) || CHEMICAL_HI.test(everything)) return null;

  // Language: Hindi answers must be in Devanagari; English answers must contain none.
  if (options.language === 'hi') {
    const mustBeHindi = [o.summary, ...risks.map((r) => r.reason), ...actions];
    if (!mustBeHindi.every((t) => DEVANAGARI.test(t))) return null;
  } else if (options.language === 'en' && DEVANAGARI.test(everything)) {
    return null;
  }

  // Numbers: nothing may appear that was not in the facts or the approved text.
  if (options.facts !== undefined) {
    const allowed = new Set([...extractNumbers(options.facts), ...extractNumbers(approvedPool)]);
    for (const n of extractNumbers(everything)) {
      if (!allowed.has(n)) return null;
    }
  }

  return { summary: o.summary.trim(), risks, actions };
}
