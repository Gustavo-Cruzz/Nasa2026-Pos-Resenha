import { describe, expect, it } from 'vitest';
import raw from '@/data/plantae_F31_lote4_kc_ciclos_28_culturas_2026-11-18.json';
import audit from '@/docs/nd-audit/inventory.json';
import { f31Lot4, f31Lot4Schema } from '@/lib/f31-lot4';
import { cropById } from '@/lib/catalog';
import { resolveCycleSimulation } from '@/lib/cycle-simulation';

describe('F31 batch 4 Kc and crop stages', () => {
  it('preserves all references without promoting them to engine parameters', () => {
    expect(f31Lot4).toEqual(raw);
    expect(audit.totals.pendingResearchLot4).toEqual({ records: 56, kcWithValues: 23, cycleWithValues: 20, withoutValues: 13, phaseTotalConflicts: ['sorghum'] });
    expect(audit.totals.verifiedCombinations).toBe(72);
    expect(audit.matrix.find((row) => row.cropId === 'soybean' && row.field === 'kcStages')?.pendingResearchLot4?.reviewStatus).toBe('pending');
    expect(cropById.get('watermelon')?.kcStages).toBeNull();
    expect(resolveCycleSimulation('watermelon', true)?.daysRange).toEqual({ min: 95, max: 110 });
  });
  it('preserves missing and inapplicable values, and rejects unsafe policies and malformed records', () => {
    expect(f31Lot4.records.filter((item) => item.status !== 'source_found').every((item) => item.value === null)).toBe(true);
    const duplicate = structuredClone(raw); duplicate.records[1] = duplicate.records[0];
    expect(f31Lot4Schema.safeParse(duplicate).success).toBe(false);
    const unsafe = structuredClone(raw); unsafe.policy.doNotComputeETcOrIrrigation = false;
    expect(f31Lot4Schema.safeParse(unsafe).success).toBe(false);
    const malformed = structuredClone(raw); (malformed.records[0].value as { initial: { min: number } }).initial.min = -1;
    expect(f31Lot4Schema.safeParse(malformed).success).toBe(false);
  });
});
