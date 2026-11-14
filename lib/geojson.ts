import { fieldBoundarySchema, type FieldBoundary } from '@/lib/schema';

/** Largest GeoJSON text accepted from a file; a farm boundary is a few KB, so this is generous. */
export const GEOJSON_MAX_CHARS = 200_000;
export const BOUNDARY_MAX_VERTICES = 64;

export type GeoJsonErrorCode = 'too_large' | 'invalid_json' | 'no_polygon' | 'multiple_polygons' | 'holes_unsupported' | 'bad_coordinates' | 'too_few_vertices' | 'too_many_vertices' | 'zero_area' | 'self_intersecting';
export type GeoJsonResult = { ok: true; boundary: FieldBoundary; closingVertexDropped: boolean } | { ok: false; code: GeoJsonErrorCode };

const messages: Record<'pt-BR' | 'en', Record<GeoJsonErrorCode, string>> = {
  'pt-BR': {
    too_large: 'Arquivo grande demais. Use um GeoJSON de até 200 mil caracteres.',
    invalid_json: 'O arquivo não é um JSON válido.',
    no_polygon: 'Não encontrei um polígono. Envie um GeoJSON com uma geometria Polygon.',
    multiple_polygons: 'O arquivo tem mais de um polígono. Envie apenas um.',
    holes_unsupported: 'O polígono tem buracos (anéis internos), que não são suportados. Envie só o contorno externo.',
    bad_coordinates: 'Coordenadas inválidas. Use [longitude, latitude] em graus: longitude entre −180 e 180 e latitude entre −90 e 90.',
    too_few_vertices: 'O polígono precisa de pelo menos 3 vértices distintos.',
    too_many_vertices: `O polígono tem vértices demais (máximo ${BOUNDARY_MAX_VERTICES}). Simplifique o contorno e tente de novo.`,
    zero_area: 'O polígono não tem área (vértices alinhados ou repetidos).',
    self_intersecting: 'O contorno se cruza. Corrija o polígono e tente de novo.',
  },
  en: {
    too_large: 'File too large. Use a GeoJSON of up to 200,000 characters.',
    invalid_json: 'The file is not valid JSON.',
    no_polygon: 'No polygon found. Upload a GeoJSON with a Polygon geometry.',
    multiple_polygons: 'The file has more than one polygon. Upload just one.',
    holes_unsupported: 'The polygon has holes (inner rings), which are not supported. Upload only the outer outline.',
    bad_coordinates: 'Invalid coordinates. Use [longitude, latitude] in degrees: longitude from −180 to 180 and latitude from −90 to 90.',
    too_few_vertices: 'The polygon needs at least 3 distinct vertices.',
    too_many_vertices: `The polygon has too many vertices (maximum ${BOUNDARY_MAX_VERTICES}). Simplify the outline and try again.`,
    zero_area: 'The polygon has no area (collinear or repeated vertices).',
    self_intersecting: 'The outline crosses itself. Fix the polygon and try again.',
  },
};
export const geojsonErrorMessage = (code: GeoJsonErrorCode, locale: 'pt-BR' | 'en') => messages[locale][code];

const fail = (code: GeoJsonErrorCode): GeoJsonResult => ({ ok: false, code });
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Collects every Polygon in a Geometry/Feature/FeatureCollection; a MultiPolygon contributes each of its polygons. */
function polygonsOf(node: unknown): unknown[][] | undefined {
  if (!isRecord(node)) return undefined;
  if (node.type === 'Polygon') return Array.isArray(node.coordinates) ? [node.coordinates] : undefined;
  if (node.type === 'MultiPolygon') return Array.isArray(node.coordinates) ? (node.coordinates as unknown[][][]).map((polygon) => polygon as unknown[][]) : undefined;
  if (node.type === 'Feature') return polygonsOf(node.geometry);
  if (node.type === 'FeatureCollection' && Array.isArray(node.features)) return node.features.flatMap((feature) => polygonsOf(feature) ?? []);
  return undefined;
}

const orientation = (a: readonly number[], b: readonly number[], c: readonly number[]) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
function segmentsCross(a: readonly number[], b: readonly number[], c: readonly number[], d: readonly number[]): boolean {
  return orientation(a, b, c) * orientation(a, b, d) < 0 && orientation(c, d, a) * orientation(c, d, b) < 0;
}
function selfIntersects(ring: FieldBoundary): boolean {
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]; const b = ring[(i + 1) % ring.length];
    for (let j = i + 1; j < ring.length; j += 1) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === ring.length - 1)) continue;
      if (segmentsCross(a, b, ring[j], ring[(j + 1) % ring.length])) return true;
    }
  }
  return false;
}
const signedArea = (ring: FieldBoundary) => ring.reduce((sum, [x, y], index) => { const [nx, ny] = ring[(index + 1) % ring.length]; return sum + x * ny - nx * y; }, 0) / 2;

/** Validates untrusted GeoJSON text into the single outer ring the app stores as `fieldBoundary`. */
export function parseGeoJsonBoundary(text: string): GeoJsonResult {
  if (text.length > GEOJSON_MAX_CHARS) return fail('too_large');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return fail('invalid_json'); }
  const polygons = polygonsOf(parsed);
  if (!polygons || polygons.length === 0) return fail('no_polygon');
  if (polygons.length > 1) return fail('multiple_polygons');
  const rings = polygons[0];
  if (!Array.isArray(rings) || rings.length === 0 || !Array.isArray(rings[0])) return fail('no_polygon');
  if (rings.length > 1) return fail('holes_unsupported');
  const positions: number[][] = [];
  for (const position of rings[0] as unknown[]) {
    if (!Array.isArray(position) || position.length < 2 || typeof position[0] !== 'number' || typeof position[1] !== 'number' || !Number.isFinite(position[0]) || !Number.isFinite(position[1]) || Math.abs(position[0]) > 180 || Math.abs(position[1]) > 90) return fail('bad_coordinates');
    positions.push([position[0], position[1]]);
  }
  const closed = positions.length > 1 && positions[0][0] === positions.at(-1)![0] && positions[0][1] === positions.at(-1)![1];
  const ring = closed ? positions.slice(0, -1) : positions;
  const distinct = new Set(ring.map(([x, y]) => `${x},${y}`));
  if (distinct.size < 3) return fail('too_few_vertices');
  if (ring.length > BOUNDARY_MAX_VERTICES) return fail('too_many_vertices');
  const boundary = ring as FieldBoundary;
  if (selfIntersects(boundary)) return fail('self_intersecting');
  if (signedArea(boundary) === 0) return fail('zero_area');
  // Final guard: the stored shape must satisfy the app's own schema.
  return fieldBoundarySchema.safeParse(boundary).success ? { ok: true, boundary, closingVertexDropped: closed } : fail('bad_coordinates');
}
