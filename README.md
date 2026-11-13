# Field Shift

Field Shift is a Space Apps 2026 MVP for comparing crop-rotation hypotheses using traceable historical climate data and explicitly scoped regional evidence.

The product is global by coordinates and contextualized with Brazilian sources. In Brazil, coordinates are resolved against a versioned IBGE municipal mesh and matched to MAPA ZARC crop records plus IBGE PAM observations. PAM is statistical context only; neither source is a national suitability rule or field validation. The generator uses eight P0 crops, including common bean and rainfed upland rice.

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

`/explore` ships with a local MapLibre coordinate canvas, neutral offline tiles, and reduced-motion-safe decorative NASA-style animations. This local style contains no map provider, geographic layers, land-use inference, climate raster, or satellite feed. It is only a tactile way to select coordinates; latitude/longitude fields remain the complete keyboard-accessible fallback.

Deploy requires an authenticated Vercel account and GitHub write credentials. This repository intentionally contains neither credential nor a map-style URL.

## Scope limits

The app will not forecast weather, estimate precise yield/NPK/SOC changes, or present regional recommendations outside applicable evidence. See `fieldshift_codex/PROJECT_SPEC.md` for the source specification.
