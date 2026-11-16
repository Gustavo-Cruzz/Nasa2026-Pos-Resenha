/**
 * Validator for the national municipal NDVI artifacts. Relative imports only (runs under node --experimental-strip-types).
 * Reports counts per status and UF; it never computes national agronomic averages or rankings.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { MANIFEST_FILE, POINTS_FILE } from './ndvi-brazil-pipeline.ts';
import { NDVI_BAND, NDVI_COMPOSITES_PER_YEAR, NDVI_MIN_LISTED_FRACTION, NDVI_MIN_VALID_FRACTION, NDVI_PRODUCT, type ProgressManifest } from './ndvi-brazil-types.ts';

const monthSchema = z.object({ month: z.number().int().min(1).max(12), medianNdvi: z.number().nullable(), validObservations: z.number().int().min(0), years: z.number().int().min(0) });
const recordSchema = z.object({
  ibgeCode: z.string().regex(/^\d{7}$/), municipality: z.string().min(1), uf: z.string().length(2),
  point: z.object({ latitude: z.number(), longitude: z.number(), method: z.string() }),
  product: z.literal(NDVI_PRODUCT), band: z.literal(NDVI_BAND),
  period: z.object({ start: z.string(), end: z.string() }),
  observations: z.number().int().min(0), validObservations: z.number().int().min(0), coveragePct: z.number().min(0).max(100),
  monthlyClimatology: z.array(monthSchema).length(12),
  status: z.enum(['available', 'insufficient_coverage', 'unavailable']),
  source: z.object({ provider: z.string().min(1), sourceUrl: z.string().min(1), fetchedAt: z.string().min(1) }),
});
export const stateSchema = z.object({ formatVersion: z.number(), uf: z.string().length(2), generatedAt: z.string(), records: z.array(recordSchema) });

export type CatalogEntry = { code: string; uf: string };
export type ValidationReport = {
  generatedAt: string; complete: boolean; expected: number; processed: number; missing: number; missingSample: string[];
  available: number; insufficient: number; unavailable: number;
  perUf: Record<string, { expected: number; processed: number; available: number; insufficient: number; unavailable: number }>;
  coverage: { mean: number | null; min: number | null; max: number | null };
  duplicates: string[]; invalidPoints: string[]; period: { start: string; end: string } | null; stacItemsUsed: number;
  errors: string[]; warnings: string[];
};

const MAX_LISTED = 20;
const sha256 = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');

/** Reads the catalog; its length (5571 for IBGE 2025) is the expected count, not a hard-coded number. */
export async function readCatalog(file = 'data/brazil-municipalities.json'): Promise<CatalogEntry[]> {
  const parsed = JSON.parse(await readFile(file, 'utf8')) as { count?: number; municipalities: Array<{ code: string; uf: string }> };
  return parsed.municipalities.map((m) => ({ code: m.code, uf: m.uf }));
}

export async function validateNdviBrazil(options: { dir: string; catalog: CatalogEntry[]; now?: () => Date; requireComplete?: boolean }): Promise<ValidationReport> {
  const { dir, catalog } = options;
  const errors: string[] = []; const warnings: string[] = [];
  const catalogByCode = new Map(catalog.map((c) => [c.code, c]));
  const report: ValidationReport = {
    generatedAt: (options.now?.() ?? new Date()).toISOString(), complete: false, expected: catalog.length, processed: 0, missing: 0, missingSample: [],
    available: 0, insufficient: 0, unavailable: 0, perUf: {}, coverage: { mean: null, min: null, max: null }, duplicates: [], invalidPoints: [], period: null, stacItemsUsed: 0, errors, warnings,
  };
  const perUf = (uf: string) => (report.perUf[uf] ??= { expected: 0, processed: 0, available: 0, insufficient: 0, unavailable: 0 });
  for (const c of catalog) perUf(c.uf).expected += 1;

  // points
  try {
    const points = (JSON.parse(await readFile(path.join(dir, POINTS_FILE), 'utf8')) as { count?: number; points?: Array<{ ibgeCode: string; uf: string; latitude: number; longitude: number }> }).points ?? [];
    if (points.length !== catalog.length) errors.push(`points.json has ${points.length} points, catalog has ${catalog.length}`);
    const seen = new Set<string>();
    for (const p of points) {
      const bad = !/^\d{7}$/.test(String(p.ibgeCode)) || !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) || p.latitude < -34 || p.latitude > 6 || p.longitude < -74.5 || p.longitude > -28;
      if (bad) report.invalidPoints.push(String(p.ibgeCode));
      else if (!catalogByCode.has(p.ibgeCode)) report.invalidPoints.push(`${p.ibgeCode} (not in catalog)`);
      else if (catalogByCode.get(p.ibgeCode)!.uf !== p.uf) report.invalidPoints.push(`${p.ibgeCode} (uf mismatch)`);
      if (seen.has(p.ibgeCode)) report.duplicates.push(`point:${p.ibgeCode}`);
      seen.add(p.ibgeCode);
    }
    for (const c of catalog) if (!seen.has(c.code)) errors.push(`catalog municipality ${c.code} has no point`);
    if (report.invalidPoints.length) errors.push(`${report.invalidPoints.length} invalid point(s): ${report.invalidPoints.slice(0, MAX_LISTED).join(', ')}`);
  } catch (error) { errors.push(`cannot read ${POINTS_FILE}: ${error instanceof Error ? error.message : error}`); }

  // manifest
  let manifest: ProgressManifest | undefined;
  try { manifest = JSON.parse(await readFile(path.join(dir, MANIFEST_FILE), 'utf8')) as ProgressManifest; } catch { warnings.push(`no readable ${MANIFEST_FILE}: checksums and period rules cannot be verified`); }
  if (manifest) report.stacItemsUsed = new Set(manifest.processedItems).size;
  const years = manifest ? manifest.period.endYear - manifest.period.startYear + 1 : undefined;
  const expectedComposites = years ? years * NDVI_COMPOSITES_PER_YEAR : undefined;

  // states
  const files = (await readdir(path.join(dir, 'states')).catch(() => [] as string[])).filter((n) => n.endsWith('.json')).sort();
  const records = new Map<string, number>();
  const coverages: number[] = [];
  let first: string | undefined; let last: string | undefined;
  for (const name of files) {
    const uf = name.slice(0, -5);
    const bytes = await readFile(path.join(dir, 'states', name));
    if (manifest) {
      const sum = manifest.stateChecksums[uf];
      if (!sum) errors.push(`states/${name}: no checksum in manifest`);
      else if (sum !== sha256(bytes)) errors.push(`states/${name}: checksum mismatch (corrupt or edited)`);
    }
    let parsed: z.infer<typeof stateSchema>;
    try { parsed = stateSchema.parse(JSON.parse(bytes.toString('utf8'))); } catch (error) {
      errors.push(`states/${name}: schema invalid (${error instanceof z.ZodError ? error.issues[0]?.message : 'unreadable JSON'})`); continue;
    }
    if (parsed.uf !== uf) errors.push(`states/${name}: uf field ${parsed.uf} does not match file name`);
    let previousCode = '';
    for (const r of parsed.records) {
      const where = `${r.ibgeCode}`;
      if (r.ibgeCode < previousCode) warnings.push(`states/${name}: records not sorted at ${where}`);
      previousCode = r.ibgeCode;
      records.set(r.ibgeCode, (records.get(r.ibgeCode) ?? 0) + 1);
      const entry = catalogByCode.get(r.ibgeCode);
      if (!entry) { errors.push(`${where}: not in catalog`); continue; }
      if (entry.uf !== uf || r.uf !== uf) errors.push(`${where}: in states/${name} but catalog UF is ${entry.uf}`);
      report.processed += 1;
      const row = perUf(uf); row.processed += 1;
      if (r.status === 'available') { report.available += 1; row.available += 1; } else if (r.status === 'insufficient_coverage') { report.insufficient += 1; row.insufficient += 1; } else { report.unavailable += 1; row.unavailable += 1; }
      coverages.push(r.coveragePct);
      if (r.observations) { first = !first || r.period.start < first ? r.period.start : first; last = !last || r.period.end > last ? r.period.end : last; }
      if (r.validObservations > r.observations) errors.push(`${where}: validObservations > observations`);
      let monthlyValid = 0;
      for (const m of r.monthlyClimatology) {
        monthlyValid += m.validObservations;
        if (m.medianNdvi !== null && (m.medianNdvi < -0.2 || m.medianNdvi > 1)) errors.push(`${where}: month ${m.month} NDVI ${m.medianNdvi} outside [-0.2, 1]`);
        if (m.medianNdvi === null && m.validObservations > 0) errors.push(`${where}: month ${m.month} has valid observations but null median`);
        if (m.medianNdvi !== null && m.validObservations === 0) errors.push(`${where}: month ${m.month} has a median with 0 valid observations (zero-for-missing)`);
      }
      if (monthlyValid !== r.validObservations) errors.push(`${where}: monthly valid observations (${monthlyValid}) differ from validObservations (${r.validObservations})`);
      const pct = r.observations ? (r.validObservations / r.observations) * 100 : 0;
      if (Math.abs(pct - r.coveragePct) > 0.01) errors.push(`${where}: coveragePct ${r.coveragePct} inconsistent with ${r.validObservations}/${r.observations}`);
      if (r.validObservations === 0 && r.status !== 'unavailable') errors.push(`${where}: no valid observations but status ${r.status}`);
      if (r.observations === 0 && r.status !== 'unavailable') errors.push(`${where}: no observations but status ${r.status}`);
      if (r.status === 'unavailable' && r.validObservations > 0) errors.push(`${where}: status unavailable with valid observations`);
      if (expectedComposites && r.validObservations > 0) {
        const should = r.observations >= expectedComposites * NDVI_MIN_LISTED_FRACTION && r.validObservations >= r.observations * NDVI_MIN_VALID_FRACTION ? 'available' : 'insufficient_coverage';
        if (r.status !== should) errors.push(`${where}: status ${r.status} inconsistent with coverage rules (expected ${should})`);
      }
    }
  }
  for (const [code, n] of records) if (n > 1) report.duplicates.push(`record:${code} x${n}`);
  if (report.duplicates.length) errors.push(`${report.duplicates.length} duplicate(s): ${report.duplicates.slice(0, MAX_LISTED).join(', ')}`);
  report.processed = records.size;
  const missing = catalog.filter((c) => !records.has(c.code)).map((c) => c.code);
  report.missing = missing.length; report.missingSample = missing.slice(0, MAX_LISTED);
  report.complete = missing.length === 0 && catalog.length > 0;
  if (!report.complete) {
    const msg = `incomplete run: ${records.size}/${catalog.length} municipalities have a record (${missing.length} missing); no national coverage is claimed`;
    (options.requireComplete ? errors : warnings).push(msg);
  }
  if (coverages.length) report.coverage = { mean: Number((coverages.reduce((s, v) => s + v, 0) / coverages.length).toFixed(2)), min: Math.min(...coverages), max: Math.max(...coverages) };
  if (first && last) report.period = { start: first, end: last };
  return report;
}
