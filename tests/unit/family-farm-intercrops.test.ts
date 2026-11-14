import { describe, expect, it } from 'vitest';
import { cropAliases, cropById, cropEvidence, cropMetadataById, crops, isAnnualRotationEligible } from '@/lib/catalog';
import { croppingSystemSchema, documentedIntercrop, summarizeCroppingSystem } from '@/lib/intercrops';
import { analysisInputSchema } from '@/lib/schema';
import { createLabPlan, labPlanSchema } from '@/lib/lab';
import { analyze } from '@/lib/engine';

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

describe('intercropping systems', () => {
  it('accepts overlapping cassava and cowpea while retaining the long crop', () => {
    const system = croppingSystemSchema.parse({ plotId: 'talhao-1', type: 'intercrop', validation: 'documented_example', sourceSystemId: 'cassava_cowpea', events: [{ cropId: 'cassava', startYearMonth: '2026-01', endYearMonth: '2027-06' }, { cropId: 'cowpea', startYearMonth: '2026-02', endYearMonth: '2026-06' }] });
    expect(summarizeCroppingSystem(system)).toMatchObject({ speciesCount: 2, familyCount: 2, documentedExample: true });
  });

  it('rejects a non-overlapping system labeled as intercrop and retains custom crops as unknown context', () => {
    expect(croppingSystemSchema.safeParse({ plotId: 'talhao-1', type: 'intercrop', validation: 'user_defined', events: [{ cropId: 'maize', startYearMonth: '2026-01', endYearMonth: '2026-03' }, { cropId: 'common_bean', startYearMonth: '2026-04', endYearMonth: '2026-06' }] }).success).toBe(false);
    expect(documentedIntercrop(['maize', 'common_bean'])?.validation).toBe('documented_example_not_local_recommendation');
  });

  it('allows a cropping system in the analysis input and keeps perennials out of annual lab slots', () => {
    const input = analysisInputSchema.safeParse({ location: { latitude: -17.8, longitude: -50.9 }, plantingMonth: 1, history: [{ cropId: 'cassava', startYearMonth: '2025-01', endYearMonth: '2026-06' }], croppingSystems: [{ plotId: 'talhao-1', type: 'intercrop', validation: 'documented_example', events: [{ cropId: 'cassava', startYearMonth: '2025-01', endYearMonth: '2026-06' }, { cropId: 'cowpea', startYearMonth: '2025-02', endYearMonth: '2025-06' }] }], priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'rainfed' });
    expect(input.success).toBe(true);
    const plan = createLabPlan(input.success ? input.data : (() => { throw new Error('input'); })(), ['cassava', 'coffee', 'maize']);
    expect(labPlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.scenarios[1].slots[0].cropId).toBeNull();
    expect(analyze(input.success ? input.data : {}).strategies[0].croppingSystems[0]).toMatchObject({ type: 'intercrop', speciesCount: 2, documentedExample: true });
  });
});
