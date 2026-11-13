# Validation

- Any valid global coordinate still returns A/B/C; unavailable NASA data remains explicit and does not remove scenarios.
- Brazilian coordinate → 2025 IBGE municipality code when the point intersects the committed municipal mesh.
- Matching municipality + P0 crop in the MAPA 2026/2027 artifact → `regionally_contextualized` for that crop only.
- Missing municipality/crop ZARC row → `climate_exploration`; absence never means unsuitable.
- Raw ZARC codes, cycle/soil/climate codes, management labels, ordinances and decêndios are preserved without probability interpretation.
- `locally_validated` is never emitted.
- Rio Verde without a confirmed baseline → “Continuação presumida — confirmar”.
- Crop evidence records retain source metadata; partial evidence cannot make a crop eligible.
- NASA fixture tests SHA, units, coverage and exact pilot-only coordinate. The national ZARC expansion does not broaden NASA fixture fallback.

Automated checks: `tests/unit/`, `tests/e2e/navigation.spec.ts`. National tests cover Rio Verde, São Paulo, Salvador, Boa Esperança do Norte and coordinates outside Brazil. No field validation claim.
