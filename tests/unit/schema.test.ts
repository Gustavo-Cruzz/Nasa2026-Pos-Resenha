import { describe, expect, it } from 'vitest';
import { coordinatesSchema, soilProfileSchema } from '@/lib/schema';

describe('foundation domain schemas', () => {
  it('accepts valid global coordinates', () => {
    expect(coordinatesSchema.parse({ latitude: -17.8, longitude: -50.9 })).toEqual({ latitude: -17.8, longitude: -50.9 });
  });

  it('rejects invalid coordinates', () => {
    expect(coordinatesSchema.safeParse({ latitude: 91, longitude: 0 }).success).toBe(false);
  });

  it('allows partial soil data while preserving its origin', () => {
    expect(soilProfileSchema.parse({ origin: 'unknown', ph: 6.1 })).toMatchObject({ origin: 'unknown', ph: 6.1 });
  });
});
