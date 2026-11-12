import { describe, expect, it } from 'vitest';
import { migrateV1Draft } from '@/lib/storage';

const v1 = { version: 1, savedAt: '2026-11-12T15:00:00.000Z', keepAtRoot: 'preserve me', data: { location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 4, history: [{ cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06', nestedExtension: 'keep me' }, { cropId: 'maize', startYearMonth: '2023-07', endYearMonth: '2023-12' }, { cropId: 'soybean', startYearMonth: '2024-01', endYearMonth: '2024-06' }], priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown', keepInData: { source: 'legacy' } } };

describe('draft V1 migration', () => {
  it('keeps valid analysis data and opaque V1 fields in V2', () => {
    const migrated = migrateV1Draft(v1);
    expect(migrated?.version).toBe(2);
    expect(migrated?.data.history[1]?.cropId).toBe('maize');
    expect(migrated?.legacy).toEqual({ v1 });
  });
  it('does not migrate invalid legacy input', () => expect(migrateV1Draft({ ...v1, data: { ...v1.data, plantingMonth: 13 } })).toBeUndefined());
});
