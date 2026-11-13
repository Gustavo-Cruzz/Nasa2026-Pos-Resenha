import municipalitiesData from '@/data/brazil-municipalities.json';
import zarcData from '@/data/brazil-zarc-index.json';
import pamData from '@/data/brazil-pam-index.json';
import type { Coordinates } from '@/lib/schema';
import type { BrazilRegionalContext, MunicipalityContext, PamProductContext, ZarcCropContext } from '@/lib/brazil/types';

type Position = [number, number];
type Ring = Position[];
type PolygonCoordinates = Ring[];
type Geometry = { type: 'Polygon'; coordinates: PolygonCoordinates } | { type: 'MultiPolygon'; coordinates: PolygonCoordinates[] };
type MunicipalityRecord = MunicipalityContext & { bbox: [number, number, number, number]; geometry: Geometry };
type ZarcIndexEntry = ZarcCropContext & { municipalityCode: string };
const municipalityDocument = municipalitiesData as unknown as { source: { geometryUrl: string; officialMeshUrl: string; officialMeshSha256: string; accessedAt: string; referenceSystem: string }; municipalities: MunicipalityRecord[] };
const zarcDocument = zarcData as unknown as { safra: string; source: { url: string; dictionaryUrl: string; accessedAt: string; sha256: string }; entries: ZarcIndexEntry[] };
type PamIndexEntry = PamProductContext & { municipalityCode: string };
const pamDocument = pamData as unknown as { year: string; caveat: string; source: { url: string; accessedAt: string; sha256: string }; entries: PamIndexEntry[] };

const zarcByMunicipality = new Map<string, ZarcIndexEntry[]>();
for (const entry of zarcDocument.entries) {
  const entries = zarcByMunicipality.get(entry.municipalityCode) ?? [];
  entries.push(entry);
  zarcByMunicipality.set(entry.municipalityCode, entries);
}
const pamByMunicipality = new Map<string, PamIndexEntry[]>();
for (const entry of pamDocument.entries) pamByMunicipality.set(entry.municipalityCode, [...(pamByMunicipality.get(entry.municipalityCode) ?? []), entry]);

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

function contains(point: Position, geometry: Geometry): boolean {
  return geometry.type === 'Polygon' ? inPolygon(point, geometry.coordinates) : geometry.coordinates.some((polygon) => inPolygon(point, polygon));
}

export function resolveBrazilMunicipality(coordinates: Coordinates): MunicipalityContext | null {
  const point: Position = [coordinates.longitude, coordinates.latitude];
  const match = municipalityDocument.municipalities.find((item) => point[0] >= item.bbox[0] && point[0] <= item.bbox[2] && point[1] >= item.bbox[1] && point[1] <= item.bbox[3] && contains(point, item.geometry));
  return match ? { code: match.code, name: match.name, uf: match.uf } : null;
}

export function resolveBrazilRegionalContext(coordinates: Coordinates): BrazilRegionalContext {
  const municipality = resolveBrazilMunicipality(coordinates);
  if (!municipality) return { country: null, municipality: null, municipalitySource: null, zarc: null, pam: null, gaps: ['A coordenada não foi associada a um município brasileiro na malha IBGE publicada.'] };
  const entries = zarcByMunicipality.get(municipality.code) ?? [];
  const pamEntries = pamByMunicipality.get(municipality.code) ?? [];
  const crops = Object.fromEntries(entries.map((entry) => [entry.cropId, {
    cropId: entry.cropId,
    rowCount: entry.rowCount,
    zarcCultures: entry.zarcCultures,
    cycleCodes: entry.cycleCodes,
    soilCodes: entry.soilCodes,
    climateCodes: entry.climateCodes,
    managements: entry.managements,
    ordinances: entry.ordinances,
    riskCodes: entry.riskCodes,
    decendiosWithRiskCode: entry.decendiosWithRiskCode,
  }]));
  return {
    country: 'BR',
    municipality,
    municipalitySource: { version: '2025', url: municipalityDocument.source.geometryUrl, officialMeshUrl: municipalityDocument.source.officialMeshUrl, accessedAt: municipalityDocument.source.accessedAt, referenceSystem: municipalityDocument.source.referenceSystem, sha256: municipalityDocument.source.officialMeshSha256 },
    zarc: entries.length ? { safra: zarcDocument.safra, sourceUrl: zarcDocument.source.url, dictionaryUrl: zarcDocument.source.dictionaryUrl, accessedAt: zarcDocument.source.accessedAt, sha256: zarcDocument.source.sha256, crops } : null,
    pam: pamEntries.length ? { year: pamDocument.year, sourceUrl: pamDocument.source.url, accessedAt: pamDocument.source.accessedAt, sha256: pamDocument.source.sha256, caveat: pamDocument.caveat, products: pamEntries.map(({ municipalityCode: _municipalityCode, ...entry }) => entry) } : null,
    gaps: [...(entries.length ? [] : ['O município foi identificado, mas não há registro das culturas P0 no índice ZARC desta safra.']), ...(pamEntries.length ? [] : ['Não há observação PAM positiva das culturas cobertas para este município e ano.'])],
  };
}
