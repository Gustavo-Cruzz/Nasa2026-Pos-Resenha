import { describe, expect, it } from 'vitest';
import { buildNasaPowerUrl, parseNasaPowerPayload, readVerifiedPilotFixture } from '@/lib/climate/nasa-power';
import { historicalContextForCalendarDay, historicalPrecipitationByMonth, historicalWaterContextForMonth, precipitationForWindow } from '@/lib/climate/indicators';
import { RIO_VERDE_PILOT } from '@/lib/region';

const parameters = { T2M: { '20200101': 25, '20200102': -999 }, T2M_MAX: { '20200101': 30, '20200102': 31 }, T2M_MIN: { '20200101': 20, '20200102': 21 }, PRECTOTCORR: { '20200101': 10, '20200102': null }, RH2M: { '20200101': 60, '20200102': 61 }, WS2M: { '20200101': 2, '20200102': 3 }, ALLSKY_SFC_SW_DWN: { '20200101': 20, '20200102': 21 } };

describe('NASA POWER adapter', () => {
  it('builds the specified daily AG request', () => {
    const url = new URL(buildNasaPowerUrl(RIO_VERDE_PILOT.coordinates));
    expect(url.pathname).toBe('/api/temporal/daily/point');
    expect(url.searchParams.get('community')).toBe('AG');
    expect(url.searchParams.get('start')).toBe('20110101');
    expect(url.searchParams.get('end')).toBe('20251231');
    expect(url.searchParams.get('parameters')).toContain('PRECTOTCORR');
    expect(url.searchParams.get('parameters')).toContain('IMERG_PRECTOT');
    expect(url.searchParams.get('parameters')).toContain('GWETROOT');
    expect(url.searchParams.get('parameters')).toContain('TSOIL1');
  });

  it('keeps GPM rainfall distribution and modeled root-zone wetness observational', () => {
    const parsed = parseNasaPowerPayload({ properties: { parameter: { ...parameters, IMERG_PRECTOT: { '20200101': 12, '20200102': 0 }, GWETROOT: { '20200101': 0.62, '20200102': 0.66 } } } }, RIO_VERDE_PILOT.coordinates, 'https://example.test');
    expect(parsed.daily[0]).toMatchObject({ imergPrecipMm: 12, rootZoneWetness: 0.62 });
    expect(historicalWaterContextForMonth(parsed.daily, 1)).toMatchObject({ imergMedianTotalMm: 12, medianRainDays: 1, rootZoneWetnessMedian: 0.64, imergCoveragePct: 100, rootZoneCoveragePct: 100 });
  });

  it('does not invent enhanced water context when an older verified series lacks it', () => {
    const parsed = parseNasaPowerPayload({ properties: { parameter: parameters } }, RIO_VERDE_PILOT.coordinates, 'https://example.test');
    expect(historicalWaterContextForMonth(parsed.daily, 1)).toMatchObject({ imergMedianTotalMm: null, medianRainDays: null, rootZoneWetnessMedian: null });
  });

  it('summarizes the same calendar day across historical years instead of showing January by default', () => {
    const summary = historicalContextForCalendarDay([
      { date: '20201114', tmeanC: 24, tmaxC: 29, tminC: 19, precipMm: 2, rhPct: 60, windMps: 2, solarMjM2Day: 15, imergPrecipMm: 3, rootZoneWetness: 0.6 },
      { date: '20211114', tmeanC: 28, tmaxC: 33, tminC: 23, precipMm: 6, rhPct: 62, windMps: 2, solarMjM2Day: 15, imergPrecipMm: 5, rootZoneWetness: 0.7 },
    ], 11, 14);
    expect(summary).toMatchObject({ month: 11, day: 14, tmeanMedianC: 26, precipMedianMm: 4, imergPrecipMedianMm: 4, rootZoneWetnessMedian: 0.65, validYears: 2, expectedYears: 2 });
  });

  it('builds twelve historical precipitation windows without inventing missing months', () => {
    const summaries = historicalPrecipitationByMonth([
      { date: '20200101', tmeanC: 20, tmaxC: 25, tminC: 15, precipMm: 10, rhPct: 60, windMps: 2, solarMjM2Day: 15 },
      { date: '20210101', tmeanC: 21, tmaxC: 26, tminC: 16, precipMm: 20, rhPct: 61, windMps: 2, solarMjM2Day: 15 },
    ]);
    expect(summaries).toHaveLength(12);
    expect(summaries[0]).toMatchObject({ month: 1, medianTotalMm: 15, validYears: 2 });
    expect(summaries[1]).toMatchObject({ month: 2, medianTotalMm: null, validYears: 0, expectedYears: 0 });
  });

  it('turns NASA sentinels and nulls into explicit missing values', () => {
    const parsed = parseNasaPowerPayload({ header: { fill_value: -999 }, properties: { parameter: parameters } }, RIO_VERDE_PILOT.coordinates, 'https://example.test');
    expect(parsed.daily[1]).toMatchObject({ tmeanC: null, precipMm: null });
    expect(parsed.provenance.missingDays).toContain('20200102');
  });

  it('reports precipitation coverage instead of treating missing rain as zero', () => {
    const parsed = parseNasaPowerPayload({ properties: { parameter: parameters } }, RIO_VERDE_PILOT.coordinates, 'https://example.test');
    expect(precipitationForWindow(parsed.daily, '20200101', '20200102')).toEqual({ totalMm: 10, validDays: 1, expectedDays: 2, coveragePct: 50 });
  });

  it('never uses a Rio Verde fixture for a different coordinate', async () => {
    await expect(readVerifiedPilotFixture({ latitude: -17.7, longitude: -50.9 })).resolves.toBeUndefined();
  });

  it('accepts the SHA-verified real Rio Verde fixture with documented units', async () => {
    const fixture = await readVerifiedPilotFixture(RIO_VERDE_PILOT.coordinates);
    expect(fixture?.daily).toHaveLength(5479);
    expect(fixture?.provenance.coveragePct.PRECTOTCORR).toBe(100);
    expect(fixture?.provenance.coveragePct.IMERG_PRECTOT).toBe(100);
    expect(fixture?.provenance.coveragePct.GWETROOT).toBe(100);
    expect(fixture?.provenance.rawParameterNames).toEqual(expect.arrayContaining(['IMERG_PRECTOT', 'GWETROOT']));
    expect(fixture?.provenance.warnings).toEqual([]);
  });
});
