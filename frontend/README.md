# JalDrishti Frontend

Responsive Vite/React frontend for the **Real-Time Groundwater Resource Evaluation and Early Warning Platform**. The interface presents groundwater monitoring information for the public, researchers, and government planners.

This repository currently runs entirely on clearly labelled demonstration data. It does not create, change, or require a backend.

## Features

- Indian government-style multi-level header, responsive navigation, and footer
- Public local groundwater status with simple trend, confidence, rainfall, forecast, and advisories
- OpenStreetMap/Leaflet station map with classification markers, filters, list mode, station popups, and geolocation fallback
- Searchable station explorer with filters, sorting, responsive table/cards, and pagination
- Station detail with overview, hydrograph, recharge calculation, forecast, quality, and metadata tabs
- Research dashboard, station comparison, saved stations, and mock export history
- Planner dashboard, district drill-down, local alert workflow, and printable report builder
- Mock authentication, role selection, profile, saved locations, notification preferences, and settings
- Offline banner, cache-ready React Query configuration, loading/error/empty components, and demonstration-data labels
- Semantic status labels, keyboard focus, skip link, text-size controls, mobile table alternatives, and chart descriptions
- Lazy-loaded routes and service modules that switch between mock data and Axios

## Technology

React 19, Vite, React Router, TanStack Query, Zustand, React Hook Form, Zod, Axios, Recharts, Leaflet/React Leaflet, Lucide React, i18next, Sonner, Vitest, and Testing Library.

## Install and run

```bash
cd frontend
npm install
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

## Environment

Copy `.env.example` to `.env` when custom values are needed:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_USE_MOCK_DATA=true
```

- `VITE_USE_MOCK_DATA=true`: uses the bundled demonstration data in `src/data/mockData.js`.
- `VITE_USE_MOCK_DATA=false`: service methods use Axios and `VITE_API_BASE_URL`.

## Commands

```bash
npm run dev       # Development server
npm run build     # Production bundle
npm run preview   # Preview the production bundle
npm test          # Unit/component tests
npm run lint      # ESLint
```

## Structure

```text
src/
├── components/
│   ├── charts/       # Recharts visualizations
│   ├── common/       # Status, confidence, cards, and data states
│   ├── layout/       # Government portal shell
│   └── maps/         # Leaflet map and legend
├── data/             # 30 stations, readings, forecasts, recharge, alerts
├── localization/     # Extensible i18next setup
├── pages/            # Public, station, researcher, planner, auth, and account pages
├── services/         # Axios client and mock/API switching
├── store/            # Persisted frontend preferences and mock session
├── styles/           # Responsive design system
├── test/             # Vitest setup and component/filter tests
└── types/            # Reusable JSDoc data contracts
```

## Connecting an API

Set `VITE_USE_MOCK_DATA=false` and configure `VITE_API_BASE_URL`. The page components call `groundwaterService`; update endpoint response adapters in `src/services/groundwater.service.js` if the backend response envelope differs. The Axios client includes a bearer-token request interceptor and safe error normalization.

## Demonstration data

The bundled dataset includes 30 stations across Maharashtra, Rajasthan, and Madhya Pradesh; eight districts; all four classifications; active/inactive/maintenance sensors; missing, anomalous, and reconstructed readings; forecasts; recharge calculations; advisories; and alerts. It is synthetic and must not be interpreted as official groundwater information.

## Known limitations

- Marker clustering is represented by filtered station rendering; a production deployment with thousands of markers should add a clustering plugin validated against the deployed React/Leaflet versions.
- Report downloads and data exports are frontend demonstrations; printing uses the browser print dialog.
- Hindi and Marathi resource namespaces are prepared, but full content translation requires verified government terminology.
- External government URLs and operational contact details are intentionally not hard-coded until verified.
- Forecasts, classifications, and recharge values are synthetic decision-support examples.
