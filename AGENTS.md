# Field Shift agent rules

Read `fieldshift_codex/PROJECT_SPEC.md`, `docs/SPRINT_LOG.md`, and this file before editing. Execute one sprint at a time; inspect existing code; plan files, dependencies, and tests; then run lint, typecheck, unit tests, and build before moving on.

Exception (approved 2026-11-14, national scope updated 2026-11-14): FAO-56 ET0 and the monthly precipitation-minus-ET0 balance may be computed as a climate indicator only; ETc, crop water use, irrigation need, yield and forecasts remain out of scope. Never invent NASA measurements, soil attributes, Kc values, crop cycles, thermal limits, calendars, nutrient/productivity gains, or fixtures. Missing evidence remains `null`/unknown. The product scope is Brazil nationwide: keep Brazil-wide municipal/regional context separate from global climate-only technical exploration, and never promote an unprocessed state or coordinate to regional evidence. Use strict TypeScript, Zod at boundaries, pure engine functions, accessible responsive UI, and no secrets, GIS map, or unnecessary dependencies (login and database: only the exception below).

Exception (approved 2026-11-15): a local SQLite database (Node's built-in `node:sqlite`, no extra dependency) and a deliberately simple demo login (username and password, no email, no recovery) may store the user's registered farm for the farm panel. The database is a hackathon store, not a hardened one; on Vercel its file is temporary. Nothing else stores personal data.

At each sprint end, update `docs/SPRINT_LOG.md` with implementation, checks, evidence, limitations, and next sprint; commit only when Git is configured.
