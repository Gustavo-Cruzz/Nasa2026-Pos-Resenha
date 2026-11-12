# Field Shift

Field Shift is a Space Apps 2026 MVP for comparing crop-rotation hypotheses using traceable historical climate data and explicitly scoped regional evidence.

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

## Map and deployment

`/explore` works without tiles through the coordinate fallback. To enable an interactive MapLibre map, set `NEXT_PUBLIC_MAP_STYLE_URL` to a style URL you are authorized to use; do not use an unlicensed/public tile service as an implicit default. Configure the same variable in Vercel before deployment.

Deploy requires an authenticated Vercel account and GitHub write credentials. This repository intentionally contains neither credential nor a map-style URL.

## Scope limits

The app will not forecast weather, estimate precise yield/NPK/SOC changes, or present regional recommendations outside applicable evidence. See `fieldshift_codex/PROJECT_SPEC.md` for the source specification.
