import { describe, expect, it } from 'vitest';
import { registrationGaps, registrationProgress } from '@/lib/farm/summary';
import { analysisInputSchema } from '@/lib/schema';

const base = analysisInputSchema.parse({
  location: { latitude: -17.798, longitude: -50.919 },
  plantingMonth: 10,
  history: [{ cropId: 'maize', startYearMonth: '2023-02', endYearMonth: '2023-06' }, { cropId: 'soybean', startYearMonth: '2023-10', endYearMonth: '2024-02' }],
  priorities: { water: 2, soil: 3, operations: 1 },
  irrigation: 'rainfed',
  fieldBoundary: [[-50.925, -17.792], [-50.912, -17.792], [-50.912, -17.804]],
});

describe('registration summary: what is still missing', () => {
  it('has nothing missing when the previous crop, the water and the area are all given', () => {
    expect(registrationGaps(base)).toEqual([]);
    expect(registrationProgress(base)).toEqual({ filled: 3, total: 3 });
  });
  it('lists each missing item on its own', () => {
    expect(registrationGaps({ ...base, history: [base.history[1]] })).toEqual(['previous_crop']);
    expect(registrationGaps({ ...base, irrigation: 'unknown' })).toEqual(['water']);
    expect(registrationGaps({ ...base, fieldBoundary: undefined })).toEqual(['area']);
  });
  it('counts all three when none was given, and reports the progress', () => {
    const bare = { ...base, history: [base.history[1]], irrigation: 'unknown' as const, fieldBoundary: undefined };
    expect(registrationGaps(bare)).toEqual(['previous_crop', 'water', 'area']);
    expect(registrationProgress(bare)).toEqual({ filled: 0, total: 3 });
  });
  it('does not treat a soil report as a gap: "nothing unusual" is a valid answer', () => {
    expect(registrationGaps({ ...base, soilObservation: undefined })).toEqual([]);
  });
});
