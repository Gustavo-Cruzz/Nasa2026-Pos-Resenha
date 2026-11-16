import { describe, expect, it } from 'vitest';
import catalogData from '@/data/brazil-municipalities.json';
import pointsData from '@/data/ndvi-brazil/points.json';
import { contains, representativePointWithMethod, validateMunicipalPoints, type CatalogMunicipality, type Geometry } from '@/lib/brazil/interior-point';
import type { MunicipalPointsArtifact } from '@/lib/climate/ndvi-brazil-types';

const catalog = (catalogData as unknown as { municipalities: CatalogMunicipality[] }).municipalities;
const artifact = pointsData as unknown as MunicipalPointsArtifact;

// C shape: centroid of the ring lies in the hollow of the C, outside the polygon.
const cShape: Geometry = { type: 'Polygon', coordinates: [[[-50, -10], [-40, -10], [-40, -9], [-49, -9], [-49, -1], [-40, -1], [-40, 0], [-50, 0], [-50, -10]]] };
const multi: Geometry = { type: 'MultiPolygon', coordinates: [
  [[[-50, -10], [-49, -10], [-49, -9], [-50, -9], [-50, -10]]],
  [[[-45, -10], [-40, -10], [-40, -5], [-45, -5], [-45, -10]]],
] };
const fake = (code: string, geometry: Geometry): CatalogMunicipality => ({ code, name: `M${code}`, uf: 'GO', geometry });
const p = (ibgeCode: unknown, latitude: unknown, longitude: unknown) => ({ ibgeCode, latitude, longitude });

describe('national municipal points artifact', () => {
  it('has exactly one point per catalog municipality and no validation errors', () => {
    expect(artifact.points).toHaveLength(catalog.length);
    expect(artifact.count).toBe(catalog.length);
    expect(new Set(artifact.points.map((x) => x.ibgeCode)).size).toBe(catalog.length);
    expect(validateMunicipalPoints(artifact.points, catalog)).toEqual([]);
  });
  it('keeps every point inside its own geometry, sorted, with IBGE ids as strings', () => {
    const byCode = new Map(catalog.map((m) => [m.code, m]));
    for (const point of artifact.points) {
      expect(typeof point.ibgeCode).toBe('string');
      expect(point.ibgeCode).toMatch(/^\d{7}$/);
      expect(contains([point.longitude, point.latitude], byCode.get(point.ibgeCode)!.geometry)).toBe(true);
    }
    const codes = artifact.points.map((x) => x.ibgeCode);
    expect(codes).toEqual([...codes].sort());
    expect(artifact.points.some((x) => x.ibgeCode.startsWith('1'))).toBe(true);
  });
});

describe('representativePointWithMethod', () => {
  it('uses the grid fallback for a concave C polygon and stays inside', () => {
    const result = representativePointWithMethod(cShape)!;
    expect(result.method).toBe('interior_grid_nearest_centroid');
    expect(contains(result.point, cShape)).toBe(true);
  });
  it('uses the centroid when it is inside', () => {
    const square: Geometry = { type: 'Polygon', coordinates: [[[-50, -10], [-48, -10], [-48, -8], [-50, -8], [-50, -10]]] };
    const result = representativePointWithMethod(square)!;
    expect(result).toEqual({ point: [-49, -9], method: 'centroid_inside' });
  });
  it('handles MultiPolygon using the largest part', () => {
    const result = representativePointWithMethod(multi)!;
    expect(contains(result.point, multi)).toBe(true);
    expect(result.point[0]).toBeGreaterThan(-45);
  });
});

describe('validateMunicipalPoints', () => {
  const cat = [fake('5200001', cShape), fake('5200002', multi)];
  const ok = [p('5200001', -9.5, -45), p('5200002', -7.5, -42.5)];
  it('accepts valid points', () => expect(validateMunicipalPoints(ok, cat)).toEqual([]));
  it('rejects duplicate code', () => expect(validateMunicipalPoints([...ok, ok[0]], cat).join()).toMatch(/duplicated/));
  it('rejects NaN, Infinity and missing coordinates', () => {
    expect(validateMunicipalPoints([p('5200001', NaN, -45), ok[1]], cat).join()).toMatch(/non-finite/);
    expect(validateMunicipalPoints([p('5200001', -9.5, Infinity), ok[1]], cat).join()).toMatch(/non-finite/);
    expect(validateMunicipalPoints([p('5200001', undefined, -45), ok[1]], cat).join()).toMatch(/missing/);
    expect(validateMunicipalPoints([p('5200001', -9.5, null), ok[1]], cat).join()).toMatch(/missing/);
  });
  it('rejects point outside its municipality (C hollow) and outside Brazil', () => {
    expect(validateMunicipalPoints([p('5200001', -5, -45), ok[1]], cat).join()).toMatch(/outside its own municipality/);
    expect(validateMunicipalPoints([p('5200001', 40, 2), ok[1]], cat).join()).toMatch(/outside Brazil/);
  });
  it('rejects unknown code, malformed code and missing catalog municipality', () => {
    expect(validateMunicipalPoints([...ok, p('9999999', -9.5, -45)], cat).join()).toMatch(/not in catalog/);
    expect(validateMunicipalPoints([p(5200001, -9.5, -45), ok[1]], cat).join()).toMatch(/7-digit string/);
    expect(validateMunicipalPoints([p('520001', -9.5, -45), ok[1]], cat).join()).toMatch(/7-digit string/);
    expect(validateMunicipalPoints([ok[0]], cat).join()).toMatch(/has no point/);
  });
});
