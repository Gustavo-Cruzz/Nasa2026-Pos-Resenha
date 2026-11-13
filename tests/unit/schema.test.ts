import { describe, expect, it } from 'vitest';
import { analysisInputSchema, coordinatesSchema, soilProfileSchema } from '@/lib/schema';

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

  it('accepts one to three historical events and rejects either boundary violation', () => {
    const event = { cropId: 'soybean', startYearMonth: '2024-01', endYearMonth: '2024-06' };
    const base = { location: { latitude: 0, longitude: 0 }, plantingMonth: 4, priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown' as const };
    expect(analysisInputSchema.safeParse({ ...base, history: [event] }).success).toBe(true);
    expect(analysisInputSchema.safeParse({ ...base, history: [] }).success).toBe(false);
    expect(analysisInputSchema.safeParse({ ...base, history: [event, { ...event, startYearMonth: '2024-07', endYearMonth: '2024-08' }, { ...event, startYearMonth: '2024-09', endYearMonth: '2024-10' }] }).success).toBe(true);
    expect(analysisInputSchema.safeParse({ ...base, history: [event, event, event, event] }).success).toBe(false);
  });
});
