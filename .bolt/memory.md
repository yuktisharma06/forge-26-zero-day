# Project memory

## Product intent & audience

- **KisanRakshak**: bilingual (Hindi default, English) web app for farmers in Saharanpur, UP, growing sugarcane or wheat.
- Flow: farmer picks crop from image cards → picks growth stage from image cards → enters sowing date and location → receives weather (Open-Meteo), rule-based risks (Low/Moderate/High/Insufficient Data), and Gemini-written risk explanations with voice playback.
- Nice-to-haves: AI chat assistant, advisory history. Voice input optional.

## Brand personality & voice

- Farmer-friendly, practical, trustworthy. Hindi-first with English toggle.
- Clear disclaimers and graceful errors required.

## Visual design & UX direction

- Image-card selectors for crop and growth stage (Pexels images).
- Dashboard is action-first: top risk + actions → Risk Advisory cards with sources → supporting weather → last-updated, refresh, loading/empty/error states.
- Reusable speaker button using browser speech synthesis.
- Mobile-friendly, rural-appropriate UX.
- Crop risks and weather warnings displayed separately.
- "No risk" message only for real no-significant-risk results; empty lists show neutral message, never misleading "No risk" when data is insufficient.
- AI-generated explanations visually distinguished from rule-based fallback explanations (labeled headings).

## Decisions, constraints & rationale

- No existing React/Vite/TS project; repo originally had only `docs/specs.md`, `README.md`, `.gitignore`. Now scaffolded with Vite+React+TS+Tailwind.
- Secrets (Gemini, etc.) must run server-side via Supabase Edge Functions; never in browser or GitHub.
- Growth stage drives risk rules; sowing date only triggers a confirmation prompt, never automatic stage changes.
- Only verified thresholds may produce automatic severity. Only IMD KALP wheat rule (above 30°C during grain filling) is named as validated candidate; most sugarcane/wheat thresholds need expert validation → mark as "validation pending" in MVP.
- No fabricated weather data; show graceful errors when unavailable.
- Supabase used for farmer profiles, advisories, and risk-rule table.
- `.gitignore` already covers `.env`.
- API contract defined in `docs/api-contract.md` for `crop-advisory` Supabase Edge Function; frontend integration code written and passing type-check + production build.
- Frontend env flags: `VITE_USE_MOCK_ADVISORY` (bool) toggles demo data vs live backend; live mode requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Demo data remains default.
- Contract shapes differ from original frontend types: no rain probability field, no separate action list, per-risk precautions handled differently. Components adapted: weather cards show "Not available" for missing rain probability; advisory card shows action items; risk cards hide empty precaution lists.
- Backend text returned in both Hindi and English; language switching will not re-translate without a re-request.
- **Canonical growth-stage IDs** (in `src/data/crops.ts` and `src/data/mockRisks.ts`):
  - Wheat: `early_growth`, `crown_root`, `vegetative_growth`, `reproductive`, `grain_development_maturity`
  - Sugarcane: `germination`, `tillering`, `grand_growth`, `maturity_ripening`
- **Removed invented fields:** `precipitationProbabilityPct` removed from types and contract adapter.
- **Contract validation:** `advisoryContract.ts` parser now checks assessment status and each risk's severity against contract-defined values; checks advisory fields.
- **Do not** modify backend code, invent API fields/response structures, hardcode sample responses, invent crop-risk rules/severity, or change API contract independently. Report missing fields rather than guessing.
- **Do not** connect live API until backend endpoint and final contract are confirmed.

## Open questions & assumptions

- Replace placeholder README title ("forge-26-zero-day") with "KisanRakshak"? — awaiting user confirmation.
- Who validates remaining thresholds? Assumption: seed only IMD KALP rule as validated, mark rest pending unless user provides verified values.
- **Growth-stage code conflict:** App sends stage IDs like `crown_root`; contract example uses short codes like `CRI`. Team needs to agree on canonical stage codes.
- **Rain probability:** Not in API contract; shown as "Not available". Need to decide whether to add to contract or source elsewhere.
- **Language re-request:** Switching language doesn't re-fetch from backend; may need re-request on language change for proper translation.
- Backend Edge Function not yet built; integration untested against live backend.
- **Missing from agreed contract (reported, not built):** `weatherWarnings`, `notAssessedRisks`, `insufficientReason`, weather data-quality notes, advisory source/disclaimer field.
- **`aiStatus` allowed values** not defined in contract; needs backend team input.