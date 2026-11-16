/**
 * Orchestration engine for the national municipal MODIS NDVI pipeline (MOD13Q1 v061, Terra, 250m_16_days_NDVI).
 * One modelled interior point per municipality: municipal context only, never a farm or field measurement.
 * Relative `.ts` imports only so `node --experimental-strip-types` scripts can import it. Source, fs directory,
 * clock and logger are injected.
 *
 * Disk layout under <dir> (default data/ndvi-brazil):
 *   manifest.json            ProgressManifest, atomically checkpointed
 *   .work/<tile>.ndjson      work store: one line per processed item {itemId,start,end,codes,raw}; the points of one
 *                            tile only, never all raw series in memory. Truncated last line is ignored on read.
 *   states/<UF>.json         StateNdviArtifact, atomically written; sha256 kept in manifest.stateChecksums
 */
import { createHash } from 'node:crypto';
import { appendFile, mkdir, open, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { monthlyNdvi, ndviFromRaw, type NdviObservation } from './ndvi.ts';
import {
  NDVI_BAND, NDVI_BRAZIL_DIR, NDVI_BRAZIL_FORMAT_VERSION, NDVI_COLLECTION, NDVI_COMPOSITES_PER_YEAR, NDVI_MIN_LISTED_FRACTION,
  NDVI_MIN_VALID_FRACTION, NDVI_PRODUCT, NDVI_PROVIDER, NDVI_SOURCE_URL,
  type MunicipalNdviRecord, type MunicipalNdviStatus, type MunicipalPoint, type MunicipalPointsArtifact, type NdviItem,
  type NdviRasterSource, type ProgressManifest, type StateNdviArtifact,
} from './ndvi-brazil-types.ts';

export const NDVI_MIN_YEAR = 2011;
export const NDVI_MAX_YEAR = 2025;
export const BRAZIL_UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'] as const;
export const MANIFEST_FILE = 'manifest.json';
export const POINTS_FILE = 'points.json';
export const REPORT_FILE = 'report.json';

export class ArgError extends Error {}
export class PipelineError extends Error {}
/** Source error that must not be retried on --resume (e.g. HTTP 404 for an item). */
export class PermanentSourceError extends Error { readonly permanent = true; }

export type PipelineArgs = {
  startYear: number; endYear: number; ufs: string[]; ibge: string[]; resume: boolean; force: boolean; dryRun: boolean;
  concurrency: number; source: 'cog' | 'point';
};

const intIn = (name: string, value: string | undefined, min: number, max: number): number => {
  if (value === undefined || !/^-?\d+$/.test(value)) throw new ArgError(`${name} must be an integer (${min}..${max}), got "${value ?? ''}"`);
  const n = Number(value);
  if (n < min || n > max) throw new ArgError(`${name} must be between ${min} and ${max}, got ${n}`);
  return n;
};

export function parseArgs(argv: string[]): PipelineArgs {
  const args: PipelineArgs = { startYear: NDVI_MIN_YEAR, endYear: NDVI_MAX_YEAR, ufs: [], ibge: [], resume: false, force: false, dryRun: false, concurrency: 4, source: 'cog' };
  const tokens: string[] = [];
  for (const raw of argv) {
    if (raw.startsWith('--') && raw.includes('=')) { const i = raw.indexOf('='); tokens.push(raw.slice(0, i), raw.slice(i + 1)); } else tokens.push(raw);
  }
  const valueFlags = new Set(['--start-year', '--end-year', '--uf', '--ibge', '--concurrency', '--source']);
  for (let i = 0; i < tokens.length; i += 1) {
    const flag = tokens[i];
    if (flag === '--resume') { args.resume = true; continue; }
    if (flag === '--force') { args.force = true; continue; }
    if (flag === '--dry-run') { args.dryRun = true; continue; }
    if (!flag.startsWith('--') || !valueFlags.has(flag)) throw new ArgError(`Unknown argument "${flag}"`);
    const value = tokens[i + 1];
    if (value === undefined || value.startsWith('--')) throw new ArgError(`${flag} needs a value`);
    i += 1;
    if (flag === '--start-year') args.startYear = intIn(flag, value, NDVI_MIN_YEAR, NDVI_MAX_YEAR);
    else if (flag === '--end-year') args.endYear = intIn(flag, value, NDVI_MIN_YEAR, NDVI_MAX_YEAR);
    else if (flag === '--concurrency') args.concurrency = intIn(flag, value, 1, 16);
    else if (flag === '--source') {
      if (value !== 'cog' && value !== 'point') throw new ArgError(`--source must be cog or point, got "${value}"`);
      args.source = value;
    } else if (flag === '--uf') {
      for (const part of value.split(',')) {
        const uf = part.trim().toUpperCase();
        if (!(BRAZIL_UFS as readonly string[]).includes(uf)) throw new ArgError(`Invalid UF "${part}"`);
        if (!args.ufs.includes(uf)) args.ufs.push(uf);
      }
    } else if (flag === '--ibge') {
      for (const part of value.split(',')) {
        const code = part.trim();
        if (!/^\d{7}$/.test(code)) throw new ArgError(`IBGE code must have 7 digits, got "${part}"`);
        if (!args.ibge.includes(code)) args.ibge.push(code);
      }
    }
  }
  if (args.startYear > args.endYear) throw new ArgError(`--start-year (${args.startYear}) must be <= --end-year (${args.endYear})`);
  if (args.resume && args.force) throw new ArgError('--resume and --force are mutually exclusive');
  return args;
}

export type Logger = (message: string) => void;
export type PipelineDeps = {
  dir?: string;
  source: NdviRasterSource;
  points: MunicipalPoint[];
  pointsSha256: string;
  catalog: { sha256: string; count: number };
  now?: () => Date;
  log?: Logger;
  generator?: { script: string; sha256: string };
  /** Manifest checkpoint every N processed items (default 25). */
  checkpointEvery?: number;
};

const sha256 = (data: string | Uint8Array): string => createHash('sha256').update(data).digest('hex');
const exists = async (file: string): Promise<boolean> => { try { await stat(file); return true; } catch { return false; } };

/** Atomic write: tmp file, flush to disk, rename. */
export async function atomicWrite(file: string, content: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  const handle = await open(tmp, 'w');
  try { await handle.writeFile(content); await handle.sync(); } finally { await handle.close(); }
  await rename(tmp, file);
}

/** Loads points.json, validating the 7-digit codes and returning the file sha256. */
export async function loadPoints(dir = NDVI_BRAZIL_DIR): Promise<{ artifact: MunicipalPointsArtifact; sha256: string }> {
  const text = await readFile(path.join(dir, POINTS_FILE));
  const artifact = JSON.parse(text.toString('utf8')) as MunicipalPointsArtifact;
  if (!Array.isArray(artifact.points)) throw new PipelineError(`${POINTS_FILE} has no points array`);
  return { artifact, sha256: sha256(text) };
}

export async function sourceSha256(scriptPath: string): Promise<{ script: string; sha256: string }> {
  const own = await readFile(fileURLToPath(import.meta.url));
  const script = await readFile(scriptPath).catch(() => Buffer.alloc(0));
  return { script: scriptPath, sha256: sha256(`${sha256(own)}:${sha256(script)}`) };
}

export function isPermanentError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { permanent?: unknown; status?: unknown; statusCode?: unknown; message?: unknown };
  if (e.permanent === true) return true;
  const status = Number(e.status ?? e.statusCode);
  if (status === 404 || status === 410) return true;
  return /\bHTTP (404|410)\b/.test(String(e.message ?? ''));
}

export type PlanTile = { tile: string; points: MunicipalPoint[]; items: NdviItem[] };
export type Plan = {
  years: number[]; selectedPoints: number; skippedOutsideGrid: string[]; tiles: PlanTile[];
  totalItems: number; estimatedRequests: number; expectedPerTile: number;
};

export function selectPoints(points: MunicipalPoint[], args: Pick<PipelineArgs, 'ufs' | 'ibge'>): MunicipalPoint[] {
  const known = new Set(points.map((p) => p.ibgeCode));
  for (const code of args.ibge) if (!known.has(code)) throw new ArgError(`IBGE code ${code} is not in points.json`);
  return points.filter((p) => (!args.ufs.length || args.ufs.includes(p.uf)) && (!args.ibge.length || args.ibge.includes(p.ibgeCode)))
    .sort((a, b) => a.ibgeCode.localeCompare(b.ibgeCode));
}

export async function buildPlan(args: PipelineArgs, deps: Pick<PipelineDeps, 'source' | 'points' | 'log'>): Promise<Plan> {
  const selected = selectPoints(deps.points, args);
  if (!selected.length) throw new ArgError('No points match the --uf/--ibge selection');
  const byTile = new Map<string, MunicipalPoint[]>();
  const outside: string[] = [];
  for (const point of selected) {
    const tile = deps.source.tileFor(point.latitude, point.longitude);
    if (!tile) { outside.push(point.ibgeCode); continue; }
    byTile.set(tile, [...(byTile.get(tile) ?? []), point]);
  }
  const lats = selected.map((p) => p.latitude); const lons = selected.map((p) => p.longitude);
  const bbox: [number, number, number, number] = [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
  const years: number[] = [];
  for (let y = args.startYear; y <= args.endYear; y += 1) years.push(y);
  const itemsByTile = new Map<string, Map<string, NdviItem>>();
  for (const year of years) {
    const listed = await deps.source.listItems(year, bbox);
    for (const item of listed) {
      if (!byTile.has(item.tile) || item.id.startsWith('MYD')) continue; // Terra only, needed tiles only
      const map = itemsByTile.get(item.tile) ?? new Map<string, NdviItem>();
      map.set(item.id, item); itemsByTile.set(item.tile, map);
    }
    deps.log?.(`list ${year}: ${[...itemsByTile.values()].reduce((s, m) => s + m.size, 0)} items so far`);
  }
  const tiles: PlanTile[] = [...byTile.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([tile, points]) => ({
    tile, points, items: [...(itemsByTile.get(tile)?.values() ?? [])].sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id)),
  }));
  const totalItems = tiles.reduce((s, t) => s + t.items.length, 0);
  return {
    years, selectedPoints: selected.length, skippedOutsideGrid: outside, tiles, totalItems, expectedPerTile: NDVI_COMPOSITES_PER_YEAR * years.length,
    // one request (batched COG) per item; the point API needs one request per point per item
    estimatedRequests: deps.source.mode === 'point_api' ? tiles.reduce((s, t) => s + t.items.length * t.points.length, 0) : totalItems,
  };
}

export function describePlan(plan: Plan, mode: string): string[] {
  return [
    `years ${plan.years[0]}-${plan.years[plan.years.length - 1]}, mode ${mode}, points ${plan.selectedPoints}, tiles ${plan.tiles.length}, items ${plan.totalItems}, estimated requests ${plan.estimatedRequests}`,
    ...plan.tiles.map((t) => `  ${t.tile}: ${t.points.length} points, ${t.items.length} items`),
    ...(plan.skippedOutsideGrid.length ? [`  ${plan.skippedOutsideGrid.length} points outside the MODIS grid (will not be processed)`] : []),
  ];
}

type WorkLine = { itemId: string; start: string; end: string; codes: string[]; raw: Array<number | null> };

async function readWork(file: string): Promise<Map<string, WorkLine>> {
  const map = new Map<string, WorkLine>();
  let text = '';
  try { text = await readFile(file, 'utf8'); } catch { return map; }
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as WorkLine;
      if (typeof parsed.itemId === 'string' && Array.isArray(parsed.codes) && Array.isArray(parsed.raw) && parsed.codes.length === parsed.raw.length) map.set(parsed.itemId, parsed);
    } catch { /* truncated or corrupt line: item will be re-sampled */ }
  }
  return map;
}

export function classifyStatus(observations: number, valid: number, expected: number): MunicipalNdviStatus {
  if (observations === 0 || valid === 0) return 'unavailable';
  return observations >= expected * NDVI_MIN_LISTED_FRACTION && valid >= observations * NDVI_MIN_VALID_FRACTION ? 'available' : 'insufficient_coverage';
}

export function buildRecord(point: MunicipalPoint, series: Array<{ start: string; end: string; raw: number | null }>, expected: number, period: { startYear: number; endYear: number }, fetchedAt: string): MunicipalNdviRecord {
  const sorted = [...series].sort((a, b) => a.start.localeCompare(b.start));
  const observationsList: NdviObservation[] = sorted.map((s) => ({ date: s.start, ndvi: ndviFromRaw(s.raw) }));
  const valid = observationsList.filter((o) => o.ndvi !== null).length;
  const observations = sorted.length;
  return {
    ibgeCode: point.ibgeCode, municipality: point.municipality, uf: point.uf,
    point: { latitude: point.latitude, longitude: point.longitude, method: point.method },
    product: NDVI_PRODUCT, band: NDVI_BAND,
    period: sorted.length ? { start: sorted[0].start, end: sorted[sorted.length - 1].end } : { start: `${period.startYear}-01-01`, end: `${period.endYear}-12-31` },
    observations, validObservations: valid,
    coveragePct: observations ? Number(((valid / observations) * 100).toFixed(2)) : 0,
    monthlyClimatology: monthlyNdvi(observationsList),
    status: classifyStatus(observations, valid, expected),
    source: { provider: NDVI_PROVIDER, sourceUrl: NDVI_SOURCE_URL, fetchedAt },
  };
}

export type RunResult = { plan: Plan; manifest?: ProgressManifest; sampledItems: number; failedItems: number; finalizedMunicipalities: number; written: boolean };

async function removeTmp(dir: string): Promise<number> {
  let removed = 0;
  for (const sub of ['', 'states', '.work']) {
    const target = path.join(dir, sub);
    for (const name of await readdir(target).catch(() => [] as string[])) {
      if (name.endsWith('.tmp')) { await rm(path.join(target, name), { force: true }); removed += 1; }
    }
  }
  return removed;
}

export async function readManifest(dir: string): Promise<ProgressManifest | undefined> {
  const file = path.join(dir, MANIFEST_FILE);
  if (!(await exists(file))) return undefined;
  try { return JSON.parse(await readFile(file, 'utf8')) as ProgressManifest; } catch { throw new PipelineError(`${file} is unreadable (corrupt). Use --force to start over.`); }
}

function makeLimiter(n: number) {
  let active = 0; const queue: Array<() => void> = [];
  const next = () => { if (active < n && queue.length) { active += 1; queue.shift()!(); } };
  return <T,>(fn: () => Promise<T>): Promise<T> => new Promise<T>((resolve, reject) => {
    queue.push(() => { fn().then(resolve, reject).finally(() => { active -= 1; next(); }); });
    next();
  });
}

export async function runPipeline(args: PipelineArgs, deps: PipelineDeps): Promise<RunResult> {
  const dir = deps.dir ?? NDVI_BRAZIL_DIR;
  const log = deps.log ?? (() => undefined);
  const now = deps.now ?? (() => new Date());
  const checkpointEvery = Math.max(1, deps.checkpointEvery ?? 25);
  const existing = await readManifest(dir);

  if (!args.dryRun) {
    if (existing && !args.resume && !args.force) throw new PipelineError(`A manifest already exists in ${dir}. Use --resume to continue it or --force to start over.`);
    if (args.resume && !existing) throw new PipelineError(`--resume requested but ${path.join(dir, MANIFEST_FILE)} does not exist.`);
  }
  if (existing && args.resume) {
    const mismatch: string[] = [];
    if (existing.product !== NDVI_PRODUCT) mismatch.push('product');
    if (existing.band !== NDVI_BAND) mismatch.push('band');
    if (existing.collection !== NDVI_COLLECTION) mismatch.push('collection');
    if (existing.period.startYear !== args.startYear || existing.period.endYear !== args.endYear) mismatch.push('period');
    if (existing.pointsSha256 !== deps.pointsSha256) mismatch.push('pointsSha256');
    if (mismatch.length) throw new PipelineError(`Manifest does not match this run (${mismatch.join(', ')}). Use --force to start over.`);
  }

  const plan = await buildPlan(args, deps);
  if (args.dryRun) {
    for (const line of describePlan(plan, deps.source.mode)) log(line);
    return { plan, sampledItems: 0, failedItems: 0, finalizedMunicipalities: 0, written: false };
  }

  if (args.force) { // wipe only this pipeline's outputs; points.json (input) and report.json stay
    await rm(path.join(dir, MANIFEST_FILE), { force: true });
    await rm(path.join(dir, 'states'), { recursive: true, force: true });
    await rm(path.join(dir, '.work'), { recursive: true, force: true });
  }
  await mkdir(path.join(dir, 'states'), { recursive: true });
  await mkdir(path.join(dir, '.work'), { recursive: true });
  const removedTmp = await removeTmp(dir);
  if (removedTmp) log(`recovery: removed ${removedTmp} stale .tmp file(s)`);

  const generator = deps.generator ?? await sourceSha256('scripts/fetch-ndvi-brazil.ts');
  const manifest: ProgressManifest = args.resume && existing ? { ...existing, sourceMode: deps.source.mode, generator, catalog: deps.catalog } : {
    formatVersion: NDVI_BRAZIL_FORMAT_VERSION, product: NDVI_PRODUCT, band: NDVI_BAND, collection: NDVI_COLLECTION,
    period: { startYear: args.startYear, endYear: args.endYear }, sourceMode: deps.source.mode, catalog: deps.catalog, pointsSha256: deps.pointsSha256,
    generator, updatedAt: now().toISOString(), processedItems: [], completedMunicipalities: [], recoverableFailures: [], permanentFailures: [], stateChecksums: {},
  };

  // Verify existing state files against their checksums; a corrupt one is distrusted and its municipalities re-finalized.
  const states = new Map<string, StateNdviArtifact>();
  const loadState = async (uf: string): Promise<StateNdviArtifact | undefined> => {
    if (states.has(uf)) return states.get(uf);
    const file = path.join(dir, 'states', `${uf}.json`);
    if (!(await exists(file))) return undefined;
    const text = await readFile(file);
    const expectedSum = manifest.stateChecksums[uf];
    let parsed: StateNdviArtifact | undefined;
    try { parsed = JSON.parse(text.toString('utf8')) as StateNdviArtifact; } catch { parsed = undefined; }
    if (!expectedSum || sha256(text) !== expectedSum || !parsed || !Array.isArray(parsed.records)) {
      log(`recovery: states/${uf}.json failed integrity check; its municipalities will be re-finalized`);
      const lost = new Set((parsed?.records ?? []).map((r) => r.ibgeCode));
      const lostByUf = deps.points.filter((p) => p.uf === uf).map((p) => p.ibgeCode);
      for (const code of lostByUf) lost.add(code);
      manifest.completedMunicipalities = manifest.completedMunicipalities.filter((c) => !lost.has(c));
      delete manifest.stateChecksums[uf];
      await rm(file, { force: true });
      return undefined;
    }
    states.set(uf, parsed);
    return parsed;
  };
  if (args.resume) {
    for (const uf of new Set(deps.points.map((p) => p.uf))) await loadState(uf);
  }

  const checkpoint = async () => {
    manifest.updatedAt = now().toISOString();
    await atomicWrite(path.join(dir, MANIFEST_FILE), `${JSON.stringify(manifest, null, 1)}\n`);
  };
  await checkpoint();

  const expected = plan.expectedPerTile;
  const processed = new Set(manifest.processedItems);
  const completed = new Set(manifest.completedMunicipalities);
  let sampled = 0; let failed = 0; let finalized = 0; let sinceCheckpoint = 0;
  const limit = makeLimiter(args.concurrency);

  for (const [tileIndex, tile] of plan.tiles.entries()) {
    const workFile = path.join(dir, '.work', `${tile.tile}.ndjson`);
    // a crash can leave a truncated last line without newline: terminate it so the next append starts a fresh line
    const rawWork = await readFile(workFile, 'utf8').catch(() => '');
    if (rawWork && !rawWork.endsWith('\n')) await appendFile(workFile, '\n');
    let work = await readWork(workFile);
    // processed according to manifest but absent from the work store (lost/truncated): sample again
    // (or stored for a smaller point selection that does not cover every point of this tile now): sample again
    const codes = tile.points.map((p) => p.ibgeCode);
    for (const item of tile.items) {
      const line = work.get(item.id);
      const covers = !!line && codes.every((c) => line.codes.includes(c));
      if (processed.has(item.id) && !covers) processed.delete(item.id);
      else if (!processed.has(item.id) && covers) processed.add(item.id); // appended before a crash, manifest lagged behind
    }
    const allDone = tile.points.every((p) => completed.has(p.ibgeCode));
    const todo = allDone ? [] : tile.items.filter((item) => !processed.has(item.id) && !manifest.permanentFailures.some((f) => f.itemId === item.id));
    log(`tile ${tile.tile} (${tileIndex + 1}/${plan.tiles.length}): ${tile.points.length} points, ${tile.items.length} items, ${todo.length} to sample`);
    let appendChain: Promise<void> = Promise.resolve();
    await Promise.all(todo.map((item) => limit(async () => {
      try {
        const raw = await deps.source.sample(item, tile.points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })));
        if (raw.length !== tile.points.length) throw new Error(`source returned ${raw.length} values for ${tile.points.length} points`);
        const line: WorkLine = { itemId: item.id, start: item.start, end: item.end, codes: tile.points.map((p) => p.ibgeCode), raw: raw.map((v) => (v === undefined ? null : v)) };
        appendChain = appendChain.then(() => appendFile(workFile, `${JSON.stringify(line)}\n`));
        await appendChain;
        processed.add(item.id);
        manifest.processedItems = [...processed];
        manifest.recoverableFailures = manifest.recoverableFailures.filter((f) => f.itemId !== item.id);
        sampled += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        if (isPermanentError(error)) manifest.permanentFailures = [...manifest.permanentFailures.filter((f) => f.itemId !== item.id), { itemId: item.id, error: message }];
        else {
          const previous = manifest.recoverableFailures.find((f) => f.itemId === item.id);
          manifest.recoverableFailures = [...manifest.recoverableFailures.filter((f) => f.itemId !== item.id), { itemId: item.id, error: message, attempts: (previous?.attempts ?? 0) + 1 }];
        }
        log(`item ${item.id} failed (${isPermanentError(error) ? 'permanent' : 'recoverable'}): ${message}`);
      }
      sinceCheckpoint += 1;
      if (sinceCheckpoint >= checkpointEvery) { sinceCheckpoint = 0; manifest.processedItems = [...processed]; await checkpoint(); log(`checkpoint: ${processed.size} items processed`); }
    })));
    manifest.processedItems = [...processed];

    // Finalize this tile's municipalities when every item is either processed or permanently failed
    const pending = tile.items.filter((item) => !processed.has(item.id) && !manifest.permanentFailures.some((f) => f.itemId === item.id));
    if (pending.length || allDone) { await checkpoint(); if (pending.length) log(`tile ${tile.tile}: ${pending.length} item(s) pending (recoverable failures); municipalities not finalized, use --resume`); continue; }
    work = await readWork(workFile);
    const fetchedAt = now().toISOString();
    const byUf = new Map<string, MunicipalNdviRecord[]>();
    for (const [index, point] of tile.points.entries()) {
      const series: Array<{ start: string; end: string; raw: number | null }> = [];
      for (const item of tile.items) {
        const line = work.get(item.id);
        if (!line) { series.push({ start: item.start, end: item.end, raw: null }); continue; } // permanently failed item: absent, never zero
        const at = line.codes[index] === point.ibgeCode ? index : line.codes.indexOf(point.ibgeCode);
        series.push({ start: item.start, end: item.end, raw: at >= 0 ? line.raw[at] : null });
      }
      byUf.set(point.uf, [...(byUf.get(point.uf) ?? []), buildRecord(point, series, expected, manifest.period, fetchedAt)]);
    }
    for (const [uf, records] of byUf) {
      const current = await loadState(uf);
      const merged = new Map((current?.records ?? []).map((r) => [r.ibgeCode, r]));
      for (const r of records) merged.set(r.ibgeCode, r);
      const artifact: StateNdviArtifact = { formatVersion: NDVI_BRAZIL_FORMAT_VERSION, uf, generatedAt: now().toISOString(), records: [...merged.values()].sort((a, b) => a.ibgeCode.localeCompare(b.ibgeCode)) };
      const text = `${JSON.stringify(artifact)}\n`;
      await atomicWrite(path.join(dir, 'states', `${uf}.json`), text);
      states.set(uf, artifact);
      manifest.stateChecksums[uf] = sha256(text);
      for (const r of records) completed.add(r.ibgeCode);
      finalized += records.length;
      manifest.completedMunicipalities = [...completed].sort();
      await checkpoint(); // checksum recorded right after the state file lands
      log(`UF ${uf}: ${records.length} municipalities finalized from tile ${tile.tile}`);
    }
  }
  manifest.processedItems = [...processed];
  manifest.completedMunicipalities = [...completed].sort();
  await checkpoint();
  log(`done: sampled ${sampled}, failed ${failed}, finalized ${finalized}`);
  return { plan, manifest, sampledItems: sampled, failedItems: failed, finalizedMunicipalities: finalized, written: true };
}
