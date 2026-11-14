import { describe, expect, it } from 'vitest';
import { resolveRegionalSoilContext } from '@/lib/soil/regional-context';

describe('regional soil adapter', () => {
  it('keeps every unavailable spatial attribute null instead of inventing an estimate', () => {
    const context = resolveRegionalSoilContext({ latitude: -17.798, longitude: -50.919 });
    expect(context).toMatchObject({ status: 'unavailable', classification: 'unknown', providers: ['SoilGrids', 'MapBiomas Solo'] });
    expect(context.attributes).toHaveLength(9);
    expect(context.attributes.every((item) => item.value === null && item.unit === null && item.depthCm === null)).toBe(true);
  });
});
