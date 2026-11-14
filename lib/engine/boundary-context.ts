import type { FieldBoundary } from '@/lib/schema';

const EARTH_RADIUS_M = 6_371_008.8;
export const SMAP_HISTORY_SOURCE = 'https://nsidc.org/data/spl4smgp/versions/8';

export type BoundaryAnalysis = {
  status: 'not_provided' | 'spatial_context';
  vertexCount: number;
  areaHa: number | null;
  centroid: { latitude: number; longitude: number } | null;
  smapHistorical: {
    product: 'SPL4SMGP';
    version: 8;
    temporalCoverage: '2015-03-31/present';
    temporalResolution: '3 hours';
    nominalResolutionKm: 9;
    numericStatus: 'requires_earthdata_preprocessing';
    spatialInterpretation: 'no_boundary' | 'coarser_than_boundary' | 'regional_grid_context';
    sourceUrl: string;
  };
};

function centroid(boundary: FieldBoundary): { latitude: number; longitude: number } {
  const total = boundary.reduce((sum, [longitude, latitude]) => ({ longitude: sum.longitude + longitude, latitude: sum.latitude + latitude }), { longitude: 0, latitude: 0 });
  return { latitude: total.latitude / boundary.length, longitude: total.longitude / boundary.length };
}

function areaHa(boundary: FieldBoundary): number {
  const center = centroid(boundary);
  const latFactor = Math.PI * EARTH_RADIUS_M / 180;
  const lonFactor = latFactor * Math.cos(center.latitude * Math.PI / 180);
  const points = boundary.map(([longitude, latitude]) => ({ x: (longitude - center.longitude) * lonFactor, y: (latitude - center.latitude) * latFactor }));
  const squareMeters = Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
  return Math.round(squareMeters / 100) / 100;
}

export function analyzeBoundary(boundary?: FieldBoundary): BoundaryAnalysis {
  const smapBase = { product: 'SPL4SMGP' as const, version: 8 as const, temporalCoverage: '2015-03-31/present' as const, temporalResolution: '3 hours' as const, nominalResolutionKm: 9 as const, numericStatus: 'requires_earthdata_preprocessing' as const, sourceUrl: SMAP_HISTORY_SOURCE };
  if (!boundary) return { status: 'not_provided', vertexCount: 0, areaHa: null, centroid: null, smapHistorical: { ...smapBase, spatialInterpretation: 'no_boundary' } };
  const hectares = areaHa(boundary);
  return { status: 'spatial_context', vertexCount: boundary.length, areaHa: hectares, centroid: centroid(boundary), smapHistorical: { ...smapBase, spatialInterpretation: hectares < 8_100 ? 'coarser_than_boundary' : 'regional_grid_context' } };
}
