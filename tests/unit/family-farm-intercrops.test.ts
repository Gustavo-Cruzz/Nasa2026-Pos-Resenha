import { describe, expect, it } from 'vitest';
import { cropAliases, cropById, cropEvidence, cropMetadataById, crops, isAnnualRotationEligible } from '@/lib/catalog';
import { croppingSystemSchema, documentedIntercrop, summarizeCroppingSystem } from '@/lib/intercrops';
import { analysisInputSchema } from '@/lib/schema';
import { createLabPlan, labPlanSchema } from '@/lib/lab';
import { analyze } from '@/lib/engine';

const event = (cropId: string, startYearMonth: string, endYearMonth: string) => ({ cropId, startYearMonth, endYearMonth });
const baseInput = { location: { latitude: -17.8, longitude: -50.9 }, plantingMonth: 1, history: [event('cassava', '2025-01', '2026-06')], priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'rainfed' as const };

describe('family-farm catalog integration', () => {
  it('merges the sixteen supplied crops without duplicating existing IDs', () => {
    expect(crops).toHaveLength(28);
    expect(new Set(crops.map((crop) => crop.id)).size).toBe(crops.length);
    expect(cropById.get('cassava')?.commonNames['pt-BR']).toContain('mandioca');
    expect(cropById.get('common_bean')?.scientificName).not.toBe(cropById.get('cowpea')?.scientificName);
    expect(cropAliases.get('feijão-preto')).toBe('common_bean');
    expect(cropAliases.get('feijão-fradinho')).toBe('cowpea');
  });

  it('preserves contextual harvest references without turning them into annual cycles', () => {
    expect(cropEvidence.some((record) => record.cropId === 'cassava' && record.field === 'harvestWindowMonths')).toBe(true);
    expect(cropById.get('cassava')?.cycleDaysRange).toBeNull();
    expect(cropMetadataById.get('coffee')?.lifeCycle).toBe('perennial');
    expect(isAnnualRotationEligible('coffee')).toBe(false);
  });
});

describe('cropping systems', () => {
  it('distinguishes single, overlapping intercrop, chronological succession, and rotation', () => {
    expect(croppingSystemSchema.safeParse({ plotId: '1', type: 'single', validation: 'user_defined', events: [event('maize', '2026-01', '2026-04')] }).success).toBe(true);
    expect(croppingSystemSchema.safeParse({ plotId: '2', type: 'intercrop', validation: 'user_defined', events: [event('maize', '2026-01', '2026-05'), event('cowpea', '2026-02', '2026-04')] }).success).toBe(true);
    expect(croppingSystemSchema.safeParse({ plotId: '3', type: 'succession', validation: 'user_defined', events: [event('maize', '2026-01', '2026-04'), event('cowpea', '2026-05', '2026-08')] }).success).toBe(true);
    expect(croppingSystemSchema.safeParse({ plotId: '4', type: 'rotation', validation: 'user_defined', events: [event('maize', '2026-01', '2026-04'), event('common_bean', '2026-06', '2026-09')] }).success).toBe(true);
    expect(croppingSystemSchema.safeParse({ plotId: '5', type: 'succession', validation: 'user_defined', events: [event('maize', '2026-01', '2026-05'), event('cowpea', '2026-04', '2026-08')] }).success).toBe(false);
  });

  it('accepts overlapping cassava and cowpea while retaining the long crop', () => {
    const system = croppingSystemSchema.parse({ plotId: 'talhao-1', type: 'intercrop', validation: 'documented_example', sourceSystemId: 'cassava_cowpea', events: [event('cassava', '2026-01', '2027-06'), event('cowpea', '2026-02', '2026-06')] });
    expect(summarizeCroppingSystem(system, 'cassava')).toMatchObject({ speciesCount: 2, familyCount: 2, documentedExample: true, appliesToStrategy: true });
  });

  it('requires exact example identity and never promotes user-defined crop matches', () => {
    const userDefined = croppingSystemSchema.parse({ plotId: '1', type: 'intercrop', validation: 'user_defined', events: [event('maize', '2026-01', '2026-05'), event('common_bean', '2026-02', '2026-04')] });
    expect(documentedIntercrop(userDefined)).toBeUndefined();
    expect(summarizeCroppingSystem(userDefined).documentedExample).toBe(false);
    expect(croppingSystemSchema.safeParse({ ...userDefined, validation: 'documented_example', sourceSystemId: 'maize_cowpea' }).success).toBe(true);
    const mismatched = croppingSystemSchema.parse({ ...userDefined, validation: 'documented_example', sourceSystemId: 'maize_cowpea' });
    expect(documentedIntercrop(mismatched)).toBeUndefined();
  });

  it('rejects unknown, blocked, unaccepted, and duplicate-plot crops at boundaries', () => {
    expect(croppingSystemSchema.safeParse({ plotId: '1', type: 'single', validation: 'user_defined', events: [event('invented_crop', '2026-01', '2026-04')] }).success).toBe(false);
    const system = { plotId: 'talhao-1', type: 'intercrop', validation: 'user_defined', events: [event('maize', '2026-01', '2026-05'), event('cowpea', '2026-02', '2026-04')] };
    expect(analysisInputSchema.safeParse({ ...baseInput, farmerCrops: { availableCropIds: ['maize'], exploreCropIds: [], blockedCropIds: ['cowpea'], customCrops: [] }, croppingSystems: [system] }).success).toBe(false);
    expect(analysisInputSchema.safeParse({ ...baseInput, farmerCrops: { availableCropIds: ['maize'], exploreCropIds: [], blockedCropIds: [], customCrops: [] }, croppingSystems: [system] }).success).toBe(false);
    expect(analysisInputSchema.safeParse({ ...baseInput, croppingSystems: [system, { ...system }] }).success).toBe(false);
  });

  it('applies a declared system only to matching A/B/C hypotheses', () => {
    const input = analysisInputSchema.parse({ ...baseInput, farmerCrops: { availableCropIds: ['cassava', 'cowpea', 'maize'], exploreCropIds: [], blockedCropIds: [], customCrops: [] }, croppingSystems: [{ plotId: 'talhao-1', type: 'intercrop', validation: 'documented_example', sourceSystemId: 'cassava_cowpea', events: [event('cassava', '2025-01', '2026-06'), event('cowpea', '2025-02', '2025-06')] }] });
    const result = analyze(input);
    expect(result.strategies[0].croppingSystems[0]).toMatchObject({ appliesToStrategy: true, documentedExample: true });
    expect(result.strategies[0].explanations.some((item) => item.ruleId === 'DECLARED_INTERCROP_EXPOSURE')).toBe(true);
    expect(result.strategies.filter((strategy) => strategy.proposedCrop?.cropId !== 'cassava' && strategy.proposedCrop?.cropId !== 'cowpea').every((strategy) => strategy.croppingSystems[0].appliesToStrategy === false)).toBe(true);
  });

  it('keeps perennials out of annual lab slots', () => {
    const input = analysisInputSchema.parse(baseInput);
    const plan = createLabPlan(input, ['cassava', 'coffee', 'maize']);
    expect(labPlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.scenarios[1].slots[0].cropId).toBeNull();
  });
});
