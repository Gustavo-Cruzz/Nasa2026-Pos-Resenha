import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readMunicipalNdvi } from '@/lib/climate/ndvi-municipal';
import { readNdviFixture } from '@/lib/climate/ndvi-fixture';
import { ndviMunicipalCaveats } from '@/lib/climate/ndvi-copy';

const months = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, medianNdvi: index === 5 ? null : 0.4 + index * 0.02, validObservations: 20, years: 15 }));
const record = (ibgeCode: string, status: 'available' | 'insufficient_coverage' | 'unavailable' = 'available') => ({
  ibgeCode, municipality: `Cidade ${ibgeCode}`, uf: 'GO', point: { latitude: -17.8, longitude: -50.9, method: 'centroid_inside' }, product: 'MOD13Q1', band: '250m_16_days_NDVI',
  period: { start: '2011-01-01', end: '2025-12-19' }, observations: 345, validObservations: 300, coveragePct: 86.96, monthlyClimatology: months, status,
  source: { provider: 'Planetary Computer', sourceUrl: 'https://planetarycomputer.microsoft.com/dataset/modis-13Q1-061', fetchedAt: '2026-11-15T10:00:00.000Z' },
});

async function artifact(options: { checksum?: string; withManifest?: boolean } = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ndvi-br-'));
  await mkdir(path.join(dir, 'states'));
  const state = JSON.stringify({ formatVersion: 1, uf: 'GO', generatedAt: '2026-11-15T10:00:00.000Z', records: [record('5218805'), record('5201108', 'insufficient_coverage')] });
  await writeFile(path.join(dir, 'states', 'GO.json'), state);
  if (options.withManifest !== false) await writeFile(path.join(dir, 'manifest.json'), JSON.stringify({ formatVersion: 1, stateChecksums: { GO: options.checksum ?? createHash('sha256').update(state).digest('hex') } }));
  return dir;
}

describe('municipal NDVI artifact reader', () => {
  it('resolves NDVI by IBGE code and preserves provenance and period', async () => {
    const context = await readMunicipalNdvi('5218805', await artifact());
    expect(context).toMatchObject({ origin: 'municipal_artifact', product: 'MOD13Q1', band: '250m_16_days_NDVI', period: { start: '2011-01-01', end: '2025-12-19' }, fetchedAt: '2026-11-15T10:00:00.000Z', sourceUrl: 'https://planetarycomputer.microsoft.com/dataset/modis-13Q1-061', observations: 345, validObservations: 300, coveragePct: 86.96, scope: { kind: 'municipal', ibgeCode: '5218805', uf: 'GO', point: { latitude: -17.8, longitude: -50.9, method: 'centroid_inside' } } });
    expect(context?.months).toHaveLength(12);
    expect(context?.months[5].medianNdvi).toBeNull();
  });
  it('is N/D for insufficient coverage, unprocessed municipality, missing artifact and checksum mismatch', async () => {
    const dir = await artifact();
    expect(await readMunicipalNdvi('5201108', dir)).toBeUndefined();
    expect(await readMunicipalNdvi('5208707', dir)).toBeUndefined();
    expect(await readMunicipalNdvi('3550308', dir)).toBeUndefined();
    expect(await readMunicipalNdvi('5218805', path.join(os.tmpdir(), 'ndvi-br-absent'))).toBeUndefined();
    expect(await readMunicipalNdvi('5218805', await artifact({ withManifest: false }))).toBeUndefined();
    expect(await readMunicipalNdvi('5218805', await artifact({ checksum: 'a'.repeat(64) }))).toBeUndefined();
  });
  it('never associates by UF or malformed code', async () => {
    const dir = await artifact();
    for (const code of ['GO', '52', '521880', '52188055', '5218805 ', '', 'abcdefg', '9918805']) expect(await readMunicipalNdvi(code, dir)).toBeUndefined();
    expect(await readMunicipalNdvi(undefined as unknown as string, dir)).toBeUndefined();
  });
  it('keeps the pilot fixture path independent and the copy complete', async () => {
    expect(await readNdviFixture({ latitude: -17.798, longitude: -50.919 }, path.join(os.tmpdir(), 'ndvi-absent'))).toBeUndefined();
    expect(await readNdviFixture({ latitude: -17.798, longitude: -50.919 })).toMatchObject({ origin: 'verified_fixture' });
    expect(ndviMunicipalCaveats('pt-BR')).toContain('Série histórica, não previsão.');
    expect(ndviMunicipalCaveats('en')).toHaveLength(4);
  });
});
