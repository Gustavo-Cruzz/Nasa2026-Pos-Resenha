# Sprint log

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
