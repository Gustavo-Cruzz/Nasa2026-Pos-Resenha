import { describe, expect, it } from 'vitest';
import { analyzeBoundary } from '@/lib/engine/boundary-context';
import { analyze } from '@/lib/engine';

describe('field boundary analysis', () => {
  it('keeps the polygon spatial and refuses to fabricate numeric SMAP history', () => {
    const result = analyzeBoundary([[-50.920, -17.800], [-50.910, -17.800], [-50.910, -17.790], [-50.920, -17.790]]);
    expect(result.status).toBe('spatial_context');
    expect(result.areaHa).toBeGreaterThan(0);
    expect(result.smapHistorical).toMatchObject({ product: 'SPL4SMGP', version: 8, nominalResolutionKm: 9, numericStatus: 'requires_earthdata_preprocessing', spatialInterpretation: 'coarser_than_boundary' });
  });

  it('carries the boundary and explicit SMAP gap into the public analysis', () => {
    const result = analyze({ location: { latitude: -17.8, longitude: -50.9 }, fieldBoundary: [[-50.920, -17.800], [-50.910, -17.800], [-50.910, -17.790]], plantingMonth: 4, history: [{ cropId: 'soybean', startYearMonth: '2024-01', endYearMonth: '2024-06' }], priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown' });
    expect(result.boundaryAnalysis.status).toBe('spatial_context');
    expect(result.evidenceManifest.sources).toContainEqual(expect.objectContaining({ id: 'nasa-smap-history', status: 'partial' }));
    expect(result.evidenceManifest.gaps).toContainEqual(expect.objectContaining({ id: 'smap_numeric_polygon_history' }));
  });
});
