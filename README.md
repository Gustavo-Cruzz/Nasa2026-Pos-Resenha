# Field Shift

Field Shift is a Space Apps 2026 MVP for comparing crop-rotation hypotheses for Brazil using traceable historical climate data and explicitly scoped regional evidence.

Brazil is the product scope. Brazilian coordinates are resolved against a versioned IBGE municipal mesh and matched to MAPA ZARC crop records plus IBGE PAM observations. PAM is statistical context only; neither source is a national suitability rule or field validation. The generator uses eight P0 crops, including common bean and rainfed upland rice. The Atlas can technically inspect global NASA climate, but that is outside the Brazilian product journey and never receives Brazilian agronomic context.

## Climate Risk Lab

Results include an optional, failure-tolerant Climate Risk Lab. It calls the Open-Meteo Forecast API independently of NASA POWER and labels its source, issue time, `best_match` model selection, UTC time zone and units. It reports forecast precipitation, provider-calculated FAO reference ET0 and `P − ET0` for 7 and 15 days, plus a same-calendar-window NASA historical climate comparison when complete coverage is available. This balance is a climate indicator only — never soil moisture, ETc, crop water use, irrigation need or field deficit.

The dry-spell experiment defines an event as at least seven consecutive days below 1 mm/day. Reproduce its offline NASA-fixture training with `npm run train:dry-spell`. The committed Rio Verde artifacts use chronological train/validation/test partitions with embargoes, Brier score and calibration. Both 7-day and 15-day logistic models currently lose to climatology on held-out test data; therefore the app does not release an ML probability and shows only its qualified climatological reference at that exact pilot coordinate. Other coordinates have no location-compatible ML artifact.

## Status

The current flow is Explore → Farm → Laboratory → Compare → Methodology. It remains exploratory: it does not make agricultural recommendations, calculate aggregate scores, or turn missing evidence into zero.

## Development

```bash
npm install
npm run dev
```

## Checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Visual assets

Runtime pixel art lives under `public/assets/`. Editable generators, manifests, previews and provenance/license records remain under `assets/FieldShift_P0_Assets/` and `assets/FieldShift_P1_Assets/`. The original common-bean and upland-rice uploads are retained in `assets/crops/`; optimized 64×64 derivatives are published for the app. Visual themes and animations are decorative and never alter scientific analysis or evidence status.

## Map and deployment

`/explore` ships with a navigable real-world MapLibre basemap from OpenFreeMap, derived from OpenStreetMap data. Attribution is visible in the map control. Users can pan, zoom, click and drag the marker to position their farm; latitude/longitude fields remain the keyboard-accessible fallback. The basemap is for location selection only and does not add farm, crop, soil or climate observations.

Deploy requires an authenticated Vercel account and GitHub write credentials. This repository intentionally contains neither credential nor a map-style URL.

## Scope limits

The app will not forecast weather, estimate precise yield/NPK/SOC changes, or present regional recommendations outside applicable Brazilian evidence. See `fieldshift_codex/PROJECT_SPEC.md` for the source specification.

## Agricultura familiar e consórcios

The catalog includes the supplied family-farm crops and contextual evidence without filling absent agronomic parameters. Harvest references are not assumed crop durations. Farmer-declared availability filters annual alternatives; permanent crops can be registered but are excluded from annual A/B/C slots. Documented intercrops are exploratory examples: simultaneous crops may add diversity and also competition risk, never an automatic productivity, soil, or water benefit.
