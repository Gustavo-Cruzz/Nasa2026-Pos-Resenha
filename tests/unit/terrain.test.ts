import { describe, expect, it } from 'vitest';
import { HOTSPOT_MIN_SLOPE_PCT, MAX_GRID_POINTS, MIN_GRID_SPACING_M, analyzeTerrain, buildSampleGrid, reliefClass } from '@/lib/terrain/terrain';
import { buildElevationUrl, fetchTerrain } from '@/lib/terrain/srtm';
import type { FieldBoundary } from '@/lib/schema';

const center = { latitude: -17.798, longitude: -50.919 };
const d = 0.0015; // about 330 m
const square: FieldBoundary = [[center.longitude - d, center.latitude - d], [center.longitude + d, center.latitude - d], [center.longitude + d, center.latitude + d], [center.longitude - d, center.latitude + d]];
const plane = (grid: ReturnType<typeof buildSampleGrid>, slopeX: number, slopeY: number, base = 700) => grid.points.map((point) => base + slopeX * point.col * grid.dxM + slopeY * point.row * grid.dyM);

describe('relief classes (Embrapa)', () => {
  it('classifies the slope boundaries', () => {
    const at = [0, 2.99, 3, 7.99, 8, 12.99, 13, 19.99, 20, 44.99, 45, 74, 100].map(reliefClass);
    expect(at).toEqual(['flat', 'flat', 'gently_undulating', 'gently_undulating', 'moderately_undulating', 'moderately_undulating', 'undulating', 'undulating', 'strongly_undulating', 'strongly_undulating', 'mountainous', 'mountainous', 'mountainous']);
    expect(HOTSPOT_MIN_SLOPE_PCT).toBe(8);
  });
});

describe('sample grid', () => {
  it('uses a 3x3 grid around a point and marks only the centre', () => {
    const grid = buildSampleGrid(undefined, center);
    expect(grid).toMatchObject({ mode: 'point', rows: 3, cols: 3, spacingM: 90 });
    expect(grid.points.filter((point) => point.inside)).toHaveLength(1);
    expect(grid.points[4]).toMatchObject({ inside: true, lat: center.latitude, lng: center.longitude });
  });
  it('covers a polygon with a margin, at least 60 m apart and within the request limit', () => {
    const grid = buildSampleGrid(square, center);
    expect(grid.mode).toBe('polygon');
    expect(grid.spacingM).toBeGreaterThanOrEqual(MIN_GRID_SPACING_M);
    expect(grid.points.length).toBeLessThanOrEqual(MAX_GRID_POINTS);
    const inside = grid.points.filter((point) => point.inside);
    expect(inside.length).toBeGreaterThan(5);
    expect(inside.every((point) => point.row > 0 && point.col > 0 && point.row < grid.rows - 1 && point.col < grid.cols - 1)).toBe(true);
  });
  it('coarsens, but never exceeds the limit, for a very large polygon', () => {
    const big: FieldBoundary = [[-51, -18], [-50.9, -18], [-50.9, -17.9], [-51, -17.9]];
    const grid = buildSampleGrid(big, center);
    expect(grid.points.length).toBeLessThanOrEqual(MAX_GRID_POINTS);
    expect(grid.coarse).toBe(true);
  });
});

describe('terrain analysis', () => {
  it('recovers the slope of a known plane at a point', () => {
    const grid = buildSampleGrid(undefined, center);
    const result = analyzeTerrain(grid, plane(grid, 0.05, 0), '2026-11-14T00:00:00.000Z');
    expect(result.status).toBe('available');
    expect(result.cells).toHaveLength(1);
    expect(result.cells[0]).toMatchObject({ slopePct: 5, classId: 'gently_undulating', hotspot: false });
    expect(result.hotspots.count).toBe(0);
  });
  it('combines both directions: 6% east and 8% north is a 10% slope', () => {
    const grid = buildSampleGrid(undefined, center);
    const result = analyzeTerrain(grid, plane(grid, 0.06, 0.08), '2026-11-14T00:00:00.000Z');
    expect(result.cells[0]).toMatchObject({ slopePct: 10, classId: 'moderately_undulating', hotspot: true });
  });
  it('summarizes a polygon on a uniform 10% plane: every cell is a relief hotspot', () => {
    const grid = buildSampleGrid(square, center);
    const result = analyzeTerrain(grid, plane(grid, 0, 0.1, 740), '2026-11-14T00:00:00.000Z');
    expect(result.cells.length).toBe(grid.points.filter((point) => point.inside).length);
    expect(result.cells.every((cell) => cell.slopePct === 10 && cell.hotspot)).toBe(true);
    expect(result.hotspots).toMatchObject({ sharePct: 100, minSlopePct: 8 });
    expect(result.classShares.find((item) => item.classId === 'moderately_undulating')?.sharePct).toBe(100);
    expect(result.slopePct).toEqual({ mean: 10, max: 10 });
    expect(result.elevationM && result.elevationM.max > result.elevationM.min).toBe(true);
    expect(result.gaps).toEqual([]);
  });
  it('a flat polygon has no hotspots', () => {
    const grid = buildSampleGrid(square, center);
    const result = analyzeTerrain(grid, plane(grid, 0, 0, 745), '2026-11-14T00:00:00.000Z');
    expect(result.slopePct).toEqual({ mean: 0, max: 0 });
    expect(result.hotspots.count).toBe(0);
    expect(result.classShares.find((item) => item.classId === 'flat')?.sharePct).toBe(100);
  });
  it('never turns a missing elevation into a flat cell', () => {
    const grid = buildSampleGrid(square, center);
    const z = plane(grid, 0, 0.1, 740) as Array<number | null>;
    const target = grid.points.find((point) => point.inside)!;
    z[target.row * grid.cols + target.col + 1] = null; // the east neighbour feeds the slope of the target cell
    const result = analyzeTerrain(grid, z, '2026-11-14T00:00:00.000Z');
    expect(result.cells.some((cell) => cell.row === target.row && cell.col === target.col)).toBe(false);
    expect(result.cells.length).toBeLessThan(grid.points.filter((point) => point.inside).length);
    expect(result.gaps).toContain('some_cells_without_elevation');
  });
  it('is unavailable when nothing usable comes back', () => {
    const grid = buildSampleGrid(square, center);
    expect(analyzeTerrain(grid, grid.points.map(() => null), 'x')).toMatchObject({ status: 'unavailable', gaps: ['no_valid_cells'], cells: [] });
    expect(analyzeTerrain(grid, [1, 2, 3], 'x')).toMatchObject({ status: 'unavailable', gaps: ['elevation_response_mismatch'] });
  });
});

describe('SRTM request', () => {
  const ok = (grid: ReturnType<typeof buildSampleGrid>, z: Array<number | null>) => new Response(JSON.stringify({ status: 'OK', results: z.map((elevation, index) => ({ elevation, location: { lat: grid.points[index].lat, lng: grid.points[index].lng }, dataset: 'srtm30m' })) }), { status: 200 });
  it('builds one request with all points', () => {
    const grid = buildSampleGrid(undefined, center);
    const url = buildElevationUrl(grid);
    expect(url.startsWith('https://api.opentopodata.org/v1/srtm30m?locations=')).toBe(true);
    expect(url.split('|')).toHaveLength(9);
  });
  it('returns the analysed terrain from a valid response', async () => {
    const site = { latitude: -17.801, longitude: -50.921 };
    const grid = buildSampleGrid(undefined, site);
    const result = await fetchTerrain(site, undefined, async () => ok(grid, plane(grid, 0.03, 0)));
    expect(result.status).toBe('available');
    expect(result.cells[0].slopePct).toBe(3);
    expect(result.source.url).toContain('earthdata.nasa.gov');
  });
  it('degrades to N/D on HTTP errors, malformed bodies, wrong sizes and network failures', async () => {
    const site = { latitude: -17.9, longitude: -50.9 };
    const grid = buildSampleGrid(undefined, site);
    expect(await fetchTerrain(site, undefined, async () => new Response('', { status: 429 }))).toMatchObject({ status: 'unavailable', gaps: ['srtm_http_429'] });
    expect(await fetchTerrain(site, undefined, async () => new Response(JSON.stringify({ status: 'INVALID_REQUEST' }), { status: 200 }))).toMatchObject({ status: 'unavailable', gaps: ['srtm_response_invalid'] });
    expect(await fetchTerrain(site, undefined, async () => ok(grid, [1, 2]))).toMatchObject({ status: 'unavailable', gaps: ['srtm_response_invalid'] });
    expect(await fetchTerrain(site, undefined, async () => { throw new Error('offline'); })).toMatchObject({ status: 'unavailable', gaps: ['srtm_unreachable'] });
  });
});
