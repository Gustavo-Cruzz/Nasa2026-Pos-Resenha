# Sprint log

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

## P1 — Internacionalização e entrega operacional

Status: partial — local implementation complete; external credentials/evidence required.

Implemented: added a persistent pt-BR/en locale provider and accessible language selector. Navigation, landing and methodology now switch at runtime and retain the selected language in browser storage. Removed the unused legacy `ExploreWizard`; `/farm` remains the sole farm flow. Updated README with the authorized MapLibre-style and Vercel deployment contract.

Evidence (2026-11-12): `npm run lint`, `npm run typecheck`, `npm run test` (35 unit tests), `npm run build`, and `npm run test:e2e` (11 Playwright tests) passed. E2E proves English selection persists after reload and changes landing/methodology content.

External blockers: no authorized `NEXT_PUBLIC_MAP_STYLE_URL` was supplied, so coordinate fallback remains the only shipped map mode. GitHub remote access cannot authenticate (`could not read Username`); Vercel CLI is not installed/authenticated. No crop evidence was promoted because no new primary source was supplied or verified. These are intentionally not replaced with placeholders, public tiles, credentials or inferred agronomic data.

### Evidência adicional — 2026-11-12

Reviewed the currently linked Embrapa BRS Guariba page directly and promoted only two existing cultivar-specific records: maturity cycle (65–70 days) and the stated disease-response profile. The source page/section and quote are now recorded; runtime does not use the disease claim and does not project either record into a Rio Verde calendar, global suitability, irrigation rule, score or validation. The evidence audit is now 28 verified / 9 unverified records. Lacking map authorization, GitHub/Vercel credentials and further verified primary evidence remain external blockers.
