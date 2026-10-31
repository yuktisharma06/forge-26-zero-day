# KisanRakshak

A weather-aware crop protection assistant for Indian farmers.
KisanRakshak fetches real weather forecasts, detects crop-specific weather risks using verified agricultural rules, and generates actionable guidance in Hindi or English using Google Gemini.

**Initial scope:** Sugarcane and wheat in Saharanpur, Uttar Pradesh.

---

## Project structure

```
forge-26-zero-day/
├── docs/
│   └── specs.md                    # Full application specification (source of truth)
├── supabase/
│   ├── config.toml                 # Local Supabase configuration
│   ├── seed.sql                    # Demo seed data for local development
│   ├── migrations/
│   │   ├── 20241031000001_create_farmers.sql
│   │   ├── 20241031000002_create_risk_rules.sql
│   │   └── 20241031000003_create_advisories.sql
│   └── functions/
│       ├── generate-advisory/
│       │   └── index.ts            # Main Edge Function endpoint (Phase A scaffold)
│       └── _shared/
│           ├── cors.ts             # Shared CORS headers
│           ├── types.ts            # Shared TypeScript type definitions
│           ├── weather/
│           │   └── openmeteo.ts    # Open-Meteo weather integration (Phase B)
│           └── risk-engine/
│               ├── wheat-rules.ts      # Wheat risk rules (sourced from ICAR / IMD KALP)
│               └── sugarcane-rules.ts  # Sugarcane risk rules (sourced from ICAR-IIFSR / IMD)
└── .env.example                    # Environment variable template (no real secrets)
```

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| [Node.js](https://nodejs.org/) | 18+ | Required for Supabase CLI |
| [Supabase CLI](https://supabase.com/docs/guides/cli) | Latest | `npm install -g supabase` |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest | Required for local Supabase |
| [Deno](https://deno.land/) | 1.40+ | Required to run Edge Functions locally |

---

## Local development setup

### 1. Clone and branch

```bash
git clone <repo-url>
cd forge-26-zero-day
git checkout feature/backend
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env and fill in your values (see .env.example for descriptions)
```

### 3. Start local Supabase

```bash
supabase start
```

This starts a local PostgreSQL database, REST API, Edge Function runtime, and Supabase Studio.
The local Studio UI is available at **http://127.0.0.1:54323**.

### 4. Apply database migrations

```bash
supabase db reset
```

This applies all migrations in `supabase/migrations/` in order and runs `supabase/seed.sql`.

### 5. Set Edge Function secrets (local)

```bash
supabase secrets set GEMINI_API_KEY=your_gemini_key_here
```

> **Security:** Never hard-code the Gemini API key in any source file. Always use Supabase secrets.
> The Gemini key must never appear in frontend code or in the GitHub repository.

### 6. Run Edge Functions locally

```bash
supabase functions serve generate-advisory --env-file .env
```

The function will be available at:
`http://127.0.0.1:54321/functions/v1/generate-advisory`

---

## API reference

### `POST /functions/v1/generate-advisory`

Accepts farmer details and returns a weather forecast, crop-specific risk assessment, and AI-generated advisory.

**Request body:**

```json
{
  "location": "Saharanpur, Uttar Pradesh",
  "latitude": 29.9648,
  "longitude": 77.5460,
  "crop": "wheat",
  "growth_stage": "grain_development_maturity",
  "sowing_date": "2025-11-15",
  "language": "en"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `location` | string | ✅ | Human-readable location name |
| `latitude` | number | ✅ | Latitude in decimal degrees |
| `longitude` | number | ✅ | Longitude in decimal degrees |
| `crop` | `"wheat"` \| `"sugarcane"` | ✅ | Selected crop |
| `growth_stage` | string | ✅ | Manually selected growth stage (see values below) |
| `sowing_date` | string (ISO date) | ❌ | Used only for consistency checks; never overrides `growth_stage` |
| `language` | `"en"` \| `"hi"` | ✅ | Preferred response language |

**Valid `growth_stage` values:**

| Crop | Stage values |
|------|-------------|
| `wheat` | `early_growth`, `cri`, `vegetative_growth`, `reproductive`, `grain_development_maturity` |
| `sugarcane` | `germination`, `tillering`, `grand_growth`, `maturity_ripening` |

**Response (Phase E — to be finalised with team):**

```json
{
  "farmer_input": { ... },
  "weather_summary": {
    "location": "Saharanpur, Uttar Pradesh",
    "latitude": 29.9648,
    "longitude": 77.5460,
    "daily": [ ... ],
    "fetched_at": "2025-12-01T10:00:00Z",
    "source": "Open-Meteo"
  },
  "detected_risks": [
    {
      "rule_id": "wheat_grain_dev_terminal_heat_moderate",
      "risk_name": "Terminal Heat Stress",
      "severity": "Moderate",
      "validation_status": "validated",
      "weather_parameter": "max_temp_c",
      "observed_value": 32.5,
      "threshold_value": 30,
      "threshold_operator": "gt",
      "threshold_unit": "°C",
      "trigger_date": "2025-12-03",
      "source": "IMD KALP Operational Framework",
      "source_url": "https://mausam.imd.gov.in/...",
      "precautionary_action": "..."
    }
  ],
  "ai_advisory": "...",
  "ai_fallback": false,
  "generated_at": "2025-12-01T10:00:05Z"
}
```

> **Note:** The exact response shape will be confirmed with the full team (frontend + backend) before Phase E integration. See `supabase/functions/_shared/types.ts` for the full TypeScript definitions.

---

## Agricultural risk rules

Risk rules are maintained in:
- `supabase/functions/_shared/risk-engine/wheat-rules.ts`
- `supabase/functions/_shared/risk-engine/sugarcane-rules.ts`

### Validation status

| Status | Behaviour | Use case |
|--------|-----------|----------|
| `validated` | Automated Low / Moderate / High severity | Operationally confirmed thresholds (e.g. IMD KALP) |
| `research_observation` | Qualitative "Potential Risk" warning only | Thresholds from research; need local KVK validation |
| `pending_validation` | Qualitative warning only | General guidance; awaiting ICAR / KVK confirmation |

**Critical rules enforced by the risk engine:**
- Only `validated` rules trigger automated severity classification.
- Rainfall alone is never used to confirm actual field waterlogging.
- No unsupported pesticide dosages or chemical treatment instructions are generated.
- If a threshold cannot be verified, it is marked `pending_validation` and generates a qualitative warning only.

### Sources

- [ICAR-IIFSR Sugarcane Crop Management](https://dss.iifsr.org.in/sugarcane_management.php)
- [IMD KALP Operational Framework](https://mausam.imd.gov.in/imd_latest/contents/agromet/kalp/kalp.pdf)
- [IMD MAUSAM — Climatic Impacts on Wheat in UP](https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/1179)
- [IMD MAUSAM — Extreme Weather Impacts on Sugarcane in UP](https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/1187)

---

## Database schema

| Table | Description |
|-------|-------------|
| `farmers` | Farmer profiles — location, crop, sowing date, growth stage, language |
| `risk_rules` | Crop-specific weather risk rules with source attribution |
| `advisories` | Persisted advisory records for history feature |

Row Level Security (RLS) is enabled on all tables.

---

## Deployment (Supabase hosted)

```bash
# Link to hosted Supabase project
supabase link --project-ref <your-project-ref>

# Push database migrations
supabase db push

# Set production secrets
supabase secrets set GEMINI_API_KEY=your_production_key

# Deploy Edge Functions
supabase functions deploy generate-advisory
```

---

## Implementation status

| Phase | Description | Status |
|-------|-------------|--------|
| A | Backend setup — repo, branch, Supabase structure, scaffolding | ✅ Complete |
| B | Open-Meteo weather API integration | 🔜 Next |
| C | Crop-specific risk detection engine | 🔜 Next |
| D | Gemini advisory generation | 🔜 Next |
| E | Combine components into single endpoint | 🔜 Next |
| F | Testing and delivery | 🔜 Next |

---

## Known limitations (Phase A)

- The `generate-advisory` endpoint currently returns **HTTP 501 Not Implemented**. Weather, risk engine, and Gemini integration are not yet wired in.
- Sugarcane risk rules are research-observation or pending-validation only at this stage; no automated severity classification is applied for sugarcane until thresholds are confirmed with ICAR/KVK.
- The response schema may be updated after team alignment in Phase E.

---

## Disclaimer

KisanRakshak provides advisory support based on weather forecasts and verified agricultural guidelines. It does not replace expert agricultural consultation. Risk alerts indicate potential weather-related concerns based on forecast data — they do not confirm actual crop damage, field waterlogging, or disease occurrence.