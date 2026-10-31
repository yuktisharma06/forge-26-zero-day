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

## Decisions, constraints & rationale

- No existing React/Vite/TS project; repo currently has only `docs/specs.md`, `README.md`, `.gitignore`.
- Secrets (Gemini, etc.) must run server-side via Supabase Edge Functions; never in browser or GitHub.
- Growth stage drives risk rules; sowing date only triggers a confirmation prompt, never automatic stage changes.
- Only verified thresholds may produce automatic severity. Only IMD KALP wheat rule (above 30°C during grain filling) is named as validated candidate; most sugarcane/wheat thresholds need expert validation → mark as "validation pending" in MVP.
- No fabricated weather data; show graceful errors when unavailable.
- Supabase used for farmer profiles, advisories, and risk-rule table.
- `.gitignore` already covers `.env`.

## Open questions & assumptions

- Replace placeholder README title ("forge-26-zero-day") with "KisanRakshak"? — awaiting user confirmation.
- Who validates remaining thresholds? Assumption: seed only IMD KALP rule as validated, mark rest pending unless user provides verified values.
- Proposed implementation order: scaffold Vite+React+TS+Tailwind → Home → Farmer Details → Dashboard → speaker button → optional Chat/History → tests + README + `.env.example`.