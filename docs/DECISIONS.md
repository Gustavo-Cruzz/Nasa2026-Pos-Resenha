# Decisions

## S0 — 2026-11-12

- The initial product scope contains navigation and domain contracts only. No crop parameter, regional rule, climate fixture, score, or recommendation is introduced before its assigned sprint.
- The app starts in `pt-BR`; the small S0 dictionary establishes the no-hardcoded-copy direction for later UI work.
- Git was not initialized in the provided workspace, so no `sprint-0-foundation` commit can be created without explicit repository setup.

## S1 — 2026-11-12

- The NASA fixture is deliberately absent until it is fetched from the live API and accompanied by a matching SHA-256 sidecar. A test-only synthetic response is confined to unit tests and cannot be used at runtime.
- The climate endpoint returns a recoverable `503` when NASA is unavailable and no compatible verified fixture exists. It never falls back across coordinates or periods.

## S2 — 2026-11-12

- Catalog source links are evidence locators, not a license to infer absent values. Parameter status stays `missing` until each populated field is transcribed with its unit, cultivar/stage context, and source.
- Primary-source leads verified for the next catalog pass: Embrapa Soja, *Sistemas de Produção 9* (air-temperature adaptation 20–30 °C); Embrapa, *Cultivo do Milho* (soil temperature 25–30 °C and stage-specific thresholds); Embrapa, *A cultura do girassol* (tolerance 10–34 °C and optimum 27–28 °C); Embrapa Milho e Sorgo, *Clima* for sorghum and pearl millet. These leads are not yet regional-rule evidence.
- Scope decision: S2 pilot-candidate subset reduced to soybean, maize, sunflower and grain sorghum. Cowpea, pearl millet, ruziziensis and sunn hemp remain catalog/display-only because no compatible Rio Verde window was verified. This is a scientific-scope cut, not a claim they are unsuitable.

## Plan 10 — 2026-11-14

- ET0 (FAO-56 Penman–Monteith) and the monthly P − ET0 balance are allowed as a climate indicator. ETc, crop water use, irrigation need and forecasts stay out of scope. Surface pressure `PS` was added to the POWER request and the Rio Verde fixture was recaptured with it (new SHA-256).
- NDVI is read from pre-processed, hash-verified fixtures for exact demonstration points. The ORNL DAAC subset service allows ten dates per request and returned HTTP 502/503 during development, so it is never called at request time. Without a fixture the app shows N/D. No NDVI fixture is committed yet.
- SRTM relief and erosion/hotspot maps were not added: there is no verified soil/relief source integrated, so those layers stay N/D rather than inferred.
- PAM check: for Rio Verde the regional context returns 5 PAM products and no gap; the "no positive PAM observation" gap is emitted only when a municipality has no PAM entry, so the reported inconsistency is not reproducible in code.
