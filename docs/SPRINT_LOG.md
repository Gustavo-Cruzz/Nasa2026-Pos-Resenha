# Sprint log

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
