# Field Shift

Field Shift is a Space Apps 2026 MVP for comparing crop-rotation strategies using traceable historical climate data and explicitly scoped regional rules.

## Status

S0 foundation is in progress. The current interface is navigable but does not make agricultural recommendations or display NASA data.

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

## Scope limits

The app will not forecast weather, estimate precise yield/NPK/SOC changes, or present regional recommendations outside the validated Rio Verde (GO) pilot. See `fieldshift_codex/PROJECT_SPEC.md` for the source specification.
