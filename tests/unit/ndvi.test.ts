import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { monthlyNdvi, ndviFromRaw, relativeLowVegetationMonths } from '@/lib/climate/ndvi';
import { readNdviFixture } from '@/lib/climate/ndvi-fixture';
import { buildSourceHealth } from '@/lib/source-health';
import { analyze } from '@/lib/engine';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import type { AnalysisInput } from '@/lib/schema';

describe('MODIS NDVI', () => {
  it('scales raw NDVI and turns fill/out-of-range/missing values into null, never zero', () => {
    expect(ndviFromRaw(3159)).toBe(0.3159);
    expect(ndviFromRaw(0)).toBe(0);
    expect(ndviFromRaw(-3000)).toBeNull();
    expect(ndviFromRaw(12000)).toBeNull();
    expect(ndviFromRaw(-2500)).toBeNull();
    expect(ndviFromRaw(Number.NaN)).toBeNull();
    expect(ndviFromRaw(null)).toBeNull();
    expect(ndviFromRaw(undefined)).toBeNull();
  });
  it('takes monthly medians over valid composites and finds relative low months', () => {
    const observations = Array.from({ length: 12 }, (_, index) => [{ date: `2020-${String(index + 1).padStart(2, '0')}-10`, ndvi: index === 6 ? 0.2 : index === 7 ? null : 0.3 + index * 0.04 }, { date: `2021-${String(index + 1).padStart(2, '0')}-10`, ndvi: index === 6 ? 0.22 : 0.3 + index * 0.04 }]).flat();
    const months = monthlyNdvi(observations);
    expect(months[6]).toMatchObject({ month: 7, medianNdvi: 0.21, validObservations: 2, years: 2 });
    expect(months[7]).toMatchObject({ validObservations: 1 });
    expect(relativeLowVegetationMonths(months)).toEqual([1, 2, 7]);
    expect(relativeLowVegetationMonths(months.slice(0, 5).map((month) => ({ ...month })))).toEqual([]);
    expect(relativeLowVegetationMonths(monthlyNdvi([]))).toEqual([]);
  });
});

describe('NDVI fixture reader', () => {
  const site = { latitude: -17.798, longitude: -50.919 };
  const series = JSON.stringify([{ date: '2020-01-01', ndvi: 0.6 }, { date: '2020-01-17', ndvi: null }, { date: '2020-02-18', ndvi: 0.7 }]);
  const write = async (rawText: string, hash?: string, coords = site) => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'ndvi-'));
    await writeFile(path.join(dir, 'rio-verde.json'), rawText);
    await writeFile(path.join(dir, 'rio-verde.meta.json'), JSON.stringify({ sourceUrl: 'https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset', fetchedAt: '2026-11-14T10:00:00.000Z', sha256: hash ?? createHash('sha256').update(rawText).digest('hex'), requestedCoordinates: coords, product: 'MOD13Q1', band: '250m_16_days_NDVI' }));
    return dir;
  };
  it('reads a hash-verified exact-coordinate fixture', async () => {
    const context = await readNdviFixture(site, await write(series));
    expect(context).toMatchObject({ origin: 'verified_fixture', observations: 3, validObservations: 2, coveragePct: 66.67, period: { start: '2020-01-01', end: '2020-02-18' } });
    expect(context?.months[0].medianNdvi).toBe(0.6);
  });
  it('refuses a tampered, mismatched, malformed or absent fixture', async () => {
    expect(await readNdviFixture(site, await write(series, 'a'.repeat(64)))).toBeUndefined();
    expect(await readNdviFixture({ latitude: 1, longitude: 2 }, await write(series))).toBeUndefined();
    expect(await readNdviFixture(site, await write('[{"date":"2020-01-01","ndvi":7}]'))).toBeUndefined();
    expect(await readNdviFixture(site, path.join(os.tmpdir(), 'does-not-exist'))).toBeUndefined();
  });
  it('is N/D in the source health unless a verified series is present', () => {
    const input: AnalysisInput = { location: site, plantingMonth: 4, history: [{ cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' }], priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown' };
    const climate: ClimateContext = { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [], provenance: null, gaps: [] };
    expect(buildSourceHealth(analyze(input, climate)).find((item) => item.id === 'modis_ndvi')).toMatchObject({ state: 'nd', gap: 'ndvi_not_preprocessed' });
    const withNdvi = { ...climate, ndvi: { origin: 'verified_fixture' as const, product: 'MOD13Q1' as const, band: '250m_16_days_NDVI' as const, period: { start: '2011-01-01', end: '2025-12-19' }, fetchedAt: '2026-11-14T10:00:00.000Z', sourceUrl: 'https://modis.ornl.gov/', observations: 10, validObservations: 10, coveragePct: 100, months: monthlyNdvi([]) } };
    expect(buildSourceHealth(analyze(input, withNdvi)).find((item) => item.id === 'modis_ndvi')).toMatchObject({ state: 'cache_verified', gap: null });
  });
});

describe('committed NDVI fixtures', () => {
  it('load, verify their hashes and cover the full 2011-2025 series for every demonstration point', async () => {
    for (const site of [{ latitude: -17.798, longitude: -50.919 }, { latitude: -17.9, longitude: -50.85 }, { latitude: -12.6, longitude: -55.9 }, { latitude: -12.2, longitude: -45.9 }, { latitude: -24.9, longitude: -53.25 }, { latitude: 5.6037, longitude: -0.187 }, { latitude: 28.6139, longitude: 77.209 }]) {
      const context = await readNdviFixture(site);
      expect(context).toBeDefined();
      expect(context).toMatchObject({ origin: 'verified_fixture', product: 'MOD13Q1', band: '250m_16_days_NDVI', coveragePct: 100 });
      expect(context!.observations).toBeGreaterThanOrEqual(310);
      expect(context!.months).toHaveLength(12);
      expect(context!.months.every((month) => month.medianNdvi !== null && month.medianNdvi > 0 && month.medianNdvi < 1)).toBe(true);
    }
  });
  it('does not serve a nearby coordinate', async () => {
    expect(await readNdviFixture({ latitude: -17.7981, longitude: -50.919 })).toBeUndefined();
  });
});
