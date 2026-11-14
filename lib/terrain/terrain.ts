import type { FieldBoundary, Coordinates } from '@/lib/schema';

/**
 * Relief classes by slope (%), as tabulated by Embrapa (Weber et al., Embrapa Uva e Vinho, cap. 5, Tabela 5.3):
 * 0–3 plano, 3–8 suave ondulado, 8–13 moderadamente ondulado, 13–20 ondulado, 20–45 forte ondulado, 45–75 montanhoso.
 * The table does not define a class above 75%, so everything from 45% up stays in the last class.
 */
export const RELIEF_CLASSES = [
  { id: 'flat', minPct: 0, maxPct: 3 },
  { id: 'gently_undulating', minPct: 3, maxPct: 8 },
  { id: 'moderately_undulating', minPct: 8, maxPct: 13 },
  { id: 'undulating', minPct: 13, maxPct: 20 },
  { id: 'strongly_undulating', minPct: 20, maxPct: 45 },
  { id: 'mountainous', minPct: 45, maxPct: null },
] as const;
export type ReliefClassId = (typeof RELIEF_CLASSES)[number]['id'];
/** A relief hotspot is a sampled cell at or above this slope (the start of the "moderadamente ondulado" class). It is a relief marker, not soil loss. */
export const HOTSPOT_MIN_SLOPE_PCT = 8;
export const MIN_GRID_SPACING_M = 60;
export const MAX_GRID_POINTS = 100;
const POINT_GRID_SPACING_M = 90;
const COARSE_SPACING_M = 250;
const M_PER_DEG_LAT = 111_320;

const labels = {
  'pt-BR': { flat: 'Plano', gently_undulating: 'Suave ondulado', moderately_undulating: 'Moderadamente ondulado', undulating: 'Ondulado', strongly_undulating: 'Forte ondulado', mountainous: 'Montanhoso ou mais íngreme' },
  en: { flat: 'Flat', gently_undulating: 'Gently undulating', moderately_undulating: 'Moderately undulating', undulating: 'Undulating', strongly_undulating: 'Strongly undulating', mountainous: 'Mountainous or steeper' },
} as const;
export const reliefLabel = (id: ReliefClassId, locale: 'pt-BR' | 'en') => labels[locale][id];

export function reliefClass(slopePct: number): ReliefClassId {
  return (RELIEF_CLASSES.find((item) => slopePct >= item.minPct && (item.maxPct === null || slopePct < item.maxPct)) ?? RELIEF_CLASSES[0]).id;
}

export type GridPoint = { row: number; col: number; lat: number; lng: number; inside: boolean };
export type SampleGrid = { mode: 'polygon' | 'point'; rows: number; cols: number; spacingM: number; dxM: number; dyM: number; coarse: boolean; points: GridPoint[] };
export type TerrainCell = { lat: number; lng: number; row: number; col: number; slopePct: number; classId: ReliefClassId; hotspot: boolean };
export type TerrainContext = {
  status: 'available' | 'unavailable';
  mode: 'polygon' | 'point';
  source: { dataset: string; url: string; fetchedAt: string };
  gridSpacingM: number;
  coarse: boolean;
  sampledCells: number;
  elevationM: { min: number; max: number; mean: number } | null;
  slopePct: { mean: number; max: number } | null;
  classShares: Array<{ classId: ReliefClassId; sharePct: number }>;
  hotspots: { count: number; sharePct: number; minSlopePct: number };
  cells: TerrainCell[];
  gaps: string[];
};
export const TERRAIN_SOURCE = { dataset: 'NASA SRTM GL1 v003 (1 arc-second) via OpenTopoData srtm30m', url: 'https://www.earthdata.nasa.gov/data/catalog/lpcloud-srtmgl1-003' } as const;

function inPolygon(lng: number, lat: number, ring: FieldBoundary): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Regular lat/lng grid of elevation sample points. For a boundary it covers the bounding box plus a one-node margin (so every
 * node inside has central differences); without a boundary it is a 3x3 grid around the point. At most MAX_GRID_POINTS nodes.
 */
export function buildSampleGrid(boundary: FieldBoundary | undefined, center: Coordinates): SampleGrid {
  if (!boundary) {
    const dLat = POINT_GRID_SPACING_M / M_PER_DEG_LAT; const dLng = POINT_GRID_SPACING_M / (M_PER_DEG_LAT * Math.cos(center.latitude * Math.PI / 180));
    const points: GridPoint[] = [];
    for (let row = 0; row < 3; row += 1) for (let col = 0; col < 3; col += 1) points.push({ row, col, lat: center.latitude + (row - 1) * dLat, lng: center.longitude + (col - 1) * dLng, inside: row === 1 && col === 1 });
    return { mode: 'point', rows: 3, cols: 3, spacingM: POINT_GRID_SPACING_M, dxM: POINT_GRID_SPACING_M, dyM: POINT_GRID_SPACING_M, coarse: false, points };
  }
  const lngs = boundary.map(([lng]) => lng); const lats = boundary.map(([, lat]) => lat);
  const minLng = Math.min(...lngs); const maxLng = Math.max(...lngs); const minLat = Math.min(...lats); const maxLat = Math.max(...lats);
  const midLat = (minLat + maxLat) / 2;
  const mPerDegLng = M_PER_DEG_LAT * Math.cos(midLat * Math.PI / 180);
  const widthM = (maxLng - minLng) * mPerDegLng; const heightM = (maxLat - minLat) * M_PER_DEG_LAT;
  let spacing = Math.max(MIN_GRID_SPACING_M, Math.max(widthM, heightM) / 7);
  const size = (s: number) => ({ cols: Math.ceil(widthM / s) + 3, rows: Math.ceil(heightM / s) + 3 });
  while (size(spacing).cols * size(spacing).rows > MAX_GRID_POINTS) spacing *= 1.1;
  const { cols, rows } = size(spacing);
  // Center the grid on the bounding box so the margin is symmetric.
  const spanLng = (cols - 1) * spacing / mPerDegLng; const spanLat = (rows - 1) * spacing / M_PER_DEG_LAT;
  const lng0 = (minLng + maxLng) / 2 - spanLng / 2; const lat0 = (minLat + maxLat) / 2 - spanLat / 2;
  const points: GridPoint[] = [];
  for (let row = 0; row < rows; row += 1) for (let col = 0; col < cols; col += 1) {
    const lng = lng0 + col * spacing / mPerDegLng; const lat = lat0 + row * spacing / M_PER_DEG_LAT;
    points.push({ row, col, lat, lng, inside: inPolygon(lng, lat, boundary) });
  }
  return { mode: 'polygon', rows, cols, spacingM: Math.round(spacing), dxM: spacing, dyM: spacing, coarse: spacing > COARSE_SPACING_M, points };
}

const round = (value: number, digits = 1) => Number(value.toFixed(digits));

/**
 * Slope (%) at a node from finite differences of the neighbouring elevations (central inside the grid, one-sided on the edge).
 * Returns null when any elevation it needs is missing, so a void never becomes a flat cell.
 */
function slopeAt(grid: SampleGrid, z: Array<number | null>, row: number, col: number): number | null {
  const at = (r: number, c: number) => z[r * grid.cols + c];
  const diff = (a: number | null, b: number | null, distance: number) => (a === null || b === null ? null : (b - a) / distance);
  const c0 = Math.max(col - 1, 0); const c1 = Math.min(col + 1, grid.cols - 1);
  const r0 = Math.max(row - 1, 0); const r1 = Math.min(row + 1, grid.rows - 1);
  const dzdx = diff(at(row, c0), at(row, c1), (c1 - c0) * grid.dxM);
  const dzdy = diff(at(r0, col), at(r1, col), (r1 - r0) * grid.dyM);
  return dzdx === null || dzdy === null ? null : 100 * Math.hypot(dzdx, dzdy);
}

export function analyzeTerrain(grid: SampleGrid, elevations: Array<number | null>, fetchedAt: string): TerrainContext {
  const base = { mode: grid.mode, source: { ...TERRAIN_SOURCE, fetchedAt }, gridSpacingM: grid.spacingM, coarse: grid.coarse };
  const empty = (gap: string): TerrainContext => ({ ...base, status: 'unavailable', sampledCells: 0, elevationM: null, slopePct: null, classShares: [], hotspots: { count: 0, sharePct: 0, minSlopePct: HOTSPOT_MIN_SLOPE_PCT }, cells: [], gaps: [gap] });
  if (elevations.length !== grid.points.length) return empty('elevation_response_mismatch');
  const cells: TerrainCell[] = []; const heights: number[] = [];
  for (const point of grid.points) {
    if (!point.inside) continue;
    const elevation = elevations[point.row * grid.cols + point.col];
    if (elevation !== null) heights.push(elevation);
    const slope = slopeAt(grid, elevations, point.row, point.col);
    if (slope === null) continue;
    cells.push({ lat: point.lat, lng: point.lng, row: point.row, col: point.col, slopePct: round(slope), classId: reliefClass(slope), hotspot: slope >= HOTSPOT_MIN_SLOPE_PCT });
  }
  if (!cells.length) return empty('no_valid_cells');
  const slopes = cells.map((cell) => cell.slopePct);
  const hotspots = cells.filter((cell) => cell.hotspot).length;
  return {
    ...base, status: 'available', sampledCells: cells.length,
    elevationM: heights.length ? { min: round(Math.min(...heights), 0), max: round(Math.max(...heights), 0), mean: round(heights.reduce((sum, value) => sum + value, 0) / heights.length, 0) } : null,
    slopePct: { mean: round(slopes.reduce((sum, value) => sum + value, 0) / slopes.length), max: round(Math.max(...slopes)) },
    classShares: RELIEF_CLASSES.map((item) => ({ classId: item.id, sharePct: round(cells.filter((cell) => cell.classId === item.id).length / cells.length * 100) })),
    hotspots: { count: hotspots, sharePct: round(hotspots / cells.length * 100), minSlopePct: HOTSPOT_MIN_SLOPE_PCT },
    cells,
    gaps: [...(grid.coarse ? ['coarse_grid'] : []), ...(cells.length < grid.points.filter((point) => point.inside).length ? ['some_cells_without_elevation'] : [])],
  };
}
