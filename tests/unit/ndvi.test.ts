import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { modisDateToIso, monthlyNdvi, parseModisSubset, relativeLowVegetationMonths } from '@/lib/climate/ndvi';
import { readNdviFixture } from '@/lib/climate/ndvi-fixture';
import { buildSourceHealth } from '@/lib/source-health';
import { analyze } from '@/lib/engine';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import type { AnalysisInput } from '@/lib/schema';

const subset = (items: Array<[string, number, string?]>) => ({ band: 'all', subset: items.map(([date, value, band]) => ({ band: band ?? '250m_16_days_NDVI', modis_date: date, proc_date: '2018066165607', title: 'h11v05', version: '006', data: [value] })) });

describe('MODIS NDVI', () => {
  it('converts MODIS dates', () => {
    expect(modisDateToIso('A2018049')).toBe('2018-02-18');
    expect(modisDateToIso('A2020001')).toBe('2020-01-01');
    expect(modisDateToIso('2018049')).toBeNull();
    expect(modisDateToIso('A2018400')).toBeNull();
  });
  it('scales NDVI and turns fill/out-of-range values into null, never zero', () => {
    const rows = parseModisSubset(subset([['A2018049', 4581], ['A2018065', -3000], ['A2018081', 12000], ['A2018097', 0], ['A2018113', 5000, 'other_band']]));
    expect(rows).toEqual([{ date: '2018-02-18', ndvi: 0.4581 }, { date: '2018-03-06', ndvi: null }, { date: '2018-03-22', ndvi: null }, { date: '2018-04-07', ndvi: 0 }]);
  });
  it('rejects unexpected response shapes instead of guessing', () => {
    expect(() => parseModisSubset({ nope: true })).toThrow();
    expect(() => parseModisSubset({ subset: [{ band: '250m_16_days_NDVI', modis_date: 'bad', data: [1] }] })).toThrow();
    expect(() => parseModisSubset({ subset: [] })).toThrow();
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
