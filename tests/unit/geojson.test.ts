import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseGeoJsonBoundary, geojsonErrorMessage, GEOJSON_MAX_CHARS } from '@/lib/geojson';
import { analyze } from '@/lib/engine';
import { loadDraft, saveDraft } from '@/lib/storage';
import { analysisInputSchema, type AnalysisInput } from '@/lib/schema';
import type { ClimateContext } from '@/lib/climate/nasa-power';

const square = [[-50.92, -17.80], [-50.91, -17.80], [-50.91, -17.79], [-50.92, -17.79], [-50.92, -17.80]];
const polygon = (coordinates: unknown) => JSON.stringify({ type: 'Polygon', coordinates });
const code = (text: string) => { const result = parseGeoJsonBoundary(text); return result.ok ? 'ok' : result.code; };

describe('GeoJSON boundary import', () => {
  it('accepts Polygon, Feature and FeatureCollection and drops the closing vertex', () => {
    const geometry = { type: 'Polygon', coordinates: [square] };
    for (const text of [JSON.stringify(geometry), JSON.stringify({ type: 'Feature', properties: {}, geometry }), JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry }] })]) {
      const result = parseGeoJsonBoundary(text);
      expect(result).toMatchObject({ ok: true, closingVertexDropped: true });
      if (result.ok) expect(result.boundary).toHaveLength(4);
    }
  });
  it('ignores altitude and accepts an unclosed ring', () => {
    const result = parseGeoJsonBoundary(polygon([square.slice(0, 4).map(([x, y]) => [x, y, 800])]));
    expect(result).toMatchObject({ ok: true, closingVertexDropped: false });
  });
  it('fails clearly on invalid input', () => {
    expect(code('not json')).toBe('invalid_json');
    expect(code(JSON.stringify({ type: 'Point', coordinates: [0, 0] }))).toBe('no_polygon');
    expect(code(JSON.stringify({ type: 'FeatureCollection', features: [] }))).toBe('no_polygon');
    expect(code(JSON.stringify({ type: 'MultiPolygon', coordinates: [[square], [square]] }))).toBe('multiple_polygons');
    expect(code(polygon([square, square]))).toBe('holes_unsupported');
    expect(code(polygon([[[200, 0], [1, 0], [1, 1], [200, 0]]]))).toBe('bad_coordinates');
    expect(code(polygon([[[0, 95], [1, 0], [1, 1], [0, 95]]]))).toBe('bad_coordinates');
    expect(code(polygon([[[0, 0], [1, '1'], [1, 1], [0, 0]]]))).toBe('bad_coordinates');
    expect(code(polygon([[[0, 0], [1, 1], [0, 0]]]))).toBe('too_few_vertices');
    expect(code(polygon([[[0, 0], [1, 1], [2, 2], [0, 0]]]))).toBe('zero_area');
    expect(code(polygon([[[0, 0], [2, 2], [2, 0], [0, 2], [0, 0]]]))).toBe('self_intersecting');
    const many = Array.from({ length: 65 }, (_, index) => [Math.cos(index) * 0.01, Math.sin(index) * 0.01]);
    expect(code(polygon([[...many, many[0]]]))).toBe('too_many_vertices');
    expect(code(' '.repeat(GEOJSON_MAX_CHARS + 1))).toBe('too_large');
  });
  it('has a message for every error in both languages', () => {
    for (const locale of ['pt-BR', 'en'] as const) expect(geojsonErrorMessage('self_intersecting', locale).length).toBeGreaterThan(10);
  });
});

describe('imported boundary and water point in the draft', () => {
  const input: AnalysisInput = { location: { latitude: -17.795, longitude: -50.915 }, fieldBoundary: square.slice(0, 4) as AnalysisInput['fieldBoundary'], plantingMonth: 4, history: [{ cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' }], priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown' };
  const unavailable: ClimateContext = { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [], provenance: null, gaps: ['NASA down'] };
  afterEach(() => vi.unstubAllGlobals());

  it('persists the boundary and declared water point in the local draft', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) } });
    saveDraft({ ...input, waterPoint: { kind: 'well', label: 'Poço do sítio' } });
    const draft = loadDraft();
    expect(draft?.data.fieldBoundary).toHaveLength(4);
    expect(draft?.data.waterPoint).toEqual({ kind: 'well', label: 'Poço do sítio' });
  });
  it('rejects an unknown water point kind', () => {
    expect(analysisInputSchema.safeParse({ ...input, waterPoint: { kind: 'spring' } }).success).toBe(false);
  });
  it('does not let the water point change crops, evidence or NASA readings', () => {
    const without = analyze(input, unavailable);
    const withWater = analyze({ ...input, waterPoint: { kind: 'river' } }, unavailable);
    const strip = (result: ReturnType<typeof analyze>) => JSON.stringify({ ...result, input: undefined });
    expect(strip(withWater)).toBe(strip(without));
  });
});
