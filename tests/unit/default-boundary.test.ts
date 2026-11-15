import { describe, expect, it } from 'vitest';
import { analyzeBoundary } from '@/lib/engine/boundary-context';
import { SUGGESTED_AREA_HA, suggestedBoundary } from '@/lib/farm/default-boundary';
import { fieldBoundarySchema } from '@/lib/schema';

describe('suggestedBoundary', () => {
  for (const [latitude, longitude] of [[0, -50], [-17.798, -50.919], [-33, -53]] as const) {
    it(`is ~${SUGGESTED_AREA_HA} ha, centred and valid at ${latitude}`, () => {
      const polygon = suggestedBoundary({ latitude, longitude });
      expect(fieldBoundarySchema.safeParse(polygon).success).toBe(true);
      const area = analyzeBoundary(polygon).areaHa as number;
      expect(Math.abs(area - SUGGESTED_AREA_HA) / SUGGESTED_AREA_HA).toBeLessThan(0.02);
      const center = analyzeBoundary(polygon).centroid!;
      expect(center.latitude).toBeCloseTo(latitude, 6);
      expect(center.longitude).toBeCloseTo(longitude, 6);
    });
  }
  it('accepts another area', () => {
    expect(analyzeBoundary(suggestedBoundary({ latitude: -10, longitude: -50 }, { areaHa: 100 })).areaHa).toBeGreaterThan(98);
  });
});
