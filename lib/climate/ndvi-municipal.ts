import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { NdviContext } from '@/lib/climate/ndvi';
import { NDVI_BAND, NDVI_BRAZIL_DIR, NDVI_PRODUCT, type MunicipalNdviRecord } from '@/lib/climate/ndvi-brazil-types';

/**
 * Server-only: reads the national municipal MODIS NDVI artifact (data/ndvi-brazil).
 * Resolves strictly by a 7-digit IBGE code that came from the IBGE mesh; never by coordinate or UF alone.
 * Any absence, checksum mismatch, schema failure or non-'available' status yields undefined (N/D).
 */
const UF_BY_STATE_CODE: Record<string, string> = { '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO', '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF' };

const monthSchema = z.object({ month: z.number().int().min(1).max(12), medianNdvi: z.number().min(-0.2).max(1).nullable(), validObservations: z.number().int().min(0), years: z.number().int().min(0) });
const recordSchema = z.object({
  ibgeCode: z.string().regex(/^\d{7}$/), municipality: z.string().min(1), uf: z.string().length(2),
  point: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), method: z.string() }),
  product: z.literal(NDVI_PRODUCT), band: z.literal(NDVI_BAND),
  period: z.object({ start: z.string(), end: z.string() }),
  observations: z.number().int().min(0), validObservations: z.number().int().min(0), coveragePct: z.number().min(0).max(100),
  monthlyClimatology: z.array(monthSchema).length(12),
  status: z.enum(['available', 'insufficient_coverage', 'unavailable']),
  source: z.object({ provider: z.string(), sourceUrl: z.string().url(), fetchedAt: z.string().datetime() }),
});
const stateSchema = z.object({ formatVersion: z.number(), uf: z.string().length(2), generatedAt: z.string(), records: z.array(recordSchema) });
const manifestSchema = z.object({ stateChecksums: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)) }).passthrough();

type CachedState = { records: Map<string, MunicipalNdviRecord> };
const stateCache = new Map<string, CachedState>();
const manifestCache = new Map<string, { signature: string; checksums: Record<string, string> }>();

async function loadChecksums(directory: string): Promise<Record<string, string> | undefined> {
  const file = path.join(directory, 'manifest.json');
  const info = await stat(file);
  const signature = `${info.mtimeMs}:${info.size}`;
  const cached = manifestCache.get(file);
  if (cached?.signature === signature) return cached.checksums;
  const manifest = manifestSchema.parse(JSON.parse(await readFile(file, 'utf8')));
  manifestCache.set(file, { signature, checksums: manifest.stateChecksums });
  return manifest.stateChecksums;
}

export async function readMunicipalNdvi(ibgeCode: string, directory = path.join(process.cwd(), NDVI_BRAZIL_DIR)): Promise<NdviContext | undefined> {
  if (typeof ibgeCode !== 'string' || !/^\d{7}$/.test(ibgeCode)) return undefined;
  const uf = UF_BY_STATE_CODE[ibgeCode.slice(0, 2)];
  if (!uf) return undefined;
  try {
    const checksums = await loadChecksums(directory);
    const expected = checksums?.[uf];
    if (!expected) return undefined;
    const key = `${directory}|${uf}|${expected}`;
    let state = stateCache.get(key);
    if (!state) {
      const raw = await readFile(path.join(directory, 'states', `${uf}.json`));
      if (createHash('sha256').update(raw).digest('hex') !== expected) return undefined;
      const parsed = stateSchema.parse(JSON.parse(raw.toString('utf8')));
      if (parsed.uf !== uf) return undefined;
      state = { records: new Map(parsed.records.filter((record) => record.uf === uf).map((record) => [record.ibgeCode, record as MunicipalNdviRecord])) };
      stateCache.set(key, state);
    }
    const record = state.records.get(ibgeCode);
    if (!record || record.status !== 'available') return undefined;
    return {
      origin: 'municipal_artifact',
      scope: { kind: 'municipal', ibgeCode: record.ibgeCode, municipality: record.municipality, uf: record.uf, point: { latitude: record.point.latitude, longitude: record.point.longitude, method: record.point.method } },
      product: record.product, band: record.band, period: record.period, fetchedAt: record.source.fetchedAt, sourceUrl: record.source.sourceUrl,
      observations: record.observations, validObservations: record.validObservations, coveragePct: record.coveragePct, months: record.monthlyClimatology,
    };
  } catch { return undefined; }
}
