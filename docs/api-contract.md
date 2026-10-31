# KisanRakshak API Contract — v1

**Status:** Proposed — pending confirmation by frontend and backend developers.

## 1. Endpoint

- Method: `POST`
- Supabase Edge Function: `crop-advisory`
- Endpoint path: `/functions/v1/crop-advisory`
- Content-Type: `application/json`

## 2. Request body

The frontend sends:

```json
{
  "location": "Saharanpur",
  "crop": "wheat",
  "sowingDate": "2026-11-01",
  "growthStage": "CRI",
  "language": "hi"
}
```

### Field definitions

| Field | Type | Allowed values / format |
|---|---|---|
| location | string | Village, town or city name |
| crop | string | `wheat` or `sugarcane` |
| sowingDate | string | `YYYY-MM-DD` |
| growthStage | string | A valid stage for the selected crop |
| language | string | `hi` or `en` |

The farmer manually selects the growth stage. The backend must not replace it with a stage inferred from the sowing date.

The frontend sends the location name. The backend is responsible for resolving its coordinates before fetching weather data.

## 3. Successful response

Example structure:

```json
{
  "success": true,
  "assessmentStatus": "completed",
  "crop": "wheat",
  "growthStage": "CRI",
  "location": {
    "name": "Saharanpur",
    "latitude": 29.97,
    "longitude": 77.55
  },
  "weather": {
    "source": "Open-Meteo",
    "timezone": "Asia/Kolkata",
    "fetchedAt": "2026-10-31T12:00:00Z",
    "dailyForecast": [
      {
        "date": "2026-10-31",
        "temperatureMaxC": 29,
        "temperatureMinC": 18,
        "precipitationMm": 0,
        "humidityPercent": 65,
        "windSpeedKmh": 12
      }
    ]
  },
  "risks": [
    {
      "name": "Example risk",
      "severity": "moderate",
      "weatherCondition": "Example weather condition",
      "forecastPeriod": "Example period",
      "reason": "Explanation of why this condition may affect the crop.",
      "source": {
        "title": "Agricultural reference",
        "url": "https://example.com"
      }
    }
  ],
  "advisory": {
    "summary": "Simple explanation for the farmer.",
    "actions": [
      "First preventive suggestion.",
      "Second preventive suggestion."
    ],
    "language": "hi"
  },
  "aiStatus": "completed"
}
```

**Note:** This is a format example. The example risk, weather values and source are placeholders, not actual agricultural advice or verified thresholds. The backend must return real values and verified sources.

## 4. Assessment statuses

`assessmentStatus` must support:

- `completed`: Risk assessment was successfully performed.
- `no_significant_risk`: Assessment completed, but no significant risk was detected.
- `insufficient_data`: Available weather or agricultural information was insufficient for a reliable assessment.

For `no_significant_risk`, return an empty `risks` array and a clear advisory message.

For `insufficient_data`, explain what information is unavailable. Do not generate unsupported risk conclusions.

## 5. Risk object

Every risk should contain:

- `name`
- `severity`: `low`, `moderate` or `high`
- `weatherCondition`
- `forecastPeriod`
- `reason`
- `source`, where available

Only validated deterministic rules should assign risk severity.

## 6. Error response

All errors should follow a consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "WEATHER_API_ERROR",
    "message": "Unable to fetch weather information. Please try again."
  }
}
```

Possible error codes:

- `INVALID_INPUT`
- `LOCATION_NOT_FOUND`
- `WEATHER_API_ERROR`
- `AI_SERVICE_ERROR`
- `INTERNAL_SERVER_ERROR`

If Gemini fails but weather and risk detection succeed, return the deterministic risk assessment with a fallback explanation instead of failing the entire request.

## 7. Integration responsibilities

**Frontend — Yashveer**
- Send the request in the agreed format.
- Display the returned weather, risks, severity and advisory.
- Handle loading, errors, insufficient data and no-risk states.
- Never calculate risk severity independently.

**Backend — Nivedita**
- Validate incoming data.
- Resolve location coordinates.
- Fetch actual Open-Meteo weather data.
- Run deterministic crop-specific risk rules.
- Use Gemini to explain detected risks.
- Return the agreed response structure.
- Keep secret API keys server-side.

**Project coordination — Project lead**
- Maintain this contract.
- Get confirmation from both developers.
- Coordinate integration and test the complete flow.

## 8. Pending decisions

Before integration, the team must confirm:

1. Exact allowed growth-stage values for both crops.
2. Forecast duration.
3. Exact weather fields available from Open-Meteo.
4. Final error-handling behaviour.
5. Whether the frontend will call the Edge Function directly or through another service layer.
