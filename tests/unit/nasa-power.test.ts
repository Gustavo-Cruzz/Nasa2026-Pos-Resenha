import { describe, expect, it } from 'vitest';
import { buildNasaPowerUrl, parseNasaPowerPayload, readVerifiedPilotFixture } from '@/lib/climate/nasa-power';
import { precipitationForWindow } from '@/lib/climate/indicators';
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
    expect(fixture?.provenance.warnings).toEqual([]);
  });
});
