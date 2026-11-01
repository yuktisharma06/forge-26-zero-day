# KisanRakshak

Weather-risk advisory for farmers, built for the Forge'26 hackathon. The pilot area is Saharanpur, Uttar Pradesh, and the supported crops are **wheat** and **sugarcane**.

The backend is a single Supabase Edge Function, **`crop-advisory`**. It takes the farmer's location, crop and growth stage, fetches a 7-day Open-Meteo forecast, applies deterministic rules, and returns a structured, bilingual (English and Hindi) advisory. Gemini is used only to explain what the rules found.

- Full request and response reference: [`docs/api-contract.md`](docs/api-contract.md)
- Product specification: [`docs/specs.md`](docs/specs.md)

## How it works

1. **Input check.** Validates the crop, growth stage, language and optional sowing date.
2. **Location.** Uses `latitude` and `longitude` if supplied, otherwise looks up `location` with the Open-Meteo geocoder.
3. **Weather.** Fetches the 7-day Open-Meteo forecast. If it cannot be fetched, the response carries clearly labelled sample data (`weather.dataStatus: "sample"`) and no assessment is made.
4. **Deterministic checks**, kept separate in the response:
   - `risks`: validated crop risks with Low, Moderate or High severity. No validated crop-risk rules are enabled at present, so this is always an empty array.
   - `weatherWarnings`: informational weather alerts with no severity and no claim of crop damage. One object per triggered day.
   - `notAssessedRisks`: conditions that cannot be assessed with the available data, limited to what is relevant to the selected crop and stage.
5. **Explanation.** Gemini writes only `advisory.summary` and `advisory.actions`. Its output is validated, and anything that adds a risk or an unapproved dose-like figure is rejected. If Gemini is unavailable or rejected, the response uses rule-written text (`aiStatus: "fallback"`).

An empty `risks` array never means the crop is safe. Always show `notAssessedRisks` with it.

## Calling the endpoint

`POST /functions/v1/crop-advisory` with a JSON body. Field names are **camelCase**.

| Field | Required | Values |
|---|---|---|
| `location` | Yes | Place name, 1 to 120 characters |
| `crop` | Yes | `wheat` or `sugarcane` |
| `growthStage` | Yes | Wheat: `early_growth`, `crown_root`, `vegetative_growth`, `reproductive`, `grain_development_maturity`. Sugarcane: `germination`, `tillering`, `grand_growth`, `maturity_ripening` |
| `language` | No | `en` (default) or `hi` |
| `sowingDate` | No | `YYYY-MM-DD` |
| `latitude`, `longitude` | No | Send both, or neither |

Send the canonical stage IDs above. The backend also tolerates `CRI` and the older snake_case names, but clients should not rely on that.

Example:

```json
{
  "location": "Saharanpur",
  "crop": "wheat",
  "growthStage": "early_growth",
  "language": "en"
}
```

Main response fields: `success`, `assessmentStatus` (`completed`, `no_significant_risk` or `insufficient_data`), `weather`, `risks`, `weatherWarnings`, `notAssessedRisks`, `advisory`, `aiStatus` (`completed`, `fallback` or `skipped`). Errors look like `{ "success": false, "error": { "code", "message" } }`. See the contract for everything else.

## Running locally

You need Docker Desktop, the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), and a Gemini API key.

1. Copy `.env.example` to `.env` and fill in your values. **Never commit `.env`.**
2. Start the local stack from the repo root:
   ```
   supabase start
   ```
3. Serve the functions (keep this window open):
   ```
   supabase functions serve --env-file .env --no-verify-jwt
   ```
   `--no-verify-jwt` is for local testing only.
4. Call it from a second window (Command Prompt, one line):
   ```
   curl -i -X POST http://127.0.0.1:54321/functions/v1/crop-advisory -H "Content-Type: application/json" -d "{\"location\":\"Saharanpur\",\"crop\":\"wheat\",\"growthStage\":\"early_growth\",\"language\":\"en\"}"
   ```

Run every `supabase` command from inside the repo folder.

### Environment variables

| Name | Purpose |
|---|---|
| `GEMINI_API_KEY` | Gemini key. Read by the function only, never sent to the frontend. If missing, the endpoint still works and returns rule-written text. |
| `GEMINI_MODEL` | Optional. Overrides the default model name. |

Supabase supplies its own `SUPABASE_*` values to deployed functions automatically.

## Tests

The tests use [Deno](https://deno.com/) and need no network: weather, geocoding and Gemini are replaced by stand-ins.

```
deno test --allow-env --allow-read supabase/functions/crop-advisory/handler_test.ts
deno test --allow-env --allow-read supabase/functions/_shared/risk-engine/risk-engine.test.ts
```

Expected: 31 passed for the handler suite and 14 passed for the risk-engine suite.

## Deploying

1. Link the Supabase project: `supabase link --project-ref <project-ref>`
2. Set the secret on the project: `supabase secrets set GEMINI_API_KEY=<your-key>` (it is available immediately, no redeploy needed). Check with `supabase secrets list`.
3. Deploy: `supabase functions deploy crop-advisory`
4. Call it at `https://<project-ref>.supabase.co/functions/v1/crop-advisory` with an `apikey` header holding the project's publishable key.

Decide as a team whether `crop-advisory` should require a JWT before the public demo (`verify_jwt` in `supabase/config.toml`). The endpoint spends Gemini quota on every call.

## Project layout

```
docs/                          API contract and product spec
supabase/
  config.toml
  migrations/                  database schema
  functions/
    crop-advisory/             the endpoint (handler.ts) and its tests
    _shared/
      advisory/                response building, Gemini helper, fixed EN/HI text
      risk-engine/             deterministic severity engine (no rules enabled)
      weather-warnings/        informational IMD rainfall and heat alerts
      not-assessed/            conditions listed as not assessed
      weather/, geocoding/     Open-Meteo clients
```

`generate-advisory`, `get-weather` and `_shared/gemini/` are older code. `crop-advisory` does not use them. Their tests fail by design, and the team has yet to decide whether to delete them.

## Principles

- Only the deterministic code decides what is flagged. Gemini explains and never decides.
- No thresholds, doses or treatments are invented. Anything without a validated basis is listed as not assessed.
- Rainfall alone never implies waterlogging.
- Sample or stale weather is never assessed and never shown as live.
- This is advisory support, not a replacement for a local agricultural expert or KVK.
