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
- Live POWER parsing keeps `IMERG_PRECTOT` and `GWETROOT` coverage separate. Their absence remains `unknown`; no fixture is enriched or simulated.
- GPM rain-day counts and root-zone wetness are historical regional context only. They never alter crop selection or become irrigation, drought tolerance, field moisture, or local validation.
- Scenario C is labeled “Contexto hídrico”; neither UI nor engine calls it water resilience.
- The SMAP GIBS raster is a dated visual overlay only and its colors never become numeric measurements. A polygon enters analysis as user-supplied spatial context, approximate area and a 9 km resolution warning; it does not claim a verified field. Historical numeric SMAP remains unknown without a polygon-matched, authenticated Earthdata preprocessing artifact.
- A concrete NASA Insight attention decision must contain month, scenario, observed NASA value, documented crop range, rule ID and sources. Missing evidence cannot generate attention.
- Rio Verde, Accra and New Delhi comparison calls each coordinate independently and exposes unavailable values instead of substituting another location.
- Verified Kc profiles may appear only beside available NASA water exposure. They do not change crop selection, produce ETc, rank crops/studies, or claim irrigation need.
- Common-bean Kc values retain the ANA irrigated-national-reference context; they are not projected to cowpea, upland rice, ruziziensis or a local calendar.

Automated checks: `tests/unit/`, `tests/e2e/navigation.spec.ts`. National tests cover Rio Verde, São Paulo, Salvador, Boa Esperança do Norte and coordinates outside Brazil. No field validation claim.
