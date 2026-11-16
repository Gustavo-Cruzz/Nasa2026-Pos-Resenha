/** Pure, alias-free geometry helpers: point-in-polygon, interior representative point and municipal point validation. */
export type Position = [number, number];
type Ring = Position[];
type PolygonCoordinates = Ring[];
export type Geometry = { type: 'Polygon'; coordinates: PolygonCoordinates } | { type: 'MultiPolygon'; coordinates: PolygonCoordinates[] };
export type PointMethod = 'centroid_inside' | 'interior_grid_nearest_centroid';

export const BRAZIL_BBOX = { minLon: -74.1, maxLon: -28.8, minLat: -33.9, maxLat: 5.4 } as const;

function onSegment(point: Position, start: Position, end: Position): boolean {
  const cross = (point[1] - start[1]) * (end[0] - start[0]) - (point[0] - start[0]) * (end[1] - start[1]);
  if (Math.abs(cross) > 1e-9) return false;
  return point[0] >= Math.min(start[0], end[0]) && point[0] <= Math.max(start[0], end[0]) && point[1] >= Math.min(start[1], end[1]) && point[1] <= Math.max(start[1], end[1]);
}

function inRing(point: Position, ring: Ring): boolean {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];
    if (onSegment(point, previousPoint, currentPoint)) return true;
    const crosses = (currentPoint[1] > point[1]) !== (previousPoint[1] > point[1])
      && point[0] < ((previousPoint[0] - currentPoint[0]) * (point[1] - currentPoint[1])) / (previousPoint[1] - currentPoint[1]) + currentPoint[0];
    if (crosses) inside = !inside;
  }
  return inside;
}

function inPolygon(point: Position, polygon: PolygonCoordinates): boolean {
  return Boolean(polygon[0] && inRing(point, polygon[0]) && !polygon.slice(1).some((hole) => inRing(point, hole)));
}

export function contains(point: Position, geometry: Geometry): boolean {
  return geometry.type === 'Polygon' ? inPolygon(point, geometry.coordinates) : geometry.coordinates.some((polygon) => inPolygon(point, polygon));
}

const ringArea = (ring: Position[]) => ring.reduce((sum, [x, y], index) => { const [nx, ny] = ring[(index + 1) % ring.length]; return sum + (x * ny - nx * y); }, 0) / 2;

/**
 * A point guaranteed to lie inside the municipality: the centroid of its largest polygon when inside, otherwise the
 * interior grid point nearest to the centroid. Rounded to 4 then 6 digits and re-checked with `contains`.
 */
export function representativePointWithMethod(geometry: Geometry): { point: Position; method: PointMethod } | undefined {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const polygon = [...polygons].sort((a, b) => Math.abs(ringArea(b[0])) - Math.abs(ringArea(a[0])))[0];
  if (!polygon?.[0]?.length) return undefined;
  const ring = polygon[0];
  const area = ringArea(ring);
  let centroid: Position;
  if (Math.abs(area) < 1e-12) centroid = [ring.reduce((sum, p) => sum + p[0], 0) / ring.length, ring.reduce((sum, p) => sum + p[1], 0) / ring.length];
  else {
    let cx = 0; let cy = 0;
    ring.forEach(([x, y], index) => { const [nx, ny] = ring[(index + 1) % ring.length]; const cross = x * ny - nx * y; cx += (x + nx) * cross; cy += (y + ny) * cross; });
    centroid = [cx / (6 * area), cy / (6 * area)];
  }
  const settle = (point: Position): Position | undefined => { for (const digits of [4, 6]) { const rounded: Position = [Number(point[0].toFixed(digits)), Number(point[1].toFixed(digits))]; if (contains(rounded, geometry)) return rounded; } return undefined; };
  if (inPolygon(centroid, polygon)) { const settled = settle(centroid); if (settled) return { point: settled, method: 'centroid_inside' }; }
  const xs = ring.map((p) => p[0]); const ys = ring.map((p) => p[1]);
  const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const steps = 60; let best: Position | undefined; let bestDistance = Infinity;
  for (let i = 0; i <= steps; i += 1) for (let j = 0; j <= steps; j += 1) {
    const point: Position = [minX + (maxX - minX) * i / steps, minY + (maxY - minY) * j / steps];
    const distance = (point[0] - centroid[0]) ** 2 + (point[1] - centroid[1]) ** 2;
    if (distance < bestDistance && inPolygon(point, polygon)) { best = point; bestDistance = distance; }
  }
  const settled = best ? settle(best) : undefined;
  return settled ? { point: settled, method: 'interior_grid_nearest_centroid' } : undefined;
}

export function representativePoint(geometry: Geometry): Position | undefined {
  return representativePointWithMethod(geometry)?.point;
}

export type CatalogMunicipality = { code: string; name: string; uf: string; geometry: Geometry };
export type PointCandidate = { ibgeCode?: unknown; latitude?: unknown; longitude?: unknown };

/** Returns human-readable errors; an empty list means every catalog municipality has exactly one valid interior point. */
export function validateMunicipalPoints(points: PointCandidate[], catalog: CatalogMunicipality[]): string[] {
  const errors: string[] = [];
  const byCode = new Map(catalog.map((item) => [item.code, item]));
  const seen = new Set<string>();
  for (const [index, point] of points.entries()) {
    const code = point.ibgeCode;
    const label = `point[${index}] ${String(code)}`;
    if (typeof code !== 'string' || !/^\d{7}$/.test(code)) { errors.push(`${label}: ibgeCode must be a 7-digit string`); continue; }
    if (seen.has(code)) errors.push(`${label}: duplicated ibgeCode`);
    seen.add(code);
    const municipality = byCode.get(code);
    if (!municipality) { errors.push(`${label}: ibgeCode not in catalog`); continue; }
    const { latitude, longitude } = point;
    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) { errors.push(`${label}: missing coordinates`); continue; }
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) { errors.push(`${label}: non-finite coordinates`); continue; }
    if (longitude < BRAZIL_BBOX.minLon || longitude > BRAZIL_BBOX.maxLon || latitude < BRAZIL_BBOX.minLat || latitude > BRAZIL_BBOX.maxLat) { errors.push(`${label}: outside Brazil`); continue; }
    if (!contains([longitude, latitude], municipality.geometry)) errors.push(`${label}: outside its own municipality (${municipality.name}/${municipality.uf})`);
  }
  for (const item of catalog) if (!seen.has(item.code)) errors.push(`${item.code} ${item.name}/${item.uf}: catalog municipality has no point`);
  return errors;
}
