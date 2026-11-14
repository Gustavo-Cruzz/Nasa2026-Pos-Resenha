import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { Coordinates } from '@/lib/schema';
import { NDVI_FIXTURE_SITES, monthlyNdvi, type NdviContext } from '@/lib/climate/ndvi';

/** Server-only: reads a pre-processed NDVI series, accepting it only when the SHA-256 and the exact coordinates match. */
const metaSchema = z.object({ sourceUrl: z.string().url(), fetchedAt: z.string().datetime(), sha256: z.string().regex(/^[a-f0-9]{64}$/), requestedCoordinates: z.object({ latitude: z.number(), longitude: z.number() }), product: z.literal('MOD13Q1'), band: z.literal('250m_16_days_NDVI') });

export async function readNdviFixture(coordinates: Coordinates, directory = path.join(process.cwd(), 'data/ndvi')): Promise<NdviContext | undefined> {
  const site = NDVI_FIXTURE_SITES.find((item) => item.latitude === coordinates.latitude && item.longitude === coordinates.longitude);
  if (!site) return undefined;
  try {
    const [raw, rawMeta] = await Promise.all([readFile(path.join(directory, `${site.slug}.json`)), readFile(path.join(directory, `${site.slug}.meta.json`), 'utf8')]);
    const meta = metaSchema.parse(JSON.parse(rawMeta));
    if (meta.requestedCoordinates.latitude !== coordinates.latitude || meta.requestedCoordinates.longitude !== coordinates.longitude) return undefined;
    if (createHash('sha256').update(raw).digest('hex') !== meta.sha256) return undefined;
    const observations = z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), ndvi: z.number().min(-0.2).max(1).nullable() })).min(1).parse(JSON.parse(raw.toString('utf8')));
    const valid = observations.filter((item) => item.ndvi !== null).length;
    const dates = observations.map((item) => item.date).sort();
    return { origin: 'verified_fixture', product: meta.product, band: meta.band, period: { start: dates[0], end: dates[dates.length - 1] }, fetchedAt: meta.fetchedAt, sourceUrl: meta.sourceUrl, observations: observations.length, validObservations: valid, coveragePct: Number((valid / observations.length * 100).toFixed(2)), months: monthlyNdvi(observations) };
  } catch { return undefined; }
}
