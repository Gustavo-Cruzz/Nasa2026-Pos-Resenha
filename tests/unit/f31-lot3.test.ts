import { describe, expect, it } from 'vitest';
import raw from '@/data/plantae_F31_lote3_sistema_radicular_28_culturas_2026-11-18.json';
import audit from '@/docs/nd-audit/inventory.json';
import { f31Lot3, f31Lot3Schema } from '@/lib/f31-lot3';
import { cropById } from '@/lib/catalog';

describe('F31 batch 3 root research', () => {
  it('preserves all 28 contextual records without projecting a rooting class', () => {
    expect(f31Lot3).toEqual(raw);
    expect(audit.totals.pendingResearchLot3).toEqual({ records: 28, numericDepth: 26, withoutNumericDepth: 2 });
    expect(audit.matrix.find((row) => row.cropId === 'upland_rice' && row.field === 'rootingClass')?.pendingResearchLot3?.value.depth).toBeNull();
    expect(cropById.get('banana')?.rootingClass).toBeNull();
    expect(audit.totals.verifiedCombinations).toBe(72);
  });
  it('preserves phase values, sampling semantics and unknown bounds', () => {
    expect(f31Lot3.records.find((item) => item.cropId === 'cassava')?.value.depth?.isStatisticalRange).toBe(false);
    expect(f31Lot3.records.find((item) => item.cropId === 'upland_rice')?.value.rootCharacteristics).toContain('limite de amostragem');
    expect(f31Lot3.records.find((item) => item.cropId === 'pearl_millet')?.value.depth?.minCm).toBeNull();
    expect(f31Lot3.records.find((item) => item.cropId === 'banana')?.value.depth?.rootFractionPercent).toBe(62);
  });
  it('rejects duplicate IDs and invalid depth bounds or scoring policy', () => {
    const duplicate = structuredClone(raw); duplicate.records[1] = duplicate.records[0];
    expect(f31Lot3Schema.safeParse(duplicate).success).toBe(false);
    const reversed = structuredClone(raw); reversed.records[0].value.depth!.minCm = 100;
    expect(f31Lot3Schema.safeParse(reversed).success).toBe(false);
    const unsafe = structuredClone(raw); unsafe.reviewPolicy.readyForAutomaticSuitabilityScoring = true;
    expect(f31Lot3Schema.safeParse(unsafe).success).toBe(false);
  });
});
