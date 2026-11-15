import { describe, expect, it } from 'vitest';
import { cropEvidence, cropById, crops, verifiedCropEvidence } from '@/lib/catalog';
import { analysisInputSchema } from '@/lib/schema';

const base = { location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 1, history: [{ cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' }, { cropId: 'maize', startYearMonth: '2023-07', endYearMonth: '2023-12' }, { cropId: 'soybean', startYearMonth: '2024-01', endYearMonth: '2024-06' }], priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown' };

describe('catalog and wizard contracts', () => {
  it('contains the original catalog plus the supplied family-farm species and preserves missing parameters', () => {
    expect(crops).toHaveLength(28);
    expect(crops.filter((crop) => crop.parameterStatus === 'missing')).toHaveLength(28);
    expect(crops.find((crop) => crop.id === 'soybean')?.idealTempC).toEqual({ min: 30, max: 30 });
  });

  it('keeps retained P0 evidence traceable without making partial crops eligible', () => {
    expect(cropEvidence.every((record) => record.source.url === null || record.source.url.startsWith('https://'))).toBe(true);
    expect(cropEvidence.every((record) => record.context && record.location && record.source.title && record.source.pageOrSection && record.source.snippet && record.source.accessedAt)).toBe(true);
    expect(cropEvidence.find((record) => record.cropId === 'sunn_hemp' && record.field === 'cycleDaysRange')?.value).toEqual({ min: 63, max: 68 });
    expect(crops.every((crop) => crop.parameterStatus === 'missing')).toBe(true);
    expect(cropEvidence.find((record) => record.cropId === 'cowpea' && record.field === 'maturityDays')?.source.verification).toBe('verified');
    expect(cropEvidence.find((record) => record.cropId === 'cowpea' && record.field === 'maturityDays')?.cultivar).toBe('BRS Guariba');
    expect(crops.find((crop) => crop.id === 'common_bean')?.kcStages?.map((stage) => stage.kc)).toEqual([0.4, 1.15, 0.35]);
    expect(verifiedCropEvidence('common_bean', 'kcStages')?.source.institution).toContain('FAO');
  });

  it('accepts partial soil without changing its origin', () => {
    const parsed = analysisInputSchema.parse({ ...base, soil: { origin: 'farmer_lab', ph: 6.1 } });
    expect(parsed.soil).toMatchObject({ origin: 'farmer_lab', ph: 6.1 });
  });

  it('keeps farmer soil measurements and optional laboratory fields explicit', () => {
    const parsed = analysisInputSchema.parse({ ...base, soil: { origin: 'farmer_lab', ph: 6.1, phMethod: 'CaCl2', sandPct: 40, siltPct: 30, clayPct: 30, organicCarbonGKg: 18, phosphorusMgDm3: 12, potassiumMgDm3: 90, depthCm: 20, observedAt: '2026-10-01', drainagePerception: 'good' } });
    expect(parsed.soil).toMatchObject({ origin: 'farmer_lab', phMethod: 'CaCl2', phosphorusMgDm3: 12, drainagePerception: 'good' });
  });

  it('accepts farmer crop availability, preferences, blocks and custom crops without scientific defaults', () => {
    const parsed = analysisInputSchema.parse({ ...base, farmerCrops: { availableCropIds: ['soybean', 'maize'], exploreCropIds: ['sorghum'], blockedCropIds: ['sunflower'], customCrops: [{ label: 'mandioca', purpose: 'grain' }] } });
    expect(parsed.farmerCrops?.customCrops[0]).toEqual({ label: 'mandioca', purpose: 'grain' });
    expect(analysisInputSchema.safeParse({ ...base, farmerCrops: { availableCropIds: ['maize'], exploreCropIds: [], blockedCropIds: ['maize'], customCrops: [] } }).success).toBe(false);
  });

  it('accepts an explicit baseline crop without inventing dates', () => {
    const parsed = analysisInputSchema.parse({ ...base, futureBaseline: { cropId: 'sunflower', confirmed: true } });
    expect(parsed.futureBaseline).toEqual({ cropId: 'sunflower', confirmed: true });
  });

  it('rejects overlapping historical events', () => {
    expect(analysisInputSchema.safeParse({ ...base, history: [base.history[0], { ...base.history[1], startYearMonth: '2023-05' }, base.history[2]] }).success).toBe(false);
  });
});
