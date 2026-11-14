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
- NDVI is read from pre-processed, hash-verified fixtures for exact demonstration points. The ORNL DAAC subset service (ten dates per request) returned HTTP 502/503, so the collection script uses the Microsoft Planetary Computer STAC catalog (NASA LP DAAC MOD13Q1 v061 copies) and fixtures for Rio Verde, Accra and New Delhi are committed. Nothing is fetched at request time.
- SRTM relief and erosion/hotspot maps were not added: there is no verified soil/relief source integrated, so those layers stay N/D rather than inferred.
- PAM check: for Rio Verde the regional context returns 5 PAM products and no gap; the "no positive PAM observation" gap is emitted only when a municipality has no PAM entry, so the reported inconsistency is not reproducible in code.

## Plan 10b — 2026-11-14

- SRTM relief is fetched per analysis from the public OpenTopoData `srtm30m` endpoint (NASA SRTM GL1 v003) and degrades to N/D on any failure; at most one request of at most 100 points, with a 24 h in-memory cache and a 7-day fetch cache. Slope grid spacing is never below 60 m because SRTM vertical error makes finer slopes unreliable.
- A relief hotspot means slope ≥ 8% (start of Embrapa's "moderadamente ondulado"); soil-loss hotspots are not claimed because K, C, P and slope length are unavailable. Erosivity uses the Arnoldus Modified Fournier Index with its published classes.
- Crop evidence: seven verified records were added (sorghum pH and ideal temperature, maize viable temperature, soybean pH, sunflower viable temperature, common bean ideal temperature and pH), each checked programmatically against the extracted PDF text. Maize and sunflower now have a documented viable range, so the engine's scenario C selection changed from cowpea to maize (a different family from soybean, the last crop); tests were updated for that. Cowpea pH ("em torno de 5,5") and upland-rice pH ("em torno de 5,5") are single values, not ranges, and were not promoted. Common bean still has no documented viable range.

## Chat registration — 2026-11-14

- `/chat` only registers the farm and then opens `/results`: city (autocomplete over the IBGE municipal mesh, no outside service; coordinates and two foreign examples still accepted), current crop, previous crop (skippable) and a soil question. The planting-month question was removed: the climate window is the current calendar month, and the results page lets the reader explore any month. Priorities (equal weights), boundary and water point are no longer asked in the chat; they remain in the full farm form.
- Only the order of the two crops is known, so they are stored as whole-year events in consecutive years ending in the current year; the analysis uses the order, never the dates.
- Soil observation ("Você notou alguma coisa estranha no solo?"): the producer's words are mapped to kinds (waterlogging, compaction, erosion, dry/cracked, salt crust, discoloration) or kept as an "other" note (200 characters). It is shown back as declared, goes into the Markdown export and the draft, and enters no calculation (a test asserts the analysis is identical with and without it). The app does not diagnose soil.
- The representative point of a municipality is guaranteed to lie inside it (checked for all 5,571 municipalities); Rio Verde (GO) uses the verified pilot point that carries the NASA fixtures.
- The soil suggestions are tickable chips: several can be marked and confirmed together ("Continuar (N)"); with none ticked the button reads "Nada de estranho" (first time) or "Só isso" (after something was reported). Typing in the producer's own words still works and keeps the "anything else?" loop. A ticked label adds no free-text note (only typed words do).
