# KisanRakshak API Contract — v1

**Status:** Aligned with the current backend implementation on `feature/backend`; pending frontend confirmation and live deployment verification.

## 1. Endpoint

- Method: `POST`
- Supabase Edge Function: `crop-advisory`
- Path: `/functions/v1/crop-advisory`
- Content-Type: `application/json`
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
    "warnings": [],
    "note": null
  },
  "notes": [],
  "notAssessedRisks": [],
  "generatedAt": "2026-10-31T06:30:02.000Z",
  "assessmentStatus": "completed",
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
| `warnings` | Weather freshness or missing-data warnings |
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

### Advisory fields

- `summary`: farmer-friendly explanation
- `actions`: preventive actions
- `language`: `en` or `hi`
- `writtenBy`: `ai` or `rules`
- `disclaimer`: fixed advisory disclaimer

### Other response fields

- `notes`: general assessment notes
- `notAssessedRisks`: risk checks that could not be evaluated; each item has `name`, `reason` and `explanation`
- `generatedAt`: ISO timestamp when the response was generated
- `sowingDate`: submitted date or null

## 4. Assessment and AI statuses

### `assessmentStatus`

- `completed`: assessment ran and one or more risks were detected.
- `no_significant_risk`: assessment ran and no supported risk was detected by the available rules.
- `insufficient_data`: risk assessment could not be completed reliably.

For `no_significant_risk`, `risks` is an empty array. This does **not** mean every possible crop risk was assessed; check `notAssessedRisks`.

For `insufficient_data`, `risks` is an empty array and `insufficientReason` explains why. Possible values:
- `sample_weather`
- `stale_weather`
- `no_forecast`
- `no_rules`
- `unassessable`

### `aiStatus`

- `completed`: Gemini generated the explanation and it passed backend checks.
- `fallback`: Gemini was unavailable or its output was rejected; the backend returned a deterministic rule-based explanation.
- `skipped`: no AI explanation was needed because no risk was detected or the assessment was insufficient.

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

## 6. Safety and frontend display requirements

1. Never calculate or change risk severity in the frontend.
2. Never present sample weather as live weather.
3. Show weather warnings and the sample-data note when returned.
4. Display `notAssessedRisks` so an unassessed risk is not mistaken for a confirmed absence of risk.
5. Display caveats, source details and the advisory disclaimer with relevant risk information.
6. Show rule-based advisory text when `aiStatus` is `fallback`; label it as rule-based, not Gemini-generated.
7. Do not treat rainfall alone as confirmation of field waterlogging.
8. Do not invent missing weather values, risk thresholds, pesticide dosages or treatments.
9. If data is insufficient, show the returned reason and do not imply that the crop is risk-free.
10. Keep the farmer-selected growth stage as the assessment stage; sowing date is optional and must not override it.

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
- [ ] Invalid input and location/weather errors display safely.
- [ ] No secret API key is exposed in frontend code or committed to the repository.

**Implementation note:** This document describes the current `crop-advisory` handler on `feature/backend`. Confirm against the deployed function and the final frontend parser before treating the contract as fully approved.
