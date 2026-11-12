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
