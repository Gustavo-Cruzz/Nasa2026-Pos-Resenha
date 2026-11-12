# Field Shift agent rules

Read `fieldshift_codex/PROJECT_SPEC.md`, `docs/SPRINT_LOG.md`, and this file before editing. Execute one sprint at a time; inspect existing code; plan files, dependencies, and tests; then run lint, typecheck, unit tests, and build before moving on.

Never invent NASA measurements, soil attributes, Kc values, crop cycles, thermal limits, calendars, nutrient/productivity gains, or fixtures. Missing evidence remains `null`/unknown. Keep climate-only global analysis separate from pilot-only regional recommendations. Use strict TypeScript, Zod at boundaries, pure engine functions, accessible responsive UI, and no secrets, login, database, GIS map, or unnecessary dependencies.

At each sprint end, update `docs/SPRINT_LOG.md` with implementation, checks, evidence, limitations, and next sprint; commit only when Git is configured.
