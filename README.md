# KisanRakshak

**Weather-aware crop protection assistant for Indian farmers.**

KisanRakshak helps farmers view location-specific weather information in a simple, accessible interface and understand it in the context of their selected crop and growth stage.

The current pilot focuses on **Saharanpur, Uttar Pradesh**, supports **wheat and sugarcane**, and provides **Hindi and English** interface options.

## What the MVP includes

- Guided selection of location, crop, growth stage and optional sowing date.
- Current weather conditions and a 7-day forecast from [Open-Meteo](https://open-meteo.com/).
- Hindi and English interface support.
- A React dashboard for weather information and advisory responses.
- A Supabase Edge Function backend that validates inputs, retrieves weather data, applies deterministic checks and can use Gemini to explain the results.

## Important scope and safety notes

- The MVP does **not** currently enable validated crop-risk severity rules. The backend's `risks` array can therefore be empty.
- An empty risk list does **not** mean that a crop is safe. Conditions that cannot be assessed should be communicated as not assessed.
- Weather warnings are informational; they are not proof of crop damage.
- Gemini explains backend results when available. It does not determine risk severity or invent thresholds, doses or treatments.
- If AI explanation is unavailable, the application may show rule-based fallback information.
- This application is advisory support and does not replace advice from an agricultural expert or local Krishi Vigyan Kendra (KVK).

## Technology

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind CSS |
| Weather and geocoding | Open-Meteo |
| Backend | Supabase Edge Functions |
| AI explanation | Google Gemini |
| Frontend hosting | Vercel |

## Run the frontend locally

### Prerequisites

- Node.js and npm
- Access to the Supabase project used by the deployed backend

### Setup

```bash
git clone https://github.com/yuktisharma06/forge-26-zero-day.git
cd forge-26-zero-day
git checkout frontend
npm install
```

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-publishable-key>
VITE_USE_MOCK_ADVISORY=false
```

Use the Supabase **publishable** key (or the anon key configured for the project), never a service-role key. The Gemini API key must remain server-side in Supabase secrets and must not be added to frontend environment variables.

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

## Backend and API

The backend implementation is currently maintained on the `feature/backend` branch.

- [Backend source](https://github.com/yuktisharma06/forge-26-zero-day/tree/feature/backend/supabase)
- [Backend README and setup instructions](https://github.com/yuktisharma06/forge-26-zero-day/blob/feature/backend/README.md)
- [API contract](https://github.com/yuktisharma06/forge-26-zero-day/blob/feature/backend/docs/api-contract.md)
- [Product specifications](https://github.com/yuktisharma06/forge-26-zero-day/blob/feature/backend/docs/specs.md)

The deployed advisory endpoint is:

```
POST https://lvonmdvdkxzlziepqhmk.supabase.co/functions/v1/crop-advisory
```

The frontend calls this endpoint through the Supabase project URL and publishable key. Refer to the API contract for request fields, response structure and error codes.

## Project structure

```
src/
  components/    UI and dashboard components
  context/       Farmer input context
  data/          Crop, location and mock data
  hooks/         Advisory workflow hooks
  i18n/          Hindi and English interface text
  pages/         Home, farmer details and dashboard pages
  services/      Advisory API and mock service
  types/         TypeScript types
  utils/         Formatting and validation helpers
```

## Current limitations

- Pilot coverage is limited to Saharanpur.
- Only wheat and sugarcane are supported.
- Validated automated crop-risk severity rules are not enabled in this MVP.
- Weather availability and AI explanation can vary with external service availability.
- More crops, regions, validated risk rules and regional-language support are future work.

## Disclaimer

KisanRakshak provides weather information and decision-support guidance for demonstration purposes. Farmers should consult their local agricultural experts or KVK before taking important crop-management decisions.
