import { describe, expect, it } from 'vitest';
import { buildJoaoData } from '@/components/atlas/joao-data';
import type { JsonState } from '@/components/atlas/use-json';
import type { ClimateApiResponse } from '@/lib/atlas';

type Climate = Extract<ClimateApiResponse, { status: 'ok' }>;
const climate = { status: 'ok', origin: 'live', climateSummary: { monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [{ month: 11, medianTotalMm: 167, validYears: 15, expectedYears: 15, coveragePct: 100 }], lastYear: { year: 2025, months: [] }, seasonality: { rainySeason: null, drySpells: null }, rootZoneByMonth: [] }, provenance: { sourceUrl: 'https://example.test', period: { start: '20110101', end: '20251231' }, fetchedAt: '2026-11-15T00:00:00Z', coveragePct: {}, missingDays: [] }, warnings: [] } as unknown as Climate;
const loading: JsonState<never> = { kind: 'loading' };

describe('buildJoaoData', () => {
  it('turns a loading reading into "loading" and a failed one into "unavailable", never into a value', () => {
    const data = buildJoaoData({ placeName: 'X', month: 11, climate, forecast: loading, enso: { kind: 'error' }, regional: { kind: 'idle' } });
    expect(data.forecast).toEqual({ state: 'loading' });
    expect(data.enso).toEqual({ state: 'unavailable' });
    expect(data.crops).toEqual({ state: 'loading' });
  });
  it('keeps "no rainy season" (null) apart from "not computed" (undefined)', () => {
    expect(buildJoaoData({ placeName: null, month: 1, climate, forecast: loading, enso: loading, regional: loading }).climate.rainySeason).toBeNull();
    const bare = { ...climate, climateSummary: { ...climate.climateSummary, seasonality: undefined } } as Climate;
    expect(buildJoaoData({ placeName: null, month: 1, climate: bare, forecast: loading, enso: loading, regional: loading }).climate.rainySeason).toBeUndefined();
  });
  it('maps the municipality and its crops only for Brazilian points', () => {
    const context = (country: 'BR' | null) => ({ country, municipality: country ? { code: '1', name: 'Rio Verde', uf: 'GO' } : null, pam: country ? { year: '2025', products: [{ productCode: '1', productLabel: 'Soja (em grão)', cropIds: ['soybean'], harvestedAreaHa: 10, producedQuantity: 1, productionUnit: 't', caveat: null }] } : null });
    const read = (country: 'BR' | null) => buildJoaoData({ placeName: null, month: 1, climate, forecast: loading, enso: loading, regional: { kind: 'ready', data: context(country) as never } }).crops;
    expect(read('BR')).toEqual({ state: 'ready', value: { municipality: 'Rio Verde', year: '2025', products: [{ label: 'Soja (em grão)', harvestedAreaHa: 10 }] } });
    expect(read(null)).toEqual({ state: 'ready', value: { municipality: null, year: null, products: null } });
  });
});
