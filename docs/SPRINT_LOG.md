# Sprint log

## Soil Brazil SQ4 — resumo de solo em 30 segundos

Status: complete — quatro indicadores essenciais e detalhes sob demanda.

Implemented: Results now presents exactly four regional indicators — texture, pH in water, organic carbon and root-zone wetness — through a pure presentation adapter. Missing SoilGrids properties remain `N/D`; an available NASA moisture snapshot can still be shown independently when the static profile is missing.

Implemented: source, method, depth, reference point, sand/silt/clay, CEC, bulk density, water retention, NASA period, percentile, climatology and limitations remain available in an accessible disclosure. The home page now exposes the existing `Ver demonstração Brasil` action, so the hackathon flow reaches the preloaded Rio Verde analysis without manual entry.

Evidence (2026-11-14): `npm run lint`, `npm run typecheck`, `npm run test` (231 unit tests), and `npm run build` passed. The focused mobile Playwright flow passed, covering menu operation, one-click Brazil demo, all four summary indicators and the technical-details disclosure.

Limitations: all regional values remain modelled context, not field measurements. The summary does not calculate fertiliser, liming, ETc, irrigation need, crop water use, yield or forecasts; local laboratory evidence remains separate and primary.

## Soil Brazil SQ3 — contrato automático unificado

Status: complete — composição server-side única para solo estático e umidade.

Implemented: replaced the two independent API fields with `soilContext`, containing `staticProfile` and `moistureSnapshot` under one municipality and status (`available`, `partial`, or `unavailable`). The resolver rejects any cross-artifact municipality mismatch and runs automatically from the analysis coordinates without producer soil input or runtime data downloads.

Evidence (2026-11-14): `npm run lint`, `npm run typecheck`, `npm run test` (229 unit tests), and `npm run build` passed. Tests cover complete Rio Verde context, partial São Paulo context, outside-Brazil behavior, municipal identity consistency and API serialization.

Limitations / next: the contract exposes evidence; it does not insert regional estimates into farmer laboratory fields or crop constraints. SQ4 reduces presentation to four demo indicators and moves technical detail/provenance behind an accessible disclosure.

## Soil Brazil SQ2 — umidade radicular NASA pré-processada

Status: complete — climatologia e último mês válido para 5.571 municípios.

Implemented: added a reproducible offline NASA POWER Monthly Regional builder using `GWETROOT` over 25 cached 10° Brazilian tiles. The 1.8 MB artifact stores monthly 2015–2025 medians, the latest valid value through the build year, same-calendar-month percentile, native grid coordinate, request URLs and SHA-256 hashes. Coverage is 5,571/5,571 municipalities.

Implemented: `/api/analyze` now attaches the dated moisture context without a runtime NASA call. The automatic Results soil panel shows SoilGrids retention separately from NASA relative root-zone wetness, month/year and historical percentile. Labels explicitly reject volumetric field-moisture, sensor, forecast, ETc, crop-water-use, irrigation-need and yield interpretations.

Evidence (2026-11-14): `npm run lint`, `npm run typecheck`, `npm run test` (226 unit tests), and `npm run build` passed. Tests verify national coverage, bounded 12-month climatology, dated Rio Verde context, outside-Brazil unknown behavior and API composition.

Limitations: `GWETROOT` is a modelled regional relative index on the NASA POWER meteorology grid; it is not SMAP field moisture or a current farm measurement. Latest period varies by grid cell and is shown explicitly. No scenario-specific water conclusion is derived from it.

## Soil Brazil SQ1 — perfil municipal estático pré-processado

Status: complete — pacote nacional parcial, lookup automático e UI.

Implemented: added a reproducible offline builder over official SoilGrids 2.0 aggregated 5 km GeoTIFFs. It uses PROJ `cs2cs` for the native Interrupted Goode Homolosine grid, combines 0–5, 5–15 and 15–30 cm by depth, preserves source hashes and produces pH in water, SOC, sand/silt/clay, CEC, bulk density and water retention at 33/1500 kPa for all 5,571 IBGE municipality records. Interior fallback points remain inside the same municipality; no nearest municipality or pixel substitution occurs.

Implemented: the 3.0 MB server-only artifact has complete profiles for 5,456/5,571 municipalities (97.9%); the remaining 115 stay unknown. `/api/analyze` now performs an automatic municipal lookup and Results displays pH, texture, organic carbon and water retention without manual soil entry. Retention is explicitly separate from current moisture and no value drives fertiliser, liming, irrigation, yield or local-validation claims.

Evidence (2026-11-14): `npm run lint`, `npm run typecheck`, `npm run test` (223 unit tests), and `npm run build` passed. Tests verify national count/coverage, Rio Verde values, outside-Brazil behavior, municipal no-data preservation and API exposure. The builder configuration also validates without network writes unless `--execute` is supplied.

Limitations / next: this is a modelled value at a verified interior municipal reference point, not a municipal zonal statistic or field measurement. Source resolution is 5 km and only mean layers are used; no per-pixel prediction interval is claimed. SQ2 adds separately dated NASA moisture context.

## Family farm F11 — correções da auditoria de consórcios

Status: complete — contratos, motor, UI e validação corrigidos.

Implemented: expanded cropping-system types to single crop, simultaneous intercrop, succession, and rotation; added catalog-ID, unique-plot, Farmer-First restriction, overlap/order, and exact documented-example validation. Unknown crops remain rejected instead of disappearing from summaries. Permanent crops remain registrable but cannot enter annual baseline or laboratory slots.

Implemented: A/B/C now marks whether each declared system applies to its main crop, adds sourced competition/sequence limitations only to applicable hypotheses, and includes declared companions in qualitative species/cover context without claiming productivity, water savings, nutrient gains, or local suitability. Results show crop periods and scenario applicability.

Implemented: Farm now provides accessible selectors plus draggable crop cards for 2–3-crop systems, visible field-level validation, all four system labels, and corrected catalog-wide copy. Evidence coverage no longer treats a generic source URL as regional applicability.

Evidence (2026-11-14): `npm run lint`, `npm run typecheck`, `npm run test` (154 unit tests), and `npm run build` passed. Three focused Playwright flows passed: V1 draft migration, bilingual Farm/Lab/Results continuity, and 2–3-crop drag/drop with chronological validation and persistence.

Limitations: documented library examples remain exploratory and are not auto-selected. User-defined custom crops stay registered as unknown profile context but cannot enter catalog-dependent system calculations.

## Family farm F10 — catálogo e contratos de consórcios

Status: complete — catálogo, escolha Farmer-First, consórcios e comparação.

Implemented: merged the 16 supplied family-farm crops and 18 contextual evidence records without replacing existing crop IDs. Added aliases for existing maize, common bean, cowpea and upland rice; retained common bean and cowpea as distinct species. Metadata now keeps permanent crops registrable while excluding them from annual lab/rotation slots.

Implemented: added a pure cropping-system contract for single and 2–3-crop intercrops, requiring overlapping dates, rejecting duplicate crop IDs, preserving long cassava alongside shorter companion crops, and exposing documented-example constraints, sources and competition risks without quantitative benefit claims. The Farm draft now lets the producer add up to three crops per plot and requires explicit dates; Results presents this declared context as a layer over A/B/C, never as a productivity, soil or water-use claim.

Evidence (2026-11-14): `npm run lint`, `npm run typecheck`, `npm run test` (151 unit tests), and `npm run build` passed. Tests cover idempotent crop merge, distinct bean species/aliases, contextual harvest evidence, overlapping cassava+cowpea, invalid non-overlapping intercrops, permanent crops excluded from annual slots, and A/B/C system context.

Next: preserve these contracts when adding more agronomic evidence; do not turn library examples into automatic regional recommendations.

## Scope F9 — Brasil nacional

Status: complete — documentation and product-contract scope updated.

Implemented: changed the active project, agent, product, data, methodology, validation, demo and gamification documentation from a GO/Rio Verde pilot framing to Brazil nationwide. Rio Verde remains a reproducible example and exact-coordinate fixture, while the existing IBGE/ZARC municipal context is the national boundary. State-organized SoilGrids batches remain partial until their exact points or native-grid tiles have been processed and verified.

Guardrails: national product scope does not make every Brazilian coordinate regionally evidenced, locally validated or soil-covered. Global NASA inspection remains a technical climate-only capability outside the Brazilian agronomic promise.

Evidence (2026-11-14): `npm run lint`, `npm run typecheck`, `npm run test` (146 unit tests), and `npm run build` passed after the documentation-contract update.

## Soil artifacts F7 — versioned SoilGrids WCS extraction

Status: complete for the exact Rio Verde demonstration coordinate; Brazil-wide coverage intentionally not claimed.

Implemented: added a reproducible WCS collector that reads SoilGrids 2.0 Q0.05, Q0.5 and Q0.95 pixel samples without using the paused REST API, validates single signed-int16 GeoTIFF responses, applies documented conventional-unit conversions and writes a versioned JSON artifact plus SHA-256 sidecar. The committed 0–5 cm/250 m Rio Verde artifact includes pH, SOC, sand, silt, clay, CEC and bulk density, its source query for every quantile, license, citation, source resolution and 90% prediction interval.

Implemented: the regional adapter now exposes this data only for the exact captured coordinate and labels it `estimated`; every other point remains `unknown`. Added a national production policy: Brazil-wide native-resolution coverage must be generated as reviewed offline batches because it contains roughly 136 million 250 m cells before properties and quantiles.

Limitations: SoilGrids is a machine-learning spatial product and not suitable for assertions about an individual field. The artifact never replaces a local laboratory sample, does not add crop/irrigation calculations, and does not create nationwide coverage from a pilot point.

Evidence (2026-11-14): `npm run lint`, `npm run typecheck`, `npm run test` (146 unit tests), and `npm run build` passed. Unit tests verify the exact-coordinate gate, the retained unknown attributes, artifact SHA-256, source URLs, depth, resolution, units and prediction-interval ordering.

Next: generate reviewable offline regional batches before enabling additional Brazilian coordinates; keep any unprocessed coordinate as unknown.

## Soil artifacts F8 — batches organized by state

Status: complete — batch orchestration only; no statewide coverage claim.

Implemented: added the first state batch manifest for GO, registering the verified Rio Verde point under `partial` / `exact_points_only`. The new state-batch CLI validates every inventory entry and can sequentially regenerate approved WCS artifacts only with an explicit `--execute`; its safe default performs no download or overwrite.

Guardrails: state organization is not state aggregation. The manifest prohibits nearest-point, municipal-average and state-statistic substitution, and cannot be marked broader coverage without a reviewed native-grid tile processor and completed artifacts.

Evidence (2026-11-14): `npm run fetch:soilgrids-state-batch -- --batch data/soilgrids/batches/go.json` validated the inventory without network writes. `npm run lint`, `npm run typecheck`, `npm run test` (146 unit tests), and `npm run build` passed.

## Farmer-First F6 — solo regional verificável e incerteza

Status: complete — no spatial estimate loaded.

Implemented: introduced an isolated regional-soil adapter with SoilGrids and MapBiomas Solo provenance. It currently returns an explicit unavailable/unknown context with every spatial attribute, unit, depth, resolution and uncertainty as `null`; it does not call the suspended SoilGrids REST API. The Farm UI uses this boundary to state the N/D status, while preserving local laboratory values as the primary, separate source.

Implemented: expanded every analysis data-quality record with uncertainty and exposes it in Results alongside its classification, method, unit, inputs and limitations.

Evidence (2026-11-14): `npm run lint`, `npm run typecheck`, `npm run test` (144 unit tests), and `npm run build` passed. Focused Playwright checks for the crops-first opening and English end-to-end farm/laboratory/results flow passed.

Next: run the complete quality gate, focused browser checks, then perform the final requirement audit. A regional estimate can only become available after a compatible, versioned preprocessed artifact documents its source, depth, unit, resolution and uncertainty.

## Farmer-First F5 — abertura pelas culturas

Status: complete.

Implemented: changed the primary landing CTA from Atlas-first to `Conhecer minha fazenda` / `Meet my farm`. The Farm route now opens with farmer crop choices before location, soil and history; the Atlas remains an explicit “change location” step for climate context. This lets a producer express operational crops and goals before interacting with a map.

Evidence (2026-11-14): `npm run typecheck`, `npm run test` (143 unit tests), and `npm run lint` passed. Focused bilingual landing/Atlas Playwright coverage passed.

Next: final build and completion audit; retain all scientific gaps as unknown rather than extending the scope with unverified soil, crop-cycle or water-demand data.

## Farmer-First F4 — proveniência e cenários de aceite

Status: complete.

Implemented: added the `DataQualityRecord` contract to every analysis and Results: measured, observed, estimated, derived, scenario, or unknown, with method/formula, unit, inputs, source references and limitations. NASA historical climate is observed only when available; local lab soil is measured; separately declared regional soil is estimated; A/B/C are scenarios; qualitative soil-health comparison is derived.

Implemented: added four acceptance tests for (1) Rio Verde soybean/maize with lab soil and irrigation; (2) same crop context, rainfed, water-first; (3) global point without ZARC; and (4) custom crop plus unavailable regional soil. They verify that the flow stays operational without inventing evidence.

Evidence (2026-11-14): `npm run lint`, `npm run typecheck`, `npm run test` (143 unit tests), and `npm run build` passed. The Results provenance/Evidence Center Playwright flow passed after resolving an accessible-name collision.

Next: run final lint/build/browser validation and document the completion audit. No SoilGrids or MapBiomas values may be added without verified compatible artifacts.

## Farmer-First F3 — decisões, prioridades e jornada

Status: complete — no numeric recommendation.

Implemented: reframed farm preferences as “what do you most need to protect or improve?”, with an accessible primary-focus choice (water, soil, operations) plus secondary sliders and irrigation context. Objective crop restrictions remain farmer-declared availability/exploration/blocks from F1 and are called out where they affect alternatives. The journey labels now use farmer decision language: crops/land, possible futures, and plan.

Guardrails: primary focus only highlights compatible trade-offs already present in the comparison. It does not score crops, bypass blocks, infer unavailable operational windows, or create a recommendation.

Evidence (2026-11-14): `npm run typecheck`, `npm run test` (139 unit tests), and `npm run lint` passed. `npm run build` passed. Three focused navigation/farm Playwright flows passed; an accessible-name collision found during testing was corrected.

Next: final requirement-by-requirement audit of farmer scenarios, data provenance classification and remaining scientific limits.

## Farmer-First F2 — contexto qualitativo de saúde do solo

Status: complete — evidence-limited.

Implemented: added a pure soil-health layer to A/B/C and an accessible result comparison. It reports catalogued species diversity, immediate family repetition, cover purpose, documented nitrogen-fixation potential, potential bare-soil interval, erosion-protection context, and an explicitly initial local organic-carbon/matter reading. B/C display the delta from A as a qualitative difference only.

Guardrails: no carbon gain, fertility improvement, N quantity, soil-loss reduction, yield or irrigation claim is calculated. Bare-soil interval remains N/D without compatible dates, verified duration and management; erosion protection remains limited by management/terrain/field-cover evidence; nitrogen does not use family as a substitute for a documented potential.

Evidence (2026-11-14): `npm run lint`, `npm run typecheck`, `npm run test` (139 unit tests), and `npm run build` passed. Three focused Results Playwright flows passed. Unit coverage proves species/cover/carbon context, preserves unknown bare-soil periods, and rejects carbon/N-future claims.

Next: reorganize the farmer journey and priorities/restrictions into decision language while preserving existing routes and draft migration.

## Farmer-First F1 — culturas operacionais e Meu Solo

Status: complete — regional-soil evidence intentionally unavailable.

Implemented: added a validated farmer crop profile to the local draft: `Posso cultivar`, `Quero explorar`, `Não posso usar`, and named custom crops with stated purpose. The pure candidate engine preserves A/current strategy and filters B/C to catalog crops operationally available or accepted for exploration, excluding blocks. A custom crop stays explicit farmer context with no invented scientific parameters. The laboratory uses the same permitted catalog set.

Implemented: expanded optional local soil input with pH method, sand/silt/clay, organic carbon/matter, P, K, depth, date, drainage and source classification. Local laboratory evidence remains separate from regional estimates. The UI reports SoilGrids/MapBiomas regional context as N/D because no verified compatible preprocessed artifact exists and the suspended SoilGrids REST API is deliberately not called.

Evidence (2026-11-14): `npm run lint`, `npm run typecheck`, `npm run test` (138 unit tests), and `npm run build` passed. Seven focused Playwright farm/laboratory flows passed. New tests cover profile validation, custom crops, local-soil fields, alternatives changing with operational availability, and preserving a blocked current baseline.

Limitations / next: custom crops can be recorded but cannot enter catalog-derived B/C indicators until verified evidence exists. SoilGrids/MapBiomas integration requires licensed, preprocessed regional artifacts with depth/unit/uncertainty metadata; no estimates were created. Next sprint: derive qualitative soil-health deltas only from documented crop functions and complete sequence information.

## V5 — Mapa-base geográfico navegável

Status: complete.

Plan: replace the abstract coordinate canvas with a real-world, attributed MapLibre basemap. Retain click-to-position, draggable marker, pan/zoom and coordinate fallback; do not derive agricultural evidence from the basemap.

Implemented: replaced the neutral tiled canvas with OpenFreeMap's public Liberty MapLibre style, derived from OpenStreetMap. The rendered map has road/place geography, visible OpenStreetMap/OpenFreeMap attribution, compass and zoom controls; a farmer can pan, zoom, click to set the farm marker or drag it to refine the point. The latitude/longitude form remains the accessible fallback when WebGL2 is unavailable.

Evidence (2026-11-13): verified the style endpoint returns HTTPS `200` with public caching and CORS headers. `npm run lint`, `npm run typecheck`, `npm run test` (48 unit tests), `npm run build`, and `npm run test:e2e` (17 Playwright tests) passed. The headless test browser has no WebGL2, so it verified the fallback rather than rasterizing the basemap; real WebGL2 browsers load the external style and tiles directly.

Limitations / next: OpenFreeMap availability remains an external map dependency. The base map is used only for positioning and navigation; it does not identify farm boundaries, ownership, crops, soil, use of land or climate conditions.

## V4 — UI de demonstração enxuta

Status: complete.

Plan: remove repeated evidence-status badges and editorial caveats from the live hackathon flow while preserving the underlying evidence model, sources, validation, errors and methodology page.

Implemented: removed `supported`/`partial`/`insufficient`/`unavailable` evidence badges from crop cards, crop drawers and laboratory selections. Crop cards now focus on the crop sprite, name and purpose, restoring visual space and legibility on mobile. Removed repeated scope, suitability, talhão, scoring and recommendation caveats from explore, farm, lab and comparison screens; source details, unknown values, API/error states and the methodology remain available.

Evidence (2026-11-13): `npm run lint`, `npm run typecheck`, `npm run test` (48 unit tests), `npm run build`, and `npm run test:e2e` (17 Playwright tests) passed. Mobile deck and laboratory flows are covered by E2E after the badge removal.

Limitations / next: evidence statuses and caveats are still calculated and retained in the domain/API layers. The reusable `EvidenceStatusPill` component remains available for a future dedicated evidence view; it is intentionally absent from the demo flow.

## V3 — Atlas MapLibre local, tiles neutros e animações

Status: complete.

Plan: replace the optional externally configured style with a bundled local MapLibre base style; use the supplied neutral terrain texture and tile key as decorative coordinate-selection affordances; add reduced-motion-safe orbit, satellite and data-pulse animations. Preserve coordinate fields, do not load external tiles, and make the non-geographic status explicit.

Implemented: `/explore` now initializes a bundled, data-free MapLibre style without an environment variable or external tile provider. A local neutral texture and visible tile key make the selection surface tactile; the orbit, satellite, and pulse sprites animate around it and fall back to static art for reduced motion. The map remains only a coordinate picker: its disclosure explicitly rules out land-use, soil, climate, satellite-live or field-observation meaning. Latitude/longitude fields and examples remain fully usable.

Evidence (2026-11-13): `npm run lint`, `npm run typecheck`, `npm run test` (48 unit tests), `npm run build`, and `npm run test:e2e` (17 Playwright tests) passed. Browser inspection at 1280px and 390px verified local texture, responsive overlays and the visual disclosure; E2E checks the local canvas, animated orbit asset and either click-driven selection (with WebGL2) or the complete coordinate-entry fallback (without WebGL2).

Limitations / next: this is deliberately not a geographic basemap. It has no boundaries, roads, imagery, land cover, remote sensing layer or location lookup; an actual geographic layer requires separately authorized, attributed source data and an updated evidence policy. MapLibre requires WebGL2, so unsupported browsers receive an explicit coordinate-input fallback. The map visuals do not change NASA, ZARC, PAM, crop evidence or scenario outputs.

## V2 — Integração dos assets imersivos P0/P1

Status: complete.

Implemented: validated and published all 43 P0 and 24 P1 runtime PNGs while retaining their manifests, licenses and reproducible sources under `assets/`. Added optimized 64×64 runtime derivatives for the supplied common-bean and upland-rice art; the eight P0 crops now have dedicated sprites. The original 1254×1254 uploads remain source assets and are not shipped to the browser.

Implemented: replaced the CSS-only landing vignette with the modular farm scene and an explicit persisted day/night decorative preference. Added accessible evidence icons, equal-weight A/B/C artwork, journey icons, finite/reduced-motion-safe feedback animations, a one-time review transition, fictional technical-review character and neutral review-object icons. Visuals never modify NASA, ZARC, PAM, crop selection or evidence levels. Long crop names now use a vertical mobile card composition.

Evidence (2026-11-13): both supplied Python validators passed (43 P0 and 24 P1 assets). `npm run lint`, `npm run typecheck`, `npm run test` (47 unit tests), `npm run build` and `npm run test:e2e` (16 Playwright tests) passed. Browser verification covers explicit/persisted night theme, the two new crop sprites, reduced-motion review art and the existing end-to-end flow. Rendered inspection covered landing at 390/1440 px, the eight-crop atlas deck at 390 px and results at 390/1440 px.

Limitations / next: the neutral terrain tiles and NASA orbit/satellite sheets are published for future use but intentionally not shown as field or climate observations. Production deployment and smoke testing remain external follow-up; an authorized MapLibre style is still optional and not bundled. Scientific parameters still missing for common bean/upland rice remain `N/D`; visual assets do not close evidence gaps.

## B2 — MVP Brasil 2: oito culturas + contexto PAM

Status: complete.

Implemented: expanded the interactive P0 scope to eight crops with `common_bean` (*Phaseolus vulgaris*) and `upland_rice` (*Oryza sativa*, explicitly upland). Both retain unknown cycle, thermal, pH and Kc fields; accessible initials render until dedicated sprites arrive. Deferred/P1 crops remain outside the generator.

Implemented: added a reproducible IBGE PAM/SIDRA 5457 municipal index for the latest published year. Positive harvested area and production quantity are statistical context only. Aggregate rice and bean products carry explicit caveats. PAM never changes scenario selection, compatibility, ZARC evidence level or suitability. Automated refresh now covers IBGE geometry, MAPA ZARC and PAM.

Evidence (2026-11-13): official refresh produced 704,422 filtered ZARC source rows, 31,702 municipality/crop entries and 14,176 positive PAM municipality/product entries for PAM 2025. All 3,160 `upland_rice` ZARC entries are explicitly `Sequeiro`. `npm run lint`, `npm run typecheck`, `npm run test` (45 unit tests), `npm run build`, and `npm run test:e2e` (14 Playwright tests) passed.

Limitations: PAM does not identify a field or farming system. It aggregates paddy rice and grain beans, so it cannot validate upland rice, common bean or cowpea individually. New crop scientific parameters remain unknown. Dedicated sprites were supplied and integrated in V2.

## B1 — MVP Brasil 1: município IBGE + ZARC nacional

Status: complete.

Implemented: replaced the exact-coordinate Rio Verde regional gate with a server-only Brazilian context resolver. Coordinates are matched by bounding box plus point-in-polygon against 5,571 IBGE 2025 municipal geometries. The minimum-quality API artifact is completed with Boa Esperança do Norte from the official 2025 mesh; the two ZARC operational-area codes that are not municipalities remain explicitly unmatched. The exact Rio Verde rule remains only for the verified NASA fixture fallback.

Implemented: added reproducible `build:brazil-context` and `update:brazil-context` pipelines. The updater discovers the newest annual-safra CSV through the official MAPA CKAN package, downloads current IBGE API inputs and rebuilds temporary-source artifacts. A weekly/manual GitHub workflow runs checks and opens a reviewable PR only when data changes. The current build filters 536,728 official MAPA 2026/2027 source rows for the existing P0 scope into 23,068 municipality/crop entries, retaining source-row counts, culture names, cycle/soil/climate codes, managements, ordinances, non-zero decêndios and raw risk-code sets. Source URLs, access dates and SHA-256 hashes are embedded. The runtime never interprets those codes as probabilities and never treats absence as unsuitability.

Implemented: added `GET /api/regional-context`, municipality/ZARC provenance to `POST /api/analyze`, independent per-crop evidence levels, atlas and laboratory context loading, human-readable municipal coverage in results, source links and cache headers. National data stays in server chunks; it is not shipped in client components. Climate acquisition, regional context and agronomic evidence remain separate.

Evidence (2026-11-13): `npm run update:brazil-context` successfully discovered and rebuilt the current 2026/2027 official resource. `npm run lint`, `npm run typecheck`, `npm run test` (43 unit tests), `npm run build`, and `npm run test:e2e` (14 Playwright tests) passed during implementation. Tests cover Rio Verde, São Paulo, Salvador, the newly represented Boa Esperança do Norte, coordinates outside Brazil, invalid/missing coordinates, per-crop ZARC presence, raw-code preservation, NASA failure and mobile flows. Production build exposes `/api/regional-context`; inspection confirms the national JSON markers occur only in server chunks.

Limitations / next: municipal context does not prove the coordinate is a farm or identify a talhão. The artifact covers only existing P0 mappings and the newest annual-safra resource; perennial/olericultural/no-safra resources remain outside scope, and ruziziensis has no standalone row. Aggregation preserves unique dimension/code sets but not row-level correlations, so the app does not derive planting windows or risk percentages. Automated PRs still require normal human review before merge; PAM relevance remains later work.

## A1 — Especificação do pacote visual imersivo

Status: complete — documentation only.

Specified: a modular asset system for environment layers, NASA-to-farm narrative, provenance icons, A/B/C thumbnails, interaction feedback and journey markers. The brief defines exact filenames, dimensions, frame counts, export budgets, semantic restrictions and production priority. Existing crop sprites remain unchanged and sufficient; the minimum useful delivery is 15 files covering evidence, scenarios and the farm environment.

Evidence (2026-11-12): specification reconciled with the current routes, ten existing 64×64 RGBA crop sprites, gamification documents and scientific-scope rules. No runtime, scientific data or user flow changed; automated application checks were therefore not rerun.

Limitations / next: visual assets still need original production, licensing metadata and integration review at 390 px/1440 px. Any weather or field-state art must remain decorative or be rendered only beside its actual source data.

## U1 — Fluxo responsivo e contexto Brasil

Status: complete.

Implemented: replaced the invalid “validated locally” promise with global exploration contextualized by Brazilian sources, while preserving Rio Verde ZARC as exact-pilot regional evidence only. Added a clearly fictional one-click Brazil demo, consistent desktop/mobile navigation, localized journey labels, compact expandable farm history, explicit draft status, reusable crop sprites, distinct A/B/C crops when evidence permits, mobile comparison tabs, collapsible laboratory editing and a final decision-handoff summary. Raw validation IDs and missing-data tokens now have human-readable labels.

Evidence (2026-11-12): `npm run lint`, `npm run typecheck`, `npm run test` (35 unit tests), `npm run build`, and `npm run test:e2e` (13 Playwright tests) passed. E2E covers the mobile menu, one-click demo, compact farm validation, keyboard laboratory editing, NASA failure, provenance and mobile A/B/C comparison. Final rendered-screen review covered home, farm, laboratory and results at 390 px and 1440 px; the six-pillar re-audit scored 23/24.

Limitations / next: Brazilian provenance is not national agronomic applicability; the regional ZARC package remains restricted to the exact Rio Verde pilot coordinate, and `locally_validated` remains unavailable. A truly immersive final art direction still depends on an intentional terrain/farm-state asset pack; sprites support crop recognition but do not replace field-state visuals. No scientific measurement, calendar or suitability rule was added.

## R1 — Revisão de UX, valor e estratégia de competição

Status: complete — audit only; no runtime behavior changed.

Reviewed: compared the flow at `ceb05f8` with `3652658`, inspected current desktop/mobile renders across landing, farm, laboratory and results, scored the UI against six pillars, evaluated producer value against implemented evidence, and mapped the project to the current NASA Space Apps Field Shift challenge and global award positioning. The review identifies a plausible but unvalidated value hypothesis, recommends extension workers/agronomists with producers as the first user, and provides a 3-minute pitch narrative plus prioritized competition roadmap.

Artifacts: `docs/UI-REVIEW.md` and `docs/UX_VALUE_HACKATHON_REVIEW.md`.

Evidence (2026-11-12): local rendered screenshots at 1440 px and 390 px, current code/contracts/tests, Git diff, official NASA Space Apps challenge and awards pages. No scientific data, app logic or validation claim was added.

## P0 — Clareza da fazenda e linguagem visual agrícola

Status: complete.

Implemented: the farm timeline now presents each date as a month/year input with local, Portuguese validation and focus on the first invalid control. Saving is split into explicit actions: `Salvar rascunho` remains on the page and confirms the local save with its time; `Salvar e ir ao laboratório` saves first and then opens the lab with a visible handoff confirmation. Crop cards have larger sprites, taller touch targets and compact evidence labels; the global visual language now uses forest, soil and crop tones with larger default small-text rendering.

Evidence (2026-11-12): `npm run lint`, `npm run typecheck`, `npm run test` (35 unit tests), `npm run build`, and `npm run test:e2e` (12 Playwright tests) passed. E2E covers the inline month-error message, saved-without-navigation feedback, saved-and-continue confirmation, overlap error and 375px draft migration.

Limitations / next: the interface is clearer and more agricultural in palette, but a final immersive release still needs an intentional asset/art direction pass (terrain, farm-state and interaction sprites) after a product-level visual brief. This P0 does not change the evidence model, agronomic constraints, local-only storage or exploratory disclaimer.

## P1 — Orientação contínua da jornada

Status: complete.

Implemented: added a responsive route-progress trail for Explorar → Minha fazenda → Laboratório → Comparar, with the current step programmatically identified without falsely marking prior steps as complete. Primary navigation now exposes its active route. The existing save/continue handoff remains explicit, so the user can understand both the current screen and the next action without being pushed through a blocking wizard.

Evidence (2026-11-12): `npm run lint`, `npm run typecheck`, `npm run test` (35 unit tests), `npm run test:e2e` (12 Playwright tests), and `npm run build` passed. Browser coverage asserts the active exploration step.

Limitations: route progress communicates orientation only; it does not claim that a farm, laboratory plan or agronomic comparison is complete. This keeps missing evidence and local-first drafts visible rather than gamifying them as achievements.

## P2 — Atmosfera agrícola e feedback de exploração

Status: complete.

Implemented: created a decorative, CSS-built field vignette for the landing experience using the existing crop sprites. It is explicitly visual-only and carries no crop, yield, location or field-observation claim. The laboratory now gives a short visual acknowledgement when a crop slot changes; the interaction respects `prefers-reduced-motion`. Existing six P0 crop sprites remain sufficient for the MVP because they identify the selectable crops; no extra pseudo-scientific terrain or crop-state asset was introduced.

Evidence (2026-11-12): the same full validation suite passed. Playwright confirms the decorative vignette renders and that selecting a laboratory crop produces visible slot feedback.

Limitations / future art direction: a branded production release could commission original environment, weather-state and interaction art under a documented visual brief. Such assets must remain clearly decorative unless tied to a verified data source.

## S0 — Foundation

Status: complete.

Scope: Next.js foundation, strict TypeScript, Tailwind, base UI, schemas, navigation, i18n structure, and test configuration. No NASA or agronomic data is included.

Evidence (2026-11-12): `npm run lint`, `npm run typecheck`, `npm run test` (3 unit tests), and `npm run build` passed. Production build uses `next build --webpack`: the default Turbopack build cannot spawn a PostCSS child process in this sandbox (`Operation not permitted`), while the Webpack production build completed successfully.

Limitations: Playwright configuration and one navigation smoke test exist, but `npm run test:e2e` cannot launch because the Chromium executable is not present in the local Playwright cache. Run `npx playwright install chromium` in a network-enabled environment before treating E2E as green. The workspace was supplied without Git metadata, so the requested `sprint-0-foundation` commit was not created. No climate service, fixture, crop catalog, local storage, wizard implementation, or recommendation engine exists yet.

Next: S1 — NASA POWER adapter, provenance contract, verified Rio Verde fixture only if it can be obtained from the live API, and climate indicators.

## S1 — NASA & provenance

Status: complete — Gate A passed.

Implemented: NASA POWER Daily Point URL contract for `community=AG`, UTC, 2011-01-01 through 2025-12-31, seven requested parameters; normalization of sentinels/nulls/out-of-range values; unit warnings; variable coverage and missing-day provenance; monthly climatology and precipitation-window aggregation; `/api/climate` validation, timeout, HTTP cache directive, rate limit, and recoverable errors. The fixture collector writes raw response plus URL, timestamp, coordinate/period, timezone, and SHA-256 only after a successful response and required parameter check. Fallback only accepts a SHA-valid Rio Verde fixture for precisely matching pilot coordinates.

Evidence (2026-11-12): `npm run lint`, `npm run typecheck`, `npm run test` (7 tests), and `npm run build` passed. Unit coverage includes URL contract, sentinel/null handling, precipitation coverage, and fixture-coordinate isolation.

Gate A evidence: a verified Rio Verde fixture is now present at `data/nasa-power-rio-verde.json` (5,479 daily records), with SHA-256 `11a3b46a05dbfba06798bb629e8872e1ffc16ff0e2d6c36dddf71aae3c6adac9`. Its sidecar identifies the full NASA POWER URL, capture timestamp `2026-11-12T13:52:33.656Z`, exact coordinates/period, UTC, and response units (`C`, `mm/day`, `%`, `m/s`, `MJ/m^2/day`). The fixture test verifies its hash, coverage, units, and pilot-only scope. No fixture is used for different coordinates.

Remaining environment limits: live NASA DNS currently returns `EAI_AGAIN`; local endpoint runtime cannot be HTTP-tested because the sandbox blocks port binding (`EPERM`); E2E remains blocked by the missing Chromium executable. The workspace remains without Git metadata, so no `sprint-1-nasa` commit was created.

Next: S2 — catalog of 10 species, source/status-aware records, five-step wizard, validated inputs, versioned local draft, and responsive UI. No engine or regional recommendation logic before S3.

## S2 — Catalog & wizard

Status: complete — reduced scientific scope.

Implemented: catalog with the 10 specified stable IDs, taxonomy, source links, evidence status and explicit nulls; no missing property is coerced to zero. The five-step responsive wizard collects global/pilot coordinates, three chronological crop events, optional partial soil observations with origin, priorities, irrigation, and explicit baseline confirmation; it validates with Zod, supports a versioned local browser draft, restore and clear actions. Historical overlap and reverse dates are blocked.

Evidence (2026-11-12): `npm run lint`, `npm run typecheck`, `npm run test` (11 tests), and `npm run build` passed. Catalog tests prove exactly ten species and preserved missing fields; input tests cover partial soil and overlapping chronology. Official sources identified include MAPA ZARC Goiás and Embrapa records for cowpea, millet, ruziziensis/cowpea, sunn hemp, and pigeon pea.

Limitation: source discovery alone is not sufficient to enter cycle, temperature, pH, Kc, calendar, or residue values. The original eight-P0 scope was reduced: only soybean, maize, sunflower and grain sorghum have verified Rio Verde ZARC segments; the remaining P0 crops are display-only. No crop is recommendation-eligible until S3 rules establish complete requirements. Browser E2E/mobile verification remains unavailable because Chromium is absent. Git is not configured, so no `sprint-2-catalog-wizard` commit exists.

Next: S3 may use only the four audited pilot candidates and must surface unavailable alternatives where evidence is insufficient.

Audit update: the user supplied the official Rio Verde study locally. Tables 1, 2, 4 and 5 were visually inspected and six explicit ≤20% rainfed ZARC segments were recorded for soybean, maize, sunflower and grain sorghum. The study does not cover cowpea, pearl millet, ruziziensis or sunn hemp, which retain no regional window. Evidence report and validation tests were updated; lint, typecheck, 13 unit tests and production build passed.

## S3 — Decision engine

Status: complete — evidence-limited mode.

Implemented: pure `validateInputs`, `evaluateConstraints`, `generateCandidates`, `computeMetrics`, `rankCandidates`, `explain`, plus `POST /api/analyze`. Outside Rio Verde, output is climate-only. Inside pilot, baseline is explicit or marked presumed. Alternatives B/C are unavailable with source-linked limitation until validated regional templates exist; no NPK, yield, irrigation need, or numeric score is fabricated.

Evidence: lint, typecheck, 17 unit tests and build passed. Tests cover global climate-only scope, assumed baseline and unavailable alternatives.

Limitation: four audited ZARC crops alone do not prove a defensible coverage/soil or lower-water comparative template. Git unavailable; no `sprint-3-engine` commit.

Next: S4 — visual assets, result presentation, a11y and responsive states without changing engine logic.

## S4 — UI

Status: complete — evidence-limited mode.

Implemented: supplied sprites copied to `public/assets/crops`, responsive accessible CropCards, explicit visual-only pixel-art use, and results catalogue that labels pending evidence/non-eligibility rather than fabricated status bars.

Evidence: lint, typecheck, 17 unit tests and build passed.

Limitation: no three-strategy comparator/timeline is rendered because B/C have no defensible candidate timeline. UI does not alter engine logic. Next: S5 verification/docs/ship checklist.

## S5 — Verification & ship

Status: partial — external deployment and scientific-template limits.

Implemented: METHOD, SOURCES, VALIDATION, DEMO_SCRIPT and delivery checklist. Chromium installed; Playwright navigation E2E now passes.

Evidence: lint, typecheck, 17 unit tests, Playwright E2E and production build passed.

Remaining: public Vercel URL requires the user's Vercel project/account authority. Three defensible alternatives remain unavailable because validated regional templates/rules do not exist; application shows that limitation instead of fabricating rotations. No field validation claim is made.

### S5 closure update — 2026-11-12

Implemented: the exploration wizard now saves a validated local draft and opens `/results`; results call `POST /api/analyze` and render climate-only scope, presumed baseline, unavailable alternatives, limitations, certainty and source references. The methodology route now describes the actual NASA/fixture, scope, baseline, unavailable-score and non-calculation behavior. Crop evidence is normalized into per-parameter records with value, unit, context, cultivar, location, year, URL, page/section, excerpt and verification state. The audit matrix no longer reports verified Rio Verde ZARC data as `null`.

Evidence: `curl -I https://nasa-2026-one.vercel.app/` returned `HTTP/2 200`; `npm run lint`, `npm run typecheck`, `npm run test` (18 tests), `npm run build`, and `npm run test:e2e` all passed locally.

Limitations: deployment HTTP check predates this local update; push and Vercel deployment verification are still required. The scientific gap remains material: no validated Rio Verde templates for B/C, no stage-equivalent Kc/ET0, and no Rio Verde calendar for cowpea, pearl millet, ruziziensis or sunn hemp. Partial non-local evidence must not be promoted to regional eligibility. No field validation claim is made.

Deployment update: direct production deployment `dpl_8eZMn8jao9sya15z9A8fEYvPN7QA` reached `Ready` on 2026-11-12. Aliases include `https://nasa-2026-one.vercel.app`. Production `POST /api/analyze` returned `pilot_recommendation`, two unavailable alternatives and three null scores for a pilot input, matching evidence-limited behavior.

Next: obtain/review primary regional evidence before changing S3 availability; configure GitHub HTTPS authentication before pushing local commits through `origin`.

### Scientific-data update — 2026-11-12

Implemented: imported the supplied official MAPA Tábua de Risco 2026/2027 CSV through a reproducible extractor. `data/rio-verde-zarc.json` now has 117 verified Rio Verde/GO rainfed rows for soybean, maize, grain sorghum, sunflower and cowpea, including ZARC culture, safra, cycle group, soil code/name, portaria and raw non-zero decêndio values. Thirty maize–brachiaria consortium rows are system evidence, not a standalone ruziziensis calendar. Source URL, access date and CSV SHA-256 are stored; the 244 MB input CSV is ignored by Git.

Implemented: `crop-evidence.json` now carries institution and access date on every record. The 16 supplied-matrix additions remain `not_verified` until their primary page/section is checked; experimental pH values are not projected into crop suitability. The engine reads the new ZARC extraction only to identify audited crops; it does not interpret raw risk codes or generate regional alternatives.

Evidence: official MAPA dataset and data dictionary inspected on 2026-11-12. `npm run typecheck` and `npm run test` passed (19 tests).

Limitations / next: verify the numeric legend behind risk codes; verify all 16 primary sources/page sections; define and test pilot-compatible regional strategy templates before enabling B/C. Run lint, build and E2E after this update, then commit.

## S6 — Global exploratory scenarios

Status: complete.

Implemented: replaced the regional binary block with three global 24-month exploratory scenarios (A/B/C) and evidence levels `climate_exploration`, `regionally_contextualized`, and reserved `locally_validated`. A is the confirmed plan or explicit presumed continuation. B deterministically uses only P0 catalogued cover crops and prefers a different last-crop family. C requires a documented thermal range and likewise prefers a different family. No scenario invents cycle length or dates: it displays the selected planting month and unknown duration.

Implemented: added validated `plantingMonth` (1–12); shared NASA POWER/verified-fixture climate resolution between `/api/climate` and `/api/analyze`; normalized monthly climatology, historical monthly precipitation, provenance, coverage and gaps. NASA failure outside Rio Verde returns A/B/C with climate metrics unknown and a visible gap; the Rio Verde fixture remains exact-coordinate only. Rio Verde ZARC makes only matching crops `regionally_contextualized`, preserves raw codes without percentages, and never emits `locally_validated`.

Implemented: replaced numeric scores with qualitative thermal, historical-precipitation, cover, diversity and pH-context indicators. Priorities highlight indicators only and cannot select crops or fabricate a score. Results UI now renders all three columns globally, climate/provenance state, evidence level, unknowns, source-linked explanations and the exploratory-not-recommendation disclaimer. Wizard includes the common planting-month selector. METHOD, demo script and project spec were updated.

Evidence (2026-11-12): `npm run lint`, `npm run typecheck`, `npm run test` (21 unit tests), `npm run build`, and `npm run test:e2e` (2 Playwright tests) passed.

Limitations: catalog evidence still leaves many agricultural attributes unknown. No ET0/ETc, Kc, water demand, irrigation need, yield, NPK/SOC change, calendar, local validation or recommendation is calculated. Live NASA availability was not assumed; the compatible verified pilot fixture is the only fallback. `locally_validated` remains a type reserved for traceable future field/human validation.

## S7 — Baseline intent, climate display and boundary checks

Status: complete.

Plan: make the producer baseline genuinely editable without inventing dates; expose monthly climate context accessibly; verify the public analysis boundary under NASA failure; audit available crop evidence without promoting unsupported values.

Implemented: the wizard now records a confirmed baseline crop as intentional future input, or retains the explicit presumed continuation. The baseline contract intentionally has no dates/cycle; results continue to show the selected planting month and unknown duration. Results now render an accessible 12-month NASA temperature climatology bar panel and retain the selected-month historical precipitation, provenance and limitations.

Implemented: route tests mock climate acquisition and prove `POST /api/analyze` returns A/B/C with unavailable climate rather than failing, while invalid input returns 422 before climate resolution. `docs/CROP_EVIDENCE_AUDIT.md` audits 37 evidence records (21 verified, 16 not verified) and documents precisely which P0 fields remain unknown; no new agronomic value, calendar, Kc calculation or eligibility was invented.

Evidence (2026-11-12): `npm run lint`, `npm run typecheck`, `npm run test` (24 unit tests), `npm run build`, and `npm run test:e2e` (2 Playwright tests) passed.

Limitations / next: deployment of this commit requires Vercel project authority and a production smoke test. Future scientific work must verify missing primary records before any expansion of suitability indicators. The product still does not calculate ET0/ETc, crop water demand, irrigation, yield, nutrient change, local calendars or field validation.

## S8 — Evidence review and inspectable exploration

Status: complete.

Scope: implement remaining steps 2–6 while Vercel builds independently: review primary crop evidence; enable result-page baseline edits; expose sources/provenance; extend browser coverage; preserve non-calculation guardrails.

Implemented: primary-source review promoted only five cultivar-specific statements to verified evidence: BRS 310 grain sorghum flowering/maturity/disease response and BRS 323/BRS 422 sunflower physiological maturity. Page/section and excerpts were corrected from the primary Embrapa sources. These records remain cultivar-specific and do not become a universal calendar, Rio Verde rule or new scenario eligibility. The remaining 11 were reviewed: three Embrapa URLs returned 403, one cowpea pH item has no primary URL, and the cited ILPF page does not contain the claimed ruziziensis details; all remain excluded. The evidence audit now records 26 verified and 11 unverified records.

Implemented: results include native accessible drawers for climate provenance and per-scenario sources. The baseline scenario now links to `/explore?edit=baseline`; the wizard restores the saved draft directly to review, preserves the selected crop and allows resaving without adding dates/cycles.

Implemented: browser coverage now checks source/provenance drawer behavior, keyboard activation of baseline editing, confirmed baseline persistence, narrow-mobile A/B/C stacking, and global NASA-failure UI. The analysis-route boundary test additionally asserts public output does not expose numeric score, yield, ETc or irrigation-need fields and never emits `locally_validated`.

Evidence (2026-11-12): `npm run lint`, `npm run typecheck`, `npm run test` (24 unit tests), `npm run build`, and `npm run test:e2e` (4 Playwright tests) passed.

Limitations: 11 evidence records remain unverified; they are not projected into runtime compatibility. The product remains exploratory: no ET0/ETc, irrigation, yield, nutrient, universal calendar, local recommendation or local validation is calculated. Vercel deployment status was intentionally not changed while an external deployment is building.

## G0 — Auditoria de migração Field Shift 2.0

Status: complete.

Implemented: audited the existing routes, wizard, results UI, pure engine, NASA resolver, catalog/evidence records, local draft, region/ZARC conditions and regression tests. Wrote `docs/GAMIFICATION_MIGRATION.md` with the component/file map, geographic-condition audit, MapLibre client-only decision, authorized-tile fallback rule, V1→V2 draft migration plan, evidence-coverage design, risk register and G1–G5 test plan. No production UI, engine, scientific data or API behavior was changed.

Evidence (2026-11-12): baseline `npm run lint`, `npm run typecheck`, `npm run test` (24 unit tests), `npm run build`, and `npm run test:e2e` (4 Playwright tests) passed.

Limitations / next: G1 requires a separately approved MapLibre dependency and an authorized public map-style URL before tiles are enabled. Coordinate entry remains the mandatory fallback. ZARC stays Rio Verde-only contextual evidence; global NASA availability does not establish local crop suitability. Do not begin G1 until requested.

## G1 — Atlas global

Status: complete.

Plan: install only MapLibre GL; make `/explore` an atlas client-only; keep coordinate selection as a fully usable fallback when no authorized map style exists; reuse the existing climate endpoint; preserve the old form under `/farm` until G3.

Implemented: added `maplibre-gl`, `WorldMap`, `LocationExplorer`, typed atlas/API response contracts and `.env.example`. With `NEXT_PUBLIC_MAP_STYLE_URL`, the map supports click selection, a draggable marker and provider attribution. Without it, the page intentionally shows an accessible no-tiles state while latitude/longitude selection, examples and NASA climate lookup remain fully functional. The atlas offers Rio Verde, Accra and New Delhi examples; each is only a coordinate example, not a recommendation. The selected location transfers to `/farm` by query parameters and local browser state.

Implemented: panel shows NASA loading, recoverable error/retry, source, period, variable coverage and January point climatology; it does not show synthetic raster/heatmap, crop suitability or land-use claims. Rio Verde's exact-coordinate fixture rule is unchanged. Results baseline editing now correctly targets `/farm` after the route split.

Evidence (2026-11-12): `npm run lint`, `npm run typecheck`, `npm run test` (27 unit tests), `npm run build`, and `npm run test:e2e` (6 Playwright tests) passed. E2E covers no-style fallback, Brazil/Ghana/India selection, transfer to farm and retryable NASA failure.

Limitations / next: a real tile map needs a user-supplied, authorized `NEXT_PUBLIC_MAP_STYLE_URL`; this repository ships none and loads no public OSM tiles. G1 does not classify land/ocean because no land-use dataset exists. G2 should add crop deck/cards and pure evidence-coverage statuses without promoting Brazilian evidence to global suitability.

## G2 — Deck de culturas e evidência

Status: complete.

Implemented: added the six P0 crop deck to the global atlas, with pixel sprites, keyboard-operable cards, an accessible details dialog, explicit `N/D` values and source links. `evidenceCoverageAssessment` is a pure boundary: P0 crops are `insufficient_evidence` globally and only `partial` when an exact Rio Verde ZARC record exists. It never states that a crop is suitable for a coordinate; ZARC raw codes remain context, not percentages.

Evidence (2026-11-12): `npm run lint`, `npm run typecheck`, `npm run test` (31 unit tests), `npm run build`, and `npm run test:e2e` (6 Playwright tests) passed. Tests cover the exact six P0 IDs, non-pilot unknown evidence, Rio Verde partial context, preserved nulls, keyboard opening and source detail access.

Limitations / next: the cards expose only documented catalog values and provenance; they do not infer calendars, Kc, crop water demand, irrigation, yield, soil suitability or local validation. G3 replaces the retained `/farm` wizard with a local-first timeline and a non-destructive V1-to-V2 draft migration.

## G3 — Linha do tempo da fazenda

Status: complete.

Implemented: replaced the retained `/farm` wizard with a responsive, local-first three-event timeline. Each event selects only the six P0 cards or an explicit “other crop” label, then records start/end month. The view retains optional pH/origin, irrigation, priority sliders, shared planting month and optional producer baseline; it does not invent cycle dates. Zod remains the single validation boundary and prevents reverse or overlapping events before a save.

Implemented: draft persistence now writes V2. A valid V1 draft is read and projected to V2 in memory without overwriting the local V1 record; valid analysis data remains intact and unknown V1 root/data fields are carried in `legacy` when the user explicitly saves. Clearing still asks for confirmation. No server storage was added.

Evidence (2026-11-12): `npm run lint`, `npm run typecheck`, `npm run test` (33 unit tests), `npm run build`, and `npm run test:e2e` (8 Playwright tests) passed. Browser coverage proves V1-to-V2 save at 375px, other-crop entry and an overlap rejection.

Limitations / next: P0 selection is an interaction constraint, not a suitability claim; historical labels may still be any explicit user-provided other crop. The timeline stores local observations only. G4 can build experimental scenario slots only on the existing pure engine/evidence boundaries.

## G4 — Laboratório de rotações

Status: complete.

Implemented: added `/lab` with three editable A/B/C hypothesis boards, four neutral slots per scenario (two years × Temporadas A/B), P0 deck, evidence labels and an accessible keyboard-operable crop selection dialog. A slot is only a user hypothesis: no crop cycle, regional calendar, rainfall season, score or rotation duration is inferred. Empty slots remain `N/D`.

Implemented: introduced a validated `labPlan` inside the local V2 draft. The laboratory starts from the existing engine's proposed crop for the first slot only; it never creates a full fictional rotation. The API and pure engine accept that optional plan and recalculate only existing qualitative indicators for the selected first crop. Missing slots explicitly make the comparison partial.

Evidence (2026-11-12): `npm run lint`, `npm run typecheck`, `npm run test` (35 unit tests), `npm run build`, and `npm run test:e2e` (9 Playwright tests) passed. Unit coverage verifies 3×4 slot structure, no score field and engine reuse; E2E verifies keyboard dialog selection.

Limitations / next: a slot does not establish an agronomic sequence or local feasibility. G5 will make the result comparison explicitly table-oriented and partial, connect navigation/methodology, and add final desktop/mobile flow coverage.

## G5 — Comparação e QA

Status: complete.

Implemented: results now begin with a semantic, horizontally scrollable criteria table for A/B/C and a clear partial-comparison disclosure. Priority weights only highlight table cells; no aggregate score/ranking is rendered. Scenario panels retain drill-down explanations, risks/limitations, source drawers, climate provenance, unknowns and links back to lab/farm. The selected laboratory plan is sent through the validated analysis boundary.

Implemented: connected navigation across Explore → Farm → Laboratory → Compare → Methodology, added localized dictionary labels for the new navigation, updated landing CTAs, in-app methodology, `docs/METHOD.md` and the demo script. The methodology now distinguishes neutral lab slots from an agricultural calendar and explains why comparison remains partial.

Evidence (2026-11-12): `npm run lint`, `npm run typecheck`, `npm run test` (35 unit tests), `npm run build`, and `npm run test:e2e` (10 Playwright tests) passed. Browser coverage includes full lab-to-results navigation, keyboard slot editing, source/provenance, NASA failure, global examples and a 375px horizontally scrollable comparison table.

Limitations: the app remains pt-BR-first; the existing English dictionary is structural and not a runtime language switch. No laboratory slot is a verified rotation sequence, calendar, recommendation, score, yield, irrigation requirement or local validation. No deployment action was taken.

## NI-1 — NASA Insight causal

Status: complete.

Implemented: added a twelve-month historical precipitation lookup and a pure NASA Insight derivation that traces monthly NASA temperature through each proposed crop's documented thermal range. The output distinguishes a real A/B/C contrast, a shared signal, precipitation-only observation, and unknown evidence. It includes period, coverage, source, rule IDs, crop ranges, limitations, and scenario effects. The selected planting-month insight and all twelve exploratory months now travel in the public analysis result.

Implemented: added a responsive, bilingual NASA Insight panel above the comparison. Users may explore another month without changing crops, priorities, evidence levels, or the saved draft. The panel exposes the NASA observation, rule, per-scenario state, limitation, and direct source link. Historical precipitation is never converted into water demand, suitability, irrigation need, score, or recommendation.

Tests added: deterministic contrast from documented thermal ranges; precipitation-only degradation; NASA-unavailable degradation; twelve-month precipitation summaries; and browser coverage for the interactive month selector.

Evidence (2026-11-13): `npm run lint`, `npm run typecheck`, `npm run test` (52 unit tests), `npm run build`, and `npm run test:e2e` (17 Playwright tests) passed. Browser coverage verifies that the panel renders from the real analysis boundary, changes month interactively, and states that this exploration cannot mutate cultures or the saved draft.

Limitations / next: NASA Insight compares monthly median daily temperature with documented crop ranges; it is not causal inference, a forecast, or field validation. It does not use precipitation to judge crops. Future refinement may add historical distribution bands only after their semantics and labels are documented.

## LE-1 — Feedback imediato e Centro de Evidências

Status: complete.

Implemented: extracted the qualitative crop indicators into one pure shared function and added per-slot assessments for all A/B/C laboratory sequences. Slot 1 compares family with the last historical event; later slots use only the immediate predecessor, so an empty predecessor remains `unknown`. Results now expose all four neutral slots and configured-slot count while retaining the first configured crop only as a visual summary.

Implemented: the laboratory obtains analysis context once, then recomputes edits locally with the same engine. Each change shows a compact before/after delta, up to three changed indicators, persistent evidence gaps, a filtered evidence action and one-step undo. No change is called better/worse and no score, ranking or new NASA request is introduced.

Implemented: added an API-authored evidence manifest and responsive Evidence Center drawer/bottom sheet. It deduplicates NASA, farmer, catalog and ZARC/IBGE layers; traces summary and slot claims to rule/source IDs; groups gaps; exposes guardrails; supports scenario/slot/indicator filtering; traps keyboard focus, closes with Escape and restores focus. Repeated evidence badges remain absent.

Tests added: immediate-predecessor semantics, gap preservation, before/after delta without improvement language, source deduplication, claim traceability, guardrails, filtered drawer, undo, focus restoration and matching four-slot results.

Evidence (2026-11-13): `npm run lint`, `npm run typecheck`, `npm run test` (55 unit tests), `npm run build`, and `npm run test:e2e` (17 Playwright tests) passed. Browser coverage verifies immediate feedback, filtered evidence, one-step undo, Escape close, focus restoration and the results Evidence Center. React review found and corrected one render-time ref mutation before the final green lint.

Limitations / next: slot assessment remains exploratory and uses one common planting-month climate window; neutral seasons are not an agricultural calendar. Source/gap counts are navigation summaries, never confidence scores. Full core-flow English translation remains broader than this sprint.

## P1 — Internacionalização e entrega operacional

Status: partial — local implementation complete; external credentials/evidence required.

Implemented: added a persistent pt-BR/en locale provider and accessible language selector. Navigation, landing and methodology now switch at runtime and retain the selected language in browser storage. Removed the unused legacy `ExploreWizard`; `/farm` remains the sole farm flow. Updated README with the authorized MapLibre-style and Vercel deployment contract.

Evidence (2026-11-12): `npm run lint`, `npm run typecheck`, `npm run test` (35 unit tests), `npm run build`, and `npm run test:e2e` (11 Playwright tests) passed. E2E proves English selection persists after reload and changes landing/methodology content.

External blockers: no authorized `NEXT_PUBLIC_MAP_STYLE_URL` was supplied, so coordinate fallback remains the only shipped map mode. GitHub remote access cannot authenticate (`could not read Username`); Vercel CLI is not installed/authenticated. No crop evidence was promoted because no new primary source was supplied or verified. These are intentionally not replaced with placeholders, public tiles, credentials or inferred agronomic data.

### Evidência adicional — 2026-11-12

Reviewed the currently linked Embrapa BRS Guariba page directly and promoted only two existing cultivar-specific records: maturity cycle (65–70 days) and the stated disease-response profile. The source page/section and quote are now recorded; runtime does not use the disease claim and does not project either record into a Rio Verde calendar, global suitability, irrigation rule, score or validation. The evidence audit is now 28 verified / 9 unverified records. Lacking map authorization, GitHub/Vercel credentials and further verified primary evidence remain external blockers.

## P1-UX — Clareza, entrega e higiene

Status: implementation complete; production verification pending push.

Implemented: reduced Results density through progressive disclosure, removed repeated scenario artwork/source blocks, centralized provenance in the Evidence Center and added a Markdown technical-summary export. Evidence scopes, claim states and validation levels now have readable pt-BR/en labels. Explore and Results primary copy switch with the persistent locale. Methodology now explains each of four bases as origin, use and non-claim, followed by the three deterministic engine steps.

Implemented: added privacy-preserving local journey metrics for visits, successful comparison count and last completion duration. No analytics service, identifier or network request was added. Moved the TypeScript incremental cache to `.next/cache`, ignored `*.tsbuildinfo`, preserved `fieldshift_gamification_codex`, and added a repeatable Chromium visual-review script.

Visual evidence (2026-11-13): inspected full-page Chromium captures for Farm, Results and Methodology at 390×844 and 1440×900. Results are readable and progressively disclosed in both layouts. Farm remains the highest-friction step because three historical events are mandatory; reducing the contract to one required plus two optional events is a product decision for the next sprint.

Checks before commit: `npm run lint`, `npm run typecheck`, `npm run test` (56 unit tests), `npm run build`, and `npm run test:e2e`. Final counts and production validation are recorded after the final gates.

Limitations / next: the engine-generated agronomic explanation text is still authored in pt-BR, so English core navigation and primary instructions do not yet translate every evidence sentence. Local metrics measure this browser only. No scientific value, recommendation or validation level changed.

## P1-UX2 — Histórico progressivo e tradução integral da jornada

Status: complete.

Implemented: changed the validated history contract from exactly three events to one through three. Farm begins with one required event and offers explicit add/remove actions for two optional events. Chronology, overlap detection, “other crop,” local draft restoration and existing three-event drafts remain supported. No missing history is fabricated.

Implemented: completed the English presentation layer across Atlas crop cards/details, Brazil context, Farm, Laboratory, NASA Insight, comparison indicators, decision handoff, regional technical details and Evidence Center claims. Scenario, crop, indicator and explanation texts are localized semantically at presentation time while engine rules and identifiers remain stable.

Tests added: schema boundaries for 0/1/3/4 history events; browser add/remove/save behavior for the optional history; and an English Farm → Laboratory → Results flow that rejects Portuguese primary UI leakage.

Visual review: production-build captures at 390×844 and 1440×900 use a one-event draft and confirm reduced Farm height, visible “Add event” affordance, readable controls and unchanged Results hierarchy.

Limitations: third-party/source-authored proper names and raw rule IDs remain unchanged by design. Existing saved drafts are not rewritten until the user explicitly saves. No deployment or push was performed; the user will send the verified commits to Vercel.

## NASA-W1 — Contexto hídrico multissensor

Status: complete.

Implemented: extended the existing credential-free NASA POWER request with `IMERG_PRECTOT` and `GWETROOT`, after validating both parameters, units and a complete 2011–2025 Rio Verde request against the live service. Daily normalization now preserves GPM IMERG precipitation and modeled relative root-zone wetness independently, including per-variable coverage and null/sentinel handling. The verified legacy Rio Verde fixture remains immutable and valid; because it predates these parameters, enhanced indicators correctly remain `unknown` during fallback.

Implemented: added pure monthly water-context indicators: GPM monthly total, median count of days with recorded rainfall, and median relative root-zone wetness. Results expose these alongside historical precipitation and the already available median minimum/maximum air temperatures. The comparison now includes rainfall distribution and root-zone wetness for A/B/C. Water priority highlights root-zone context but does not select, replace, rank or score crops. Methodology, project specification, sources, validation rules and bilingual UI explain that these are regional historical grids—not field moisture, crop demand, drought tolerance, forecast or irrigation advice.

Evidence (2026-11-13): the full nine-parameter live NASA request returned HTTP 200 with 809,637 bytes in 2.96 seconds. `npm run lint`, `npm run typecheck`, `npm run test` (60 unit tests), `npm run build`, and `npm run test:e2e` (19 Playwright tests) passed. New unit coverage verifies URL parameters, GPM rain-day calculation, root-zone median and absence-preserving fallback behavior.

Limitations / next: `GWETROOT` is a POWER/MERRA-2 modeled relative wetness index, not SMAP volumetric soil moisture or a talhão measurement. Direct SMAP ingestion would require an authenticated/preprocessed Earthdata pipeline and is intentionally not simulated. ECOSTRESS/Landsat field-scale layers remain out of scope until the product has an explicit farm polygon and a defensible cloud/coverage workflow. No deployment or push was performed.

## NASA-W2 — Atlas SMAP e demonstração global

Status: complete.

Implemented: recaptured the verified Rio Verde NASA POWER fixture with all nine runtime parameters. The new sidecar records the exact URL, UTC period, capture timestamp, units and SHA-256 `6d317f61771a84149464b9b0313aa3a2edc34900ac1502306434d0e779295142`; parsing proves 100% coverage for `IMERG_PRECTOT` and `GWETROOT`. The fixture remains exact-coordinate only.

Implemented: renamed public scenario C from “Resiliência hídrica” / “Water resilience” to “Contexto hídrico” / “Water context” across engine, laboratory and presentation. Crop selection remains deterministic and unchanged; the new title avoids claiming lower water use, drought tolerance or superior performance.

Implemented: added an on-demand global NASA comparison for Rio Verde, Accra and New Delhi. Each card calls the climate boundary for its own coordinate and compares the same January temperature, monthly rain, IMERG rain-day and root-zone-context fields. A failed location shows unavailable rather than receiving another location's value. Historical monthly totals are rounded to two decimals at the pure median boundary.

Implemented: added an opt-in NASA SMAP L4 analyzed root-zone soil-moisture layer from public EOSDIS GIBS, pinned to 2025-06-30 with official metadata, 9 km/model-value-added labeling, source attribution and a compact accessible color scale. Added user-drawn exploratory polygons with three-or-more-point fill/outline and local-browser handoff. Polygon and raster are visual context only: neither enters analysis nor establishes ownership, agricultural land use, field identity or local validation.

Evidence (2026-11-14): verified official GIBS layer metadata/capabilities and a live Rio Verde tile (`HTTP 200`, PNG). `npm run lint`, `npm run typecheck`, `npm run test` (62 unit tests), `npm run build`, and `npm run test:e2e` (20 Playwright tests) passed during implementation. E2E covers SMAP disclosure, exploratory drawing when WebGL is available, and independent three-region comparison. Production-build screenshots were reviewed at 390×844 and 1440×900; the fallback remains usable where WebGL is unavailable.

Limitations / next: GIBS supplies a dated visual raster, not a numeric field sample or current talhão condition. The exploratory polygon is not yet part of the validated farm-analysis contract and is intentionally ignored by the engine. A future numeric SMAP pipeline still requires authenticated/preprocessed Earthdata acquisition, uncertainty handling and temporal aggregation. No deployment or push was performed.

## NASA-W3 — Resposta hídrica documentada

Status: complete.

Implemented: promoted verified crop-coefficient profiles into the typed runtime catalog and added the official ANA/SNIRH profile for common colored bean. The qualitative “documented water response” indicator now pairs crop-specific Kc peak/stage evidence with the shared NASA historical exposure window (IMERG rain days and/or POWER root-zone wetness). It remains unknown when either side is unavailable. Scenario C receives a traceable explanation only when both evidence classes exist; crop selection remains unchanged.

Guardrails: the feature does not calculate ET0, ETc, crop water demand, irrigation requirement, drought tolerance, productivity or a water score. Kc values are displayed only with their exact source and stage. The ANA aggregate paddy-rice record was not assigned to upland rice because the production system is ambiguous. Missing profiles remain unknown.

Evidence (2026-11-14): catalog projection and engine tests verify the common-bean ANA record, observed/unknown behavior, exact source traceability, peak Kc display and absence of ETc/irrigation-score outputs. Browser coverage verifies the hydric row and its limitation in Results. `npm run lint`, `npm run typecheck`, `npm run test` (63 unit tests), `npm run build`, and `npm run test:e2e` (20 Playwright tests) passed.

Limitations / next: Kc is a dimensionless crop-stage coefficient, not a measured water requirement. A defensible quantitative balance would additionally require verified ET0, stage durations and locally appropriate calendars; those inputs are intentionally absent rather than inferred. No deployment or push was performed.

## NASA-W4 — Decisão concreta e polígono analisável

Status: complete.

Implemented: NASA Insight now emits a structured attention decision whenever a monthly NASA temperature signal falls outside a proposed crop's documented range. Results name the month, hypothesis and crop, then show the observed value, documented interval, rule and source trail. Unknown evidence cannot create an attention decision, and month exploration still does not change crops.

Implemented: the user-drawn Atlas polygon now enters the validated farm draft and public analysis contract. The pure boundary analysis reports vertex count, approximate geodesic area, centroid and whether the nominal 9 km SMAP grid is coarser than the boundary. Results, technical export and Evidence Center expose the spatial context and its SMAP gap.

Scientific boundary: the dated GIBS raster remains visual and is never decoded from colors. The official historical numeric product is SMAP L4 SPL4SMGP v8 (3-hourly, nominal 9 km, 31 March 2015 to present), but numeric polygon aggregation requires authenticated Earthdata preprocessing. Until a polygon-matched artifact exists, the value remains N/D; POWER/MERRA-2 root-zone wetness is not relabeled as SMAP.

Evidence (2026-11-14): schema tests cover valid/invalid polygons; pure tests cover area, resolution interpretation, explicit SMAP preprocessing status, public-result integration and structured attention decisions. The browser flow carries a three-vertex polygon from Atlas into Farm. `npm run lint`, `npm run typecheck`, `npm run test` (66 unit tests), `npm run build`, and `npm run test:e2e` (20 Playwright tests) passed.

## UX-Atlas — Data corrente e densidade espacial

Status: complete.

Implemented: replaced the hard-coded January Atlas summary with a same-calendar-day historical context. The client sends the current month/day, and the server computes medians only from that calendar day across the complete NASA POWER period for temperature, precipitation, GPM IMERG and root-zone wetness. The panel explicitly labels the result as historical climatology, never a live measurement or forecast.

Implemented: removed the Brazil-context block from the Atlas and stopped its redundant municipal request on that screen. Crop sprites are now passive compact catalog cards: they no longer open evidence dialogs. Regional evidence remains available later in analysis/results where it affects interpretation. Desktop Atlas allocation changed from 65/35 to 56/44, and the wider panel uses four compact crop columns at XL widths so the pixel-art catalog appears substantially earlier without harming the mobile two-column layout.

Evidence (2026-11-14): unit coverage verifies same-day historical medians and missing-value preservation; browser coverage verifies the current-day panel, absence of the Brazil block, passive sprites and Atlas-to-Farm navigation. `npm run lint`, `npm run typecheck`, `npm run test` (67 unit tests), `npm run build`, and `npm run test:e2e` (20 Playwright tests) passed.

## Sprint 1 — Decisão clara + estados de evidência

Status: complete.

Implemented: `DecisionHero` at the top of Results (month, hypothesis/crop, NASA signal, documented range, state attention | compatible | N/D, rule, source link and next human check), driven by the pure `lib/engine/decision-hero.ts`. `compatible` requires every hypothesis to have a documented range containing the NASA value; a scenario without a range is listed as N/D and never counted as compatible. Compact data-state chips (historical available, verified cache, partial coverage, N/D) come from `lib/source-health.ts`. Inline pixel-art `StatusCharacter` shows calm / alert / no-reading. Repeated technical text (NASA Insight intro, duplicate attention banner, limitation and temporary-month notes, the long boundary block) was removed from Results; detail lives in the Evidence Center. The Markdown export now has "Decisão concreta" and "Estado das fontes".

Scope held: no score, automatic recommendation, forecast, yield or irrigation.

Evidence (2026-11-14): `tests/unit/decision-hero.test.ts` covers attention with month/value/range/rule/source/next step, compatible only when all are readable, N/D for unavailable climate, missing thermal data and precipitation-only, export content, source states and no Brazilian context outside Brazil. Verified in the browser with real NASA POWER data for Rio Verde (compatible), Accra (compatible) and New Delhi (attention).

## Sprint 2 — Polígono útil + entrada rural simples

Status: complete.

Implemented: `lib/geojson.ts` imports Polygon / Feature / FeatureCollection / single-polygon MultiPolygon, drops the closing vertex, ignores altitude, and fails with clear pt-BR/en messages for invalid JSON, non-polygons, several polygons, holes, bad coordinates, <3 distinct vertices, >64 vertices, self-intersection, zero area and files over 200k characters. `GeoJsonImport` is available in the Atlas (also sets the point to the centroid) and Farm; the boundary persists in the local draft. `BoundarySummary` shows area, centroid, vertices and the relation to the nominal 9 km SMAP cell in Atlas, Farm, Results and the export. Optional producer-declared water point (well, river, reservoir, other, plus a note) is stored in the draft as declared context only. SMAP historical stays "N/D — requer pré-processamento Earthdata"; GIBS colors are never converted to numbers.

Evidence (2026-11-14): `tests/unit/geojson.test.ts` covers valid shapes, every error code, persistence of boundary and water point in the draft, rejection of an unknown water kind, and that adding a water point leaves the whole analysis (crops, indicators, evidence, NASA insight) unchanged.

## Sprint 3 — Operação, acessibilidade e demo global

Status: complete, with the limitations below.

Implemented: PWA manifest, generated icons (`scripts/generate-pwa-icons.mjs`), and `public/sw.js` (network-first pages, cache-first static assets, never `/api` or cross-origin), registered in production only. The last server analysis is kept in `localStorage` and shown with a clear saved-at banner when the request fails; an offline banner appears when the browser is offline. `/settings` has text size, high contrast and reduced animations (applied before hydration; `PixelAnimation` honors it) and JSON export/import of the draft, validated against the draft schema (invalid files change nothing). "Saúde das fontes" in the Evidence Center lists NASA POWER, GPM IMERG, SMAP, ZARC, PAM and IBGE with origin, period, coverage, cache and gap. `/demo` is a 90 s, six-step guided demo (location, polygon, NASA decision, hypothesis under attention, evidence, human next step) for Brazil, Ghana and India; Brazilian sources appear as N/D outside Brazil. Skip link, visible focus ring and keyboard-operable controls were added.

Evidence (2026-11-14): unit tests for draft export/import, the analysis cache and preferences; browser checks of the demo for all three places with real data, settings applying attributes and persisting, and the source-health drawer. A hydration mismatch introduced in Settings was found in the browser and fixed.

Limitations / next: (1) the in-app browser could not register a service worker, so offline reload through `sw.js` is not verified; the fallback to the saved analysis is covered by unit tests only. Pages work offline only after being opened once online. (2) Playwright's Chromium is not installed, so the e2e suite was not run and no e2e was added. (3) Desktop/mobile screenshot capture and the final visual review were not done; checks were at the narrow pane width. (4) `/lab` and `/farm` still read `localStorage` during render (pre-existing hydration warning on `/lab`). (5) The Atlas map worker issue seen in dev is unchanged.

## Plan 10 — A NASA passa a diferenciar os cenários

Status: complete, with the limitations below. Plan: `docs/PLAN_10.md`; decisions: `docs/DECISIONS.md` (Plan 10).

Implemented: FAO-56 Penman–Monteith ET0 (`lib/climate/et0.ts`) from NASA POWER daily fields plus surface pressure `PS`, monthly precipitation-minus-ET0 water balance (`historicalWaterBalanceByMonth`, median over complete years, with coverage), a 12-month thermal calendar per hypothesis with signed margin to the documented range, rule-based season insights (month of divergence, smallest thermal margin, climate water deficit), a chart with accessible table, and "what if" sliders (temperature ±3 °C, rainfall ±30%, ET0 not recomputed, clearly hypothetical, resettable). The decision card now carries the highlights; the Markdown export has the calendar, balance and NDVI status. MODIS NDVI infrastructure: parser, hash-verified fixture reader (server-only), relative low-vegetation months, offline script `npm run fetch:modis-ndvi`, source-health entry and a vegetation strip; without a fixture it is N/D. Technical fixes re-applied: `ClientOnly` wrapper for `/lab` and `/farm` (hydration) and the MapLibre 6 worker (`setWorkerUrl` + `predev`/`prebuild` copy). The Rio Verde POWER fixture was recaptured with `PS`.

Scope held: ETc, crop water use, irrigation need, yield, forecast and scores are not computed; ET0 is a climate indicator only (AGENTS.md exception recorded).

Evidence (2026-11-14): `tests/unit/et0.test.ts` reproduces FAO-56 Example 18 within 0.06 mm/day and covers null-never-zero; `season.test.ts` covers calendar states/margins, offsets, unknown months, contrast, margin fallback, deficit and low-coverage handling, N/D and rain scaling; `ndvi.test.ts` covers parsing, scaling, fill values, monthly medians, tamper/mismatch/absent fixtures and source health. Browser check with live data: Rio Verde (soy margin 4.2 °C vs sorghum 8.2 °C in April; deficit Apr–Oct, worst September −180 mm), Accra and New Delhi (soybean outside its documented range in July at 31.3 °C while cowpea is inside); sliders recalculated the calendar and left the decision unchanged. Results 500 caused by a client import of `node:fs` was found in the browser and fixed by splitting `ndvi-fixture.ts`.

Limitations / next: (1) No NDVI fixture is committed: the ORNL DAAC MODIS service returned HTTP 502/503 on every attempt, the response parser follows the documented structure but was not exercised against the live service, and the scale/fill constants come from the LP DAAC product guide. Run `npm run fetch:modis-ndvi -- rio-verde|accra|new-delhi` when it is back. (2) SRTM relief, erosion and hotspot maps were not added (no verified soil/relief source). (3) Crop catalog completeness (cover, family, pH, duration) was not expanded: it needs primary sources per parameter. (4) Offline service-worker reload, the Playwright suite and desktop/mobile screenshots remain unverified. (5) ET0 uses G = 0 and RH-mean vapour pressure (documented simplifications).

## Plan 10b — MODIS real, relevo SRTM, erosividade e culturas

Status: complete, with the limitations below.

Implemented: (1) MODIS NDVI collected through the Microsoft Planetary Computer STAC catalog (NASA LP DAAC MOD13Q1 v061 copies, Terra only) because the ORNL DAAC service kept returning HTTP 502/503; `scripts/fetch-modis-ndvi.ts` now lists the composites per year and samples the pixel; fixtures for Rio Verde, Accra and New Delhi are committed (335 composites, all valid, SHA-256 in the sidecars). (2) Relief: `lib/terrain/` samples a SRTM grid over the boundary (or 3×3 around the point), computes slope by finite differences, classifies with the Embrapa relief table, marks relief hotspots (slope ≥ 8%) and renders a hotspot map; failures degrade to N/D. (3) Rainfall erosivity: Arnoldus Modified Fournier Index with its published classes. Soil loss (RUSLE) is explicitly N/D. (4) Seven verified crop-evidence records from Embrapa publications (sorghum pH and ideal temperature, maize and sunflower viable temperature, soybean pH, common bean ideal temperature and pH), each checked against the PDF text; scenario C moved from cowpea to maize because maize now has a documented range. SRTM appears in the source health, the decision-card chips and the export.

Evidence (2026-11-14): `terrain.test.ts` recovers known slopes from synthetic planes (5%, 10% in two directions), covers class boundaries, margins, hotspots, missing elevations never becoming flat, grid limits and every SRTM failure mode; `erosivity.test.ts` checks the MFI formula and class limits; `ndvi.test.ts` verifies the three committed fixtures. Live check in the browser: SRTM answered for all three demo points; Rio Verde boundary: 739–747 m, mean slope 2.8%, 25 cells, no hotspots, MFI 171.5 (very severe), NDVI lowest in Jul–Sep; scenario C is maize. `npm run lint`, `npm run typecheck`, `npm run test` (129 unit tests) and `npm run build` pass.

Limitations / next: (1) OpenTopoData public limits are 1 call/s and 1000 calls/day; heavy use would need a cache layer or a self-hosted copy. (2) SRTM vertical error makes slopes on small boundaries approximate. (3) NDVI exists only at the three demonstration points and they are city centres (low absolute NDVI). (4) Common bean has no documented viable temperature, so it shows N/D in the thermal calendar; upland rice, cowpea pH and soybean cycle remain open for lack of a range in the sources found. (5) The Playwright suite, offline service-worker reload and screenshots remain unverified.

## Climate Risk Intelligence — Forecast pressure and dry-spell experiment

Status: complete, evidence-limited.

Implemented: added an independent Open-Meteo Forecast adapter with Zod payload/unit checks for daily precipitation, provider-calculated FAO reference ET0 and temperatures; a `/api/climate-risk` boundary with source URL, issue time, UTC, model selection, units, availability and explicit limitations; and pure 7/15-day `P − ET0` pressure calculations. A horizon with even one missing precipitation or ET0 value is N/D rather than a partial aggregate. The NASA comparison is a same-calendar historical climatology, never current forecast data.

Implemented: added reproducible offline dry-spell logistic training (`npm run train:dry-spell`), versioned `data/dry-spell-models.json`, past-only 30-day windows, a 30-day chronological embargo, Brier score and five-bin calibration. Event: at least seven consecutive days under 1 mm/day. The Rio Verde 7-day model test has 1,059 samples and Brier 0.11025 vs climatology 0.10964; the 15-day model has 1,057 and 0.09830 vs 0.09381. Both are `not_validated`, so no ML probability is disclosed; only a pilot-specific climatological reference is available. Other coordinates explicitly have no location-compatible artifact.

Implemented: integrated an accessible bilingual Climate Risk Lab into Results. It preserves the existing historical NASA panels and A/B/C analysis. Strategy-specific forecast exposure stays N/D because crop dates, durations and stages are not verified; the UI makes that gap explicit instead of inventing differences.

Evidence (2026-11-14): `npm run train:dry-spell`; `npm run typecheck`; `npm run test` (134 unit tests); `npm run lint`; and `npm run build` passed. Playwright: 19 existing navigation flows plus the new forecast-provenance/no-unvalidated-probability flow passed when run within the environment time window. The remaining legacy incomplete-analysis mock exceeds the sandbox's 30-second command window; it was not changed by this sprint.

Limitations / next: Open-Meteo free access is for non-commercial/evaluation use and requires attribution; production use needs a licence/plan review. Provider `best_match` is a model-selection request, not field validation. Forecast ET0 is provider-calculated reference ET0 and is not recomputed locally. The dry-spell artifact only covers the exact Rio Verde fixture, excludes root-zone wetness pending complete compatible features, and is intentionally not released as a predictive probability. ETc, crop water use, soil water, irrigation, yield and strategy-specific forecast claims remain out of scope.
## Sprint F12 — Sprites para 16 culturas da agricultura familiar

Status: complete.

Implemented: integrated the supplied, versioned 64×64 RGBA PNG sprites for cassava, pumpkin, sweet potato, peanut, watermelon, lettuce, tomato, carrot, kale, onion, bell pepper, okra, coffee, banana, cacao and açaí into `public/assets/crops`. `CropSprite` now has an explicit canonical-ID mapping (while preserving legacy filenames), catalog-name alt text, fixed contained/pixelated rendering, and retains an error/unknown-ID fallback. The shared component is used in the catalog/deck and A/B/C result cards already, and now also in farmer crop selection and draggable intercrop cards.

Evidence (2026-11-14): asset tests validate the 16 unique manifest IDs, physical files, 64×64 RGBA headers, transparent corners/background pixels, exact runtime URLs and fallback. The intercropping Playwright flow asserts the catalog-name sprite and Cassava URL before drag-and-drop. `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and the focused intercropping browser flow pass.

Scope / limitations: sprites are visual identifiers only; growth habit, annual/perennial treatment, evidence and agronomic interpretation continue to come exclusively from the crop catalog. The supplied IDs exactly match the catalog; no persisted IDs or translations were changed.

## Explore — Soil and planting context panels

Status: complete, with the limitations below.

Implemented: the Explore side panel gained a "Contexto de solo e plantio" section with six cards. (1) Rain forecast for the next 7 days (and 16-day total) through a new `/api/forecast` route over the existing Open-Meteo adapter. (2) Rainy season: the longest circular run of months where median precipitation exceeds median FAO-56 ET0 (`lib/climate/seasonality.ts`). (3) Dry spells inside that season: longest run of days under 1 mm per complete season, reusing `DRY_SPELL_DEFINITION` (7+ days); seasons with any missing day are skipped. (4) Root-zone soil moisture (POWER GWETROOT) by month, multi-year median against 2025. (5) Monthly air minimum/maximum medians plus soil temperature from POWER `TSOIL1` (added as an enhanced parameter; the offline Rio Verde fixture has no soil layer and shows N/D). (6) El Niño / La Niña from NOAA CPC RONI through a new `/api/enso` route (`lib/climate/enso.ts`), and the municipal PAM harvested-area ranking from the existing regional-context route. `/api/climate` and its Zod schema carry `seasonality`, `rootZoneByMonth` and `tsoilMedianC`.

Evidence (2026-11-14): `tests/unit/seasonality.test.ts` covers wrap-around and tie rules for the rainy season, incomplete-season exclusion for dry spells, the median/last-year root-zone logic with a missing day, RONI parsing, NOAA thresholds and season-to-month mapping; `nasa-power.test.ts` now asserts `TSOIL1` in the request. `npm run lint`, `npm run typecheck` and `npm run test` pass. Live check on Luís Eduardo Magalhães (BA): rainy season Nov–Mar, 11 of 14 complete seasons with a 7+ day dry spell, RONI ASO 2026 = +1.97 (strong El Niño), PAM 2025 top crop soybean, all rendered in the page.

Limitations / next: the rainy-season rule is a water-balance definition, not the onset of rains. Dry-spell thresholds are the project's existing 7 days / 1 mm. POWER values are grid-cell models (about 50 km); TSOIL1 is near-surface modelled soil, not a probe. RONI is a global index with no local effect claimed. PAM only indexes six grain crops. Open-Meteo free access is non-commercial. The 2026-10-01 GWETROOT model change reported by another project was not verified here; the series ends in 2025. No component or e2e test covers the new cards yet.

## Sprint F13 — Future Farm Stories ("Explore seus futuros possíveis")

Status: complete, with the limitations below.

Implemented: the A/B/C comparison ("Comparar critérios") now has an `Explore seus futuros possíveis` button that opens `/future-stories`. Each scenario is a pixel-art farm with a scenario selector (tabs, arrow keys), a cycle stepper (Ciclo 1..4, Anterior/Próximo, `aria-current="step"`, arrow/Home/End keys), a text panel (crops, documented catalogue role, sequence justification from the functional-diversity indicator, potential benefits, risks and unknowns, missing data, evidence level and source links, declared intercrop notes, scenario notes) and a permanent bilingual disclaimer. `lib/future-farm/adapter.ts` is a read-only adapter from `AnalysisResult` plus the draft's current laboratory plan and declared cropping systems to `FarmScenarioView`: A/B/C order, real slot order and gaps are preserved, empty slots are never filled, and persisted IDs are untouched. `lib/future-farm/composer.ts` composes real scenes at runtime from `farm-base-960x540.png` and crop sprites (`/assets/crops` first, then `crop-overlays`, then `unknown-generic.png` with the crop name kept in the legend) with a deterministic layout and a single plant size for all crops, so the same crop looks identical in A/B/C and nothing encodes vigour, yield, soil or water. Declared intercrops alternate rows schematically with a legend; companions never replace the stage's crop. If the farmer edits a crop after the last analysis, the scene follows the draft immediately and that stage's indicators/evidence are withheld with a "reanalyse" notice instead of being guessed. The page reuses the comparison's cached analysis when it was produced from the current farm input; otherwise it makes the same `/api/analyze` call once. The 12 supplied GIF/WebP/PNG scenes are used only in the explicit, isolated demo (`/future-stories?demo=ilustrativa`), which neither reads nor writes the draft and shows no evidence. Motion is a 1–2 px CSS leaf sway with a pause button; `prefers-reduced-motion` and the app's reduced-animation setting give a static scene (static PNG in the demo). Only the active cycle is mounted; the base landscape goes through `next/image`; demo animations use `<picture>` (animated WebP, GIF fallback, PNG on error or reduced motion) inside a fixed 16:9 box (no layout shift). Assets copied to `public/assets/farm-stories/`; the demo/manifest JSON to `data/future-farm-*.json`; `public/assets/crops/` was not modified. `cropSpriteFiles` moved to `lib/crop-sprite-files.ts` (re-exported from `CropSprite`).

Evidence (2026-11-15): `tests/unit/future-farm.test.ts` (10 tests) covers A/B/C mapping with four real stages and gaps, an edited crop redrawn with stale evidence withheld, unknown crops keeping their name with the generic sprite, two- and three-crop intercrops in the same stage, identical appearance of the same crop in A/B/C, no fabricated benefits from missing data, single-crop fallback without a lab plan, the 12 demo PNG/GIF(6 frames)/WebP files at 960×540, demo isolation and both disclaimers. `tests/e2e/future-stories.spec.ts` (4 tests, Chromium in a Node 22 container) covers the comparison → stories → compare flow, keyboard stepping and `aria-current`, pause, a crop edited after analysis, reduced motion with static PNG and demo isolation, and the mobile layout (scene above the panel, 16:9). `npm run lint`, `npm run typecheck`, `npm run test` (241 tests) and `npm run build` pass. Full Playwright run: 17 passed, 9 failed in the pre-existing `navigation.spec.ts` (home/atlas selectors that no longer exist and the legacy incomplete-analysis mock crashing in `deriveDecisionHero`); none touches the new code.

Limitations / next: (1) Laboratory slots have no calendar dates, so a declared intercrop is shown in every stage whose main crop belongs to it; the panel says the exact stage is not inferred. (2) Catalogue risks/limitations from the intercrop seed are Portuguese only, as elsewhere in the app. (3) Climate props (rain, dry, water) are not used: no dated, sourced climate observation is wired to the scene. (4) Unknown-crop path is covered by tests, but the current lab schema only accepts catalogue IDs, so it is defensive. (5) The legacy `navigation.spec.ts` failures above remain to be updated.

## Explore — UI polish

Status: complete, with the limitations below.

Implemented: on desktop (≥1024 px) the map and the results share one fixed-height row, so only the results panel scrolls (with `overscroll-behavior: contain`) and the page stays put; on narrow screens the map is shorter (22rem) and, after a city search, the results panel scrolls into view once loaded (respecting reduced motion). Loading shows a skeleton with the shape of the results instead of one line of text. The soil/planting cards are collapsible `<details>` showing a headline value (7-day rain, rainy season, typical dry-spell pause, root-zone moisture this month, air range this month, ENSO phase, top municipal crop); forecast and rainy season open by default. pt-BR numbers in the Explore panel use a decimal comma. The map caption no longer says every layer is about one day behind: rain and cloud layers say that, and soil moisture states it is a reference image from 30 Jun 2025, not today's.

Evidence (2026-11-15): checked in the browser pane at 1280×800 and 375×812 (sticky map, collapsed/open cards, skeleton, comma decimals, scroll-to-results after searching "Rio Verde"). Lint, typecheck and unit tests pass.

Limitations / next: the SMAP layer is still a fixed 2025-06-30 image, only its caption changed. No SMAP colour legend was added. The default place is still Luís Eduardo Magalhães (BA). No automated UI test covers the new behaviours.

## João explains the results — Phase 1 (text engine)

Status: complete for phase 1 (engine and tests only; no UI yet).

Implemented: `lib/explain/joao.ts`, a pure function `explainPlace(data, locale)` that turns the numbers already on the Explore panel into plain-language lines in João's voice (pt-BR and en): an intro, a 2–3 sentence summary and four sections (rain, soil, heat, world and town), each line with a tone (`info`, `attention`, `unknown`) and an optional small "how I worked this out" hint, plus a fixed not-a-recommendation footer. Every comparison is against the place's own history: the 7-day forecast against what that week normally brings (each day takes its own month's median, so a month boundary works; "close to usual" = within 25%; in the dry season it is described in absolute terms), root-zone moisture this year against the median (±0.05), rainy season relative to today, dry spells with the project's 7-day / 1 mm definition, the month's typical night and afternoon temperatures, El Niño without any local-effect claim, and the top municipal crops by harvested area. Loading says nothing; failed or missing data becomes an honest "I do not have this" line; outside Brazil no crop line is produced.

Evidence (2026-11-15): `tests/unit/joao.test.ts` (22 tests) covers exact sentences, boundary cases, the unavailable/loading states, the empty-climate case, pt/en parity of lines and order, decimal comma vs point, a sentence-length ceiling, no NaN/undefined, and a vocabulary guard that fails on orders or promises ("plante", "adube", "ideal", "recomend…", "vai chover", and the English equivalents). Run against live Rio Verde data it produced a readable summary ("A época de mais chuva costuma ir de novembro a março. Estamos nela agora. Esta semana, a previsão é de cerca de 57 mm, mais do que o normal.").

Limitations / next: the weekly "normal" spreads a monthly median evenly over the days, so the text says "cerca de". The ±25% and ±0.05 bands are declared constants, not agronomic thresholds. Next phase: the João header and sections in the Explore panel (one shared data fetch for João and the cards), then expressions and read-aloud.

## João explains the results — Phase 2 (UI in the Explore panel)

Status: complete for phase 2; expressions and read-aloud (phase 3) not started.

Implemented: the Explore results panel now opens with João Silva (the existing chat portrait, labelled "Personagem fictício"): a speech bubble with his greeting and a 2–3 sentence summary, then four sections (the rain, the soil, the heat, the world and your town) written by `lib/explain/joao.ts`. Each section ends with "Ver os números", which opens the matching number cards and scrolls only the results panel to them (the page on narrow screens), and a "Como eu calculei" disclosure with the method hints. Attention and no-data lines carry a visible label ("Chama atenção", "Sem dado") plus an amber bar, so colour is never the only signal. While the climate loads, João shows a typing bubble above the skeleton. `ExploreExtrasProvider` fetches the rain forecast, El Niño and municipal crops once per place and shares them between João and the cards, and holds which cards are open; cards start closed because João now carries the story. The old "Contexto de solo e plantio" block is now "Os números". `buildJoaoData` maps the panel's state onto João's input without altering any value (loading and failed readings stay distinct).

Evidence (2026-11-15): checked in the browser pane at 1280×900 and 375×812: João renders at the top of the panel, "Ver os números" opened the right cards and moved only the panel on desktop (page scroll stayed at 0; the card landed 9 px from the panel top) and the page on mobile (card at 8 px), no horizontal overflow at 375 px, "Ver os números" buttons are 44 px tall. `tests/unit/joao-data.test.ts` covers loading/failed/ready mapping, null vs undefined rainy season, and Brazil-only crops. Lint, typecheck and unit tests pass.

Limitations / next: João is one static portrait; expressions per tone and read-aloud are phase 3. In development React runs effects twice, so the extra fetches appear twice there. No Playwright test covers the new panel yet. The summary and sections are computed on the client from the loaded data, so nothing is server-rendered.
