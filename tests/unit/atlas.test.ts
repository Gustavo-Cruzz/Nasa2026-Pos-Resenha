import { describe, expect, it } from 'vitest';
import { ATLAS_EXAMPLES, atlasPointSchema, climateApiResponseSchema, SMAP_GIBS_DATE, SMAP_GIBS_LAYER, SMAP_GIBS_TILE_URL } from '@/lib/atlas';
import { fieldShiftMapAttribution, fieldShiftMapStyleUrl } from '@/lib/atlas-map-style';

describe('atlas contracts', () => {
  it('pins the official dated SMAP GIBS visual layer', () => { expect(SMAP_GIBS_LAYER).toBe('SMAP_L4_Analyzed_Root_Zone_Soil_Moisture'); expect(SMAP_GIBS_DATE).toBe('2025-06-30'); expect(SMAP_GIBS_TILE_URL).toContain('gibs.earthdata.nasa.gov'); expect(SMAP_GIBS_TILE_URL).toContain('{z}/{y}/{x}.png'); });
  it('offers globally separated examples within coordinate bounds', () => {
    expect(ATLAS_EXAMPLES.map((point) => point.label)).toEqual(['Rio Verde (GO), Brasil', 'Acra, Gana', 'Nova Délhi, Índia']);
    expect(ATLAS_EXAMPLES.every((point) => atlasPointSchema.safeParse(point).success)).toBe(true);
  });
  it('rejects a coordinate outside global bounds', () => expect(atlasPointSchema.safeParse({ latitude: 91, longitude: 0 }).success).toBe(false));
  it('uses the attributed real-world map style', () => {
    expect(fieldShiftMapStyleUrl).toBe('https://tiles.openfreemap.org/styles/liberty');
    expect(fieldShiftMapAttribution).toContain('OpenStreetMap');
  });
  it('accepts documented climate response but not an incomplete response', () => {
    const valid = { status: 'ok', origin: 'live', climateSummary: { monthly: [{ month: 1, tmeanMedianC: 25, precipMedianMm: 4, validTemperatureDays: 31, validPrecipitationDays: 31 }], plantingMonthPrecipitation: { month: 1, medianTotalMm: 124, validYears: 15, expectedYears: 15, coveragePct: 100 } }, provenance: { sourceUrl: 'https://example.test/nasa', period: { start: '20110101', end: '20251231' }, fetchedAt: '2026-11-12T00:00:00.000Z', coveragePct: { T2M: 100, PRECTOTCORR: 100 }, missingDays: [] }, warnings: [] };
    expect(climateApiResponseSchema.safeParse(valid).success).toBe(true);
    expect(climateApiResponseSchema.safeParse({ status: 'ok' }).success).toBe(false);
  });
});
