import { describe, expect, it } from 'vitest';
import { resolveRegionalSoilContext } from '@/lib/soil/regional-context';

describe('regional soil adapter', () => {
  it('uses the versioned SoilGrids artifact only for its exact captured coordinate', () => {
    const context = resolveRegionalSoilContext({ latitude: -17.798, longitude: -50.919 });
    expect(context).toMatchObject({ status: 'available', classification: 'estimated', artifactId: 'soilgrids-rio-verde-2026-11-14-v1', license: 'CC BY 4.0' });
    expect(context.attributes.find((item) => item.id === 'phh2o')).toMatchObject({ value: 5.2, unit: 'pH', depthCm: { min: 0, max: 5 }, resolutionM: 250, uncertainty: { type: '90% prediction interval', lower: 4.5, upper: 6.4 } });
    expect(context.attributes.find((item) => item.id === 'wv1500')?.value).toBeNull();
  });

  it('keeps every unavailable spatial attribute null instead of inventing an estimate', () => {
    const context = resolveRegionalSoilContext({ latitude: -17.799, longitude: -50.919 });
    expect(context).toMatchObject({ status: 'unavailable', classification: 'unknown', providers: ['SoilGrids', 'MapBiomas Solo'] });
    expect(context.attributes).toHaveLength(9);
    expect(context.attributes.every((item) => item.value === null && item.unit === null && item.depthCm === null)).toBe(true);
  });
});
