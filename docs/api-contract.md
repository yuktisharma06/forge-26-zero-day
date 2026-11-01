# KisanRakshak API Contract — v1

**Status:** Final draft for team lead review (not yet frozen). Verified against the deployed `crop-advisory` function on 1 Nov 2026; pending frontend confirmation.

## 1. Endpoint

- Method: `POST`
- Supabase Edge Function: `crop-advisory`
- Path: `/functions/v1/crop-advisory`
- Content-Type: `application/json`
- Authentication: send `Authorization: Bearer <anon key>` and `apikey: <anon key>` (the Supabase anon/publishable key).
- A missing or invalid key is rejected by the Supabase gateway with HTTP 401 and a body of the form `{"code": "...", "message": "..."}`. This is not the error shape in section 5, so the frontend must handle it separately.
- Forecast window: 7 days
- Weather provider: Open-Meteo

The frontend calls this single endpoint. The backend resolves the location (unless coordinates are supplied), fetches weather, runs deterministic crop-risk rules, and returns the advisory.

## 2. Request body

### Example

```json
{
  "location": "Saharanpur",
  "crop": "wheat",
  "growthStage": "crown_root",
  "sowingDate": "2026-11-01",
  "language": "hi"
}
```

### Fields

| Field | Type | Required | Allowed values / format |
|---|---|---:|---|
| `location` | string | Yes | Village, town or city name; 1–120 characters |
| `crop` | string | Yes | `wheat` or `sugarcane` |
| `growthStage` | string | Yes | One of the crop-specific IDs below |
| `sowingDate` | string or null | No | Valid `YYYY-MM-DD` date |
| `language` | string | No | `en` or `hi`; defaults to `en` |
| `latitude` | number | No | Latitude from -90 to 90; supply together with longitude |
| `longitude` | number | No | Longitude from -180 to 180; supply together with latitude |

### Canonical growth-stage IDs

**Wheat**
- `early_growth`
- `crown_root` — Crown Root Initiation (CRI)
- `vegetative_growth`
- `reproductive`
- `grain_development_maturity`

**Sugarcane**
- `germination`
- `tillering`
- `grand_growth`
- `maturity_ripening`

The selected stage must belong to the selected crop. The frontend must send these canonical IDs, not display labels such as `CRI`.

The farmer-selected growth stage is the primary input for risk detection. The backend does not infer or override it using the sowing date. Sowing date is optional and is reserved for consistency checks; it does not determine the selected stage.

If coordinates are omitted, the backend geocodes `location`. If coordinates are supplied, both must be valid numbers.

## 3. Successful response

The response always includes `success: true`. The assessment status determines whether risks were detected or whether the assessment could be completed.

### Example response shape

Values below illustrate field types and structure only; they are not a real forecast or agricultural recommendation.

```json
{
  "success": true,
  "crop": "wheat",
  "growthStage": "crown_root",
  "sowingDate": "2026-11-01",
  "location": {
    "name": "Saharanpur, Uttar Pradesh",
    "latitude": 29.9648,
    "longitude": 77.546
  },
  "weather": {
    "source": "Open-Meteo",
    "dataStatus": "live",
    "timezone": "Asia/Kolkata",
    "fetchedAt": "2026-10-31T06:30:00.000Z",
    "forecastDays": 7,
    "startDate": "2026-10-31",
    "endDate": "2026-11-06",
    "dailyForecast": [
      {
        "date": "2026-10-31",
        "temperatureMaxC": 29,
        "temperatureMinC": 18,
        "precipitationMm": 0,
        "precipitationProbabilityPct": 5,
        "humidityPercent": 65,
        "windSpeedKmh": 12
      }
    ],
    "dataQualityNotes": [],
    "note": null
  },
  "notes": [],
  "notAssessedRisks": [
    {
      "id": "example_not_assessed_id",
      "name": "Example condition",
      "reason": "no_validated_threshold",
      "explanation": "Why this condition cannot be assessed."
    }
  ],
  "generatedAt": "2026-10-31T06:30:02.000Z",
  "assessmentStatus": "completed",
  "insufficientReason": null,
  "weatherWarnings": [
    {
      "id": "example_warning_id",
      "category": "heat",
      "name": "Example warning title",
      "crop": "wheat",
      "growthStage": "crown_root",
      "date": "2026-11-02",
      "observedValue": 0,
      "unit": "example unit",
      "message": "Example informational message.",
      "caveat": "What this warning does not mean."
    }
  ],
  "risks": [
    {
      "id": "example_rule_id",
      "name": "Example risk label",
      "severity": "moderate",
      "weatherCondition": "Example weather condition",
      "forecastPeriod": "2026-11-02 to 2026-11-03",
      "triggeredDates": ["2026-11-02", "2026-11-03"],
      "peakValue": 0,
      "peakDate": "2026-11-02",
      "reason": "Example explanation.",
      "severityBasis": "Explanation of the engine's severity mapping.",
      "caveats": [],
      "preventiveAction": "Example action.",
      "source": {
        "title": "Agricultural reference",
        "url": null,
        "citation": "What the cited source states.",
        "evidenceType": "extension_guidance",
        "applicabilityNote": null
      }
    }
  ],
  "advisory": {
    "summary": "Example farmer-friendly summary.",
    "actions": ["Example preventive action."],
    "language": "hi",
    "writtenBy": "ai",
    "disclaimer": "Advisory disclaimer."
  },
  "aiStatus": "completed",
  "aiNote": null
}
```

### Weather fields

| Field | Meaning |
|---|---|
| `source` | Weather provider; currently `Open-Meteo` |
| `dataStatus` | `live` or `sample` |
| `timezone` | Forecast timezone; currently `Asia/Kolkata` |
| `fetchedAt` | ISO timestamp when weather was fetched |
| `forecastDays` | Number of forecast days returned |
| `startDate`, `endDate` | First and last forecast dates; may be null |
| `dailyForecast` | Daily weather values |
| `dataQualityNotes` | Notes about the forecast data itself (out-of-date data, missing values). Not weather alerts and not crop risks. Previously named `warnings`. |
| `note` | Additional notice; explains sample-data use when applicable |

Each `dailyForecast` item contains:
- `date`
- `temperatureMaxC`, `temperatureMinC`
- `precipitationMm`
- `precipitationProbabilityPct`
- `humidityPercent` — daily mean relative humidity
- `windSpeedKmh` — daily maximum wind speed

Weather values may be null when the provider does not return a value. The frontend must not assume every measurement is present.

**Important:** `dataStatus: "sample"` means the displayed weather is demonstration data, not a live forecast. The backend does not run risk detection on sample weather. The frontend must label it clearly and must not present it as current weather.

### Risk fields

At the time of writing, no validated crop-risk rules are enabled, so `risks` is an empty array in every response. The frontend must still support the full structure below, because validated rules may be added after regional validation.

Each item in `risks` contains:
- `id`: deterministic rule ID
- `name`: risk label
- `severity`: `low`, `moderate` or `high`; assigned by the deterministic engine
- `weatherCondition`: forecast condition that crossed the rule threshold
- `forecastPeriod`: human-readable period
- `triggeredDates`: individual dates that crossed the threshold
- `peakValue`, `peakDate`: most extreme triggering value and its date
- `reason`: explanation
- `severityBasis`: why the rule maps to the severity label
- `caveats`: limitations of the rule
- `preventiveAction`: precautionary action
- `source`: source metadata

The `source` object contains:
- `title`: source name
- `url`: source URL or null
- `citation`: what the source states
- `evidenceType`: `official_classification`, `extension_guidance` or `research_literature`
- `applicabilityNote`: transferability limitation or null

### Weather warning fields

`weatherWarnings` is a top-level array of informational weather alerts for the farmer. It is separate from `risks`.

- Warnings carry **no severity** and never claim crop damage.
- There is **one object per triggered day**.
- It is always an empty array when `assessmentStatus` is `insufficient_data` or `no_significant_risk`.
- The exact triggers are defined in the backend's weather-warnings module and are not repeated here.

Each item contains:
- `id`: warning type. The same `id` repeats on every triggered day, so use `id` together with `date` as the unique key.
- `category`: `heat` or `rainfall`
- `name`: short title in the requested language
- `crop`, `growthStage`: the crop and stage the warning was evaluated for
- `date`: the triggered forecast date
- `observedValue`, `unit`: the forecast value that triggered the warning
- `message`: informational message
- `caveat`: what the warning does not mean

`weatherWarnings` (alerts for the farmer) and `weather.dataQualityNotes` (notes about the forecast data) have different purposes. Nothing is copied between them.

### Advisory fields

- `summary`: farmer-friendly explanation
- `actions`: preventive actions
- `language`: `en` or `hi`
- `writtenBy`: `ai` or `rules`
- `disclaimer`: fixed advisory disclaimer

### Other response fields

- `notes`: general assessment notes
- `notAssessedRisks`: risk checks that could not be evaluated; each item has `id`, `name`, `reason` and `explanation`. Only items relevant to the selected crop and growth stage are returned. See Appendix A.
- `insufficientReason`: a reason string when `assessmentStatus` is `insufficient_data`; otherwise `null`
- `generatedAt`: ISO timestamp when the response was generated
- `sowingDate`: submitted date or null

## 4. Assessment and AI statuses

### `assessmentStatus`

- `completed`: assessment ran and one or more risks or weather warnings were found.
- `no_significant_risk`: assessment ran and neither risks nor weather warnings were triggered by the available rules.
- `insufficient_data`: risk assessment could not be completed reliably.

For `no_significant_risk`, `risks` and `weatherWarnings` are both empty arrays. This does **not** mean every possible crop risk was assessed; the frontend must show `notAssessedRisks` together with this status.

For `insufficient_data`, `risks` is an empty array and `insufficientReason` explains why. Possible values:
- `sample_weather`
- `stale_weather`
- `no_forecast`
- `no_rules`
- `unassessable`

### `aiStatus`

- `completed`: Gemini generated the explanation and it passed backend checks.
- `fallback`: Gemini was unavailable or its output was rejected; the backend returned a deterministic rule-based explanation.
- `skipped`: no AI explanation was needed because neither a risk nor a weather warning was triggered, or the assessment was insufficient.

`aiNote` may contain a reason when AI fallback occurs; otherwise it is null or omitted. The frontend must display `advisory` for both `completed` and `fallback`. When `advisory.writtenBy` is `rules`, do not label the text as AI-generated.

## 5. Error response

Errors use this structure:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "A human-readable explanation."
  }
}
```

Known error codes:
- `INVALID_INPUT` — malformed request, invalid field or unsupported crop-stage combination
- `LOCATION_NOT_FOUND` — location could not be resolved
- `WEATHER_API_ERROR` — location lookup/weather service failure
- `AI_SERVICE_ERROR` — reserved error code; Gemini failure normally uses a rule-based fallback instead
- `INTERNAL_SERVER_ERROR` — unexpected backend failure

Typical HTTP statuses include 400 for invalid input, 404 for location not found, 502 for location/weather service failure, and 500 for unexpected errors. The frontend should check `response.ok` and parse error responses before attempting to parse a successful advisory.
Requests using any method other than `POST` (or `OPTIONS` for CORS) return HTTP 405 with code `INVALID_INPUT` in the standard error shape. Missing or invalid authentication returns HTTP 401 from the Supabase gateway (see section 1).

## 6. Safety and frontend display requirements

1. Never calculate or change risk severity in the frontend.
2. Never present sample weather as live weather.
3. Show `weatherWarnings` (with their caveats), `weather.dataQualityNotes` and the sample-data note when returned. Never present a weather warning as a crop risk or as crop damage, and never attach a severity to it.
4. Display `notAssessedRisks` so an unassessed risk is not mistaken for a confirmed absence of risk.
5. Display caveats, source details and the advisory disclaimer with relevant risk information.
6. Show rule-based advisory text when `aiStatus` is `fallback`; label it as rule-based, not Gemini-generated.
7. Do not treat rainfall alone as confirmation of field waterlogging.
8. Do not invent missing weather values, risk thresholds, pesticide dosages or treatments.
9. If data is insufficient, show the returned reason and do not imply that the crop is risk-free.
10. Keep the farmer-selected growth stage as the assessment stage; sowing date is optional and must not override it.
11. Identify items in `risks`, `weatherWarnings` and `notAssessedRisks` by `id`, never by `name`. Two different frost items share the name "Frost damage". For `weatherWarnings`, use `id` together with `date`.
12. Whenever `no_significant_risk` is shown, also show `notAssessedRisks`. An empty `risks` array must never be shown as "all clear".

## 7. Integration responsibilities

**Frontend**
- Send canonical request field names and crop-stage IDs.
- Call `/functions/v1/crop-advisory`.
- Render live/sample weather states, risk details, advisory source, fallback, no-risk and insufficient-data states.
- Handle HTTP errors and loading states.
- Never calculate risk severity independently.

**Backend**
- Validate request fields and crop-stage combinations.
- Geocode location when coordinates are not supplied.
- Fetch the 7-day Open-Meteo forecast.
- Run deterministic crop-specific risk rules only on live, non-stale weather.
- Use Gemini only to explain engine-detected risks.
- Return rule-based fallback text if Gemini fails or is rejected.
- Keep Gemini secrets server-side.

**Project coordination**
- Keep this document aligned with the deployed backend and frontend parser.
- Confirm the final schema with both developers.
- Coordinate integration and end-to-end testing.

## 8. Final integration checks

- [ ] Frontend request uses `growthStage` and canonical stage IDs.
- [ ] `sowingDate` can be omitted or null.
- [ ] Both wheat and sugarcane stage combinations are tested.
- [ ] Hindi and English requests are tested.
- [ ] Live weather displays as live; sample weather is clearly labelled.
- [ ] Rain probability is mapped from `precipitationProbabilityPct`.
- [ ] `completed`, `fallback` and `skipped` AI states display correctly.
- [ ] No-risk, insufficient-data and `notAssessedRisks` states display correctly.
- [ ] `weatherWarnings` display as informational alerts (no severity, caveat visible), keyed by `id` and `date`.
- [ ] `weather.dataQualityNotes` shows as a small notice, separate from `weatherWarnings`.
- [ ] `notAssessedRisks` items are keyed by `id`, not `name`.
- [ ] Invalid input and location/weather errors display safely.
- [ ] No secret API key is exposed in frontend code or committed to the repository.

**Implementation note:** This document describes the current `crop-advisory` handler on `feature/backend`. Confirm against the deployed function and the final frontend parser before treating the contract as fully approved.

## 9. Decisions approved by the team lead (Phase E)

1. Each object in `weatherWarnings` has a `name` field.
2. Allowed `reason` values for `notAssessedRisks`: `insufficient_field_data`, `no_validated_threshold`, `insufficient_evidence`.
3. `no_significant_risk` is returned when neither risks nor weather warnings are triggered. The frontend must clearly communicate that some conditions remain unassessed.
4. `weatherWarnings` contains one object per triggered day.
5. The crop-and-stage mapping of `notAssessedRisks` in Appendix A is approved.
6. `sugarcane_heat_damage` is listed as not assessed at all sugarcane stages, because the sugarcane high-temperature condition is only an informational warning and actual crop heat damage cannot be assessed with the available data.
7. Non-frost cold damage is not listed, because there is no validated basis for including it.
8. The frontend identifies items by `id`, not `name`.
9. `weather.warnings` was renamed to `weather.dataQualityNotes`, to avoid confusion with the farmer-facing `weatherWarnings`.

## Appendix A: `notAssessedRisks` catalogue

| `id` | `name` (en) | `reason` | Returned for |
|---|---|---|---|
| `water_stress` | Water stress / drought | `insufficient_field_data` | every crop and stage |
| `waterlogging` | Waterlogging | `insufficient_field_data` | every crop and stage |
| `crop_disease` | Crop disease | `insufficient_evidence` | every crop and stage |
| `wheat_frost_damage` | Frost damage | `no_validated_threshold` | wheat, all stages |
| `sugarcane_frost_damage` | Frost damage | `no_validated_threshold` | sugarcane, all stages |
| `sugarcane_heat_damage` | Heat damage | `no_validated_threshold` | sugarcane, all stages |
| `wheat_flowering_heat_damage` | Heat damage at flowering | `no_validated_threshold` | wheat, `reproductive` only |
| `wheat_terminal_heat_damage` | Terminal heat damage | `no_validated_threshold` | wheat, `grain_development_maturity` only |
| `wind_damage` | Wind damage / lodging | `no_validated_threshold` | wheat `reproductive` and `grain_development_maturity`; sugarcane `grand_growth` and `maturity_ripening` |

Items returned per stage:

| Crop | Stage | Items |
|---|---:|---|
| wheat | `early_growth` | 4 |
| wheat | `crown_root` | 4 |
| wheat | `vegetative_growth` | 4 |
| wheat | `reproductive` | 6 |
| wheat | `grain_development_maturity` | 6 |
| sugarcane | `germination` | 5 |
| sugarcane | `tillering` | 5 |
| sugarcane | `grand_growth` | 6 |
| sugarcane | `maturity_ripening` | 6 |

Both frost items use the name "Frost damage" in English; always use `id` to tell them apart.
