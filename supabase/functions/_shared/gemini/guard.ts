// =============================================================================
// Output guardrails
// =============================================================================
// The prompt asks Gemini to behave; this file CHECKS that it did. Any failure
// rejects the whole AI output and the caller falls back to engine-written text.
//
// Checks
//   1. Shape: valid JSON, expected fields, sensible lengths.
//   2. Risk set: exactly the engine's rule_ids — none added, none missing.
//   3. Language: Hindi output contains Devanagari; English output contains none.
//   4. Numbers: every number in the text must already appear in the facts
//      (blocks invented temperatures, rainfall amounts, thresholds, percentages).
//   5. No doses / quantities (e.g. "200 ml", "2 kg per acre", "5 मिली").
//   6. No chemical or treatment terms (pesticide, spray, fertiliser, कीटनाशक…).
//
// The checks are deliberately strict: a false rejection only means the farmer
// sees the plain engine-written explanation instead.
// =============================================================================

import type { AiRiskExplanation, Language } from '../types.ts';
import type { AdvisoryFacts } from './prompt.ts';

export interface AiOutput {
  summary: string;
  risks: AiRiskExplanation[];
}

export type GuardResult =
  | { ok: true; value: AiOutput }
  | { ok: false; reason: 'invalid_output' | 'guardrail_rejected'; detail: string };

const MAX_SUMMARY = 500;
const MAX_FIELD = 600;
const MAX_ACTION = 300;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Devanagari digits (०-९) → ASCII so number checks see them. */
export function normalizeDigits(s: string): string {
  return s.replace(/[\u0966-\u096F]/g, (d) => String(d.charCodeAt(0) - 0x0966));
}

export function extractNumbers(s: string): number[] {
  const matches = normalizeDigits(s).match(/\d+(?:\.\d+)?/g) ?? [];
  return matches.map((m) => parseFloat(m));
}

const DEVANAGARI = /[\u0900-\u097F]/;

// ── Dose / quantity patterns ──────────────────────────────────────────────────
const DOSE_EN =
  /\d+(?:\.\d+)?\s*(?:%|(?:ml|ltr|litres?|liters?|l|gm?|grams?|kgs?|kilograms?|mg|ppm|percent)\b)/i;
const PER_AREA_EN =
  /\bper\s+(?:acre|acres|ha|hectare|hectares|bigha|litre|liter|pump|tank)\b|\/\s*(?:acre|ha|hectare|bigha|l|litre|liter)\b/i;
// Hindi has no \b; compare against the character class of Devanagari instead.
const NOT_DEV_AFTER = '(?![\\u0900-\\u097F])';
const DOSE_HI = new RegExp(
  `\\d+(?:\\.\\d+)?\\s*(?:मिली|मि\\.ली|लीटर|ग्राम|किलो|किलोग्राम|मिलीग्राम|प्रतिशत|एकड़|हेक्टेयर|बीघा)${NOT_DEV_AFTER}`,
);
const PER_AREA_HI = new RegExp(`प्रति\\s*(?:एकड़|हेक्टेयर|बीघा|लीटर|पंप|टैंक)${NOT_DEV_AFTER}`);

// ── Chemical / treatment terms ────────────────────────────────────────────────
const CHEMICAL_EN =
  /\b(?:pesticides?|insecticides?|fungicides?|herbicides?|weedicides?|chemicals?|fertili[sz]ers?|sprays?|spraying|urea|potash|npk|dap|kno3|kcl|kaolin|antitranspirants?|mancozeb|chlorpyrifos|imidacloprid)\b/i;
const HI_TERMS = [
  'कीटनाशक', 'फफूंदनाशक', 'फफूंदीनाशक', 'खरपतवारनाशक', 'रसायन', 'उर्वरक',
  'खाद', 'यूरिया', 'पोटाश', 'छिड़काव', 'स्प्रे', 'दवा', 'दवाई', 'दवाइयां', 'दवाएं',
];
const CHEMICAL_HI = new RegExp(
  `(?<![\\u0900-\\u097F])(?:${HI_TERMS.join('|')})${NOT_DEV_AFTER}`,
);

// ── Main entry ────────────────────────────────────────────────────────────────

export function validateAiOutput(
  raw: unknown,
  facts: AdvisoryFacts,
  language: Language,
): GuardResult {
  const bad = (reason: 'invalid_output' | 'guardrail_rejected', detail: string): GuardResult =>
    ({ ok: false, reason, detail });

  // 1. Shape ------------------------------------------------------------------
  if (!isObj(raw)) return bad('invalid_output', 'not an object');
  const { summary, risks } = raw as { summary?: unknown; risks?: unknown };
  if (!isText(summary, MAX_SUMMARY)) return bad('invalid_output', 'bad summary');
  if (!Array.isArray(risks)) return bad('invalid_output', 'risks is not a list');

  const cleaned: AiRiskExplanation[] = [];
  for (const item of risks) {
    if (!isObj(item)) return bad('invalid_output', 'risk entry is not an object');
    const { rule_id, why_it_matters, crop_impact, what_to_do } = item as Record<string, unknown>;
    if (typeof rule_id !== 'string') return bad('invalid_output', 'rule_id missing');
    if (!isText(why_it_matters, MAX_FIELD)) return bad('invalid_output', 'bad why_it_matters');
    if (!isText(crop_impact, MAX_FIELD)) return bad('invalid_output', 'bad crop_impact');
    if (
      !Array.isArray(what_to_do) ||
      what_to_do.length < 1 ||
      what_to_do.length > 5 ||
      !what_to_do.every((a) => isText(a, MAX_ACTION))
    ) {
      return bad('invalid_output', 'bad what_to_do');
    }
    cleaned.push({
      rule_id,
      why_it_matters: why_it_matters.trim(),
      crop_impact: crop_impact.trim(),
      what_to_do: (what_to_do as string[]).map((a) => a.trim()),
    });
  }

  // 2. Risk set matches the engine exactly --------------------------------------
  const expected = facts.risks.map((r) => r.rule_id);
  const got = cleaned.map((r) => r.rule_id);
  if (
    got.length !== expected.length ||
    new Set(got).size !== got.length ||
    !expected.every((id) => got.includes(id))
  ) {
    return bad('invalid_output', 'risk list does not match the engine results');
  }

  // Put results in the engine's order.
  const ordered = expected.map((id) => cleaned.find((r) => r.rule_id === id)!);
  const texts = [summary.trim(), ...ordered.flatMap((r) => [r.why_it_matters, r.crop_impact, ...r.what_to_do])];
  const corpus = texts.join('\n');

  // 3. Language -----------------------------------------------------------------
  if (language === 'hi') {
    if (!texts.slice(0, 1).every((t) => DEVANAGARI.test(t)) ||
        !ordered.every((r) => DEVANAGARI.test(r.why_it_matters) && DEVANAGARI.test(r.crop_impact))) {
      return bad('guardrail_rejected', 'Hindi output is not in Devanagari');
    }
  } else if (DEVANAGARI.test(corpus)) {
    return bad('guardrail_rejected', 'English output contains Devanagari');
  }

  // 4. Numbers must come from the facts --------------------------------------------
  const allowed = new Set(extractNumbers(JSON.stringify(facts)));
  for (const n of extractNumbers(corpus)) {
    if (!allowed.has(n)) return bad('guardrail_rejected', `number ${n} is not in the engine results`);
  }

  // 5. Doses / quantities ----------------------------------------------------------
  const normalized = normalizeDigits(corpus);
  if (DOSE_EN.test(normalized) || PER_AREA_EN.test(normalized) || DOSE_HI.test(normalized) || PER_AREA_HI.test(normalized)) {
    return bad('guardrail_rejected', 'contains a dose or quantity');
  }

  // 6. Chemical / treatment terms ---------------------------------------------------
  if (CHEMICAL_EN.test(corpus) || CHEMICAL_HI.test(corpus)) {
    return bad('guardrail_rejected', 'mentions a chemical or treatment');
  }

  return { ok: true, value: { summary: summary.trim(), risks: ordered } };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isText(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max;
}
