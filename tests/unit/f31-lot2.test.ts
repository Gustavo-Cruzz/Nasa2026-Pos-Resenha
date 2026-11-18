import { describe, expect, it } from 'vitest';
import raw from '@/data/plantae_F31_lote2_temperatura_ph_28_culturas_2026-11-18.json';
import audit from '@/docs/nd-audit/inventory.json';
import { f31Lot2, f31Lot2Schema } from '@/lib/f31-lot2';
import { cropById, cropEvidence } from '@/lib/catalog';

describe('F31 batch 2 temperature and pH research', () => {
  it('preserves all 56 references and keeps them out of engine evidence', () => {
    expect(f31Lot2).toEqual(raw);
    expect(audit.totals.pendingResearchLot2).toEqual({ records: 56, sourced: 56, temperature: 28, ph: 28 });
    expect(audit.matrix.find((row) => row.cropId === 'coffee' && row.field === 'idealTempC')?.pendingResearchLot2?.context.species).toContain('arabica');
    expect(audit.matrix.find((row) => row.cropId === 'upland_rice' && row.field === 'soilPhRange')?.pendingResearchLot2?.evidenceType).toBe('institutional_management_target');
    expect(cropById.get('watermelon')?.idealTempC).toBeNull();
    expect(cropEvidence.some((item) => item.field === 'temperatureRange')).toBe(false);
    expect(audit.totals.verifiedCombinations).toBe(72);
  });
  it('rejects duplicate crop-field pairs, bad ranges and permission to score automatically', () => {
    const duplicate = structuredClone(raw); duplicate.records[1] = duplicate.records[0];
    expect(f31Lot2Schema.safeParse(duplicate).success).toBe(false);
    const reversed = structuredClone(raw); reversed.records[0].value = { min: 40, max: 20 };
    expect(f31Lot2Schema.safeParse(reversed).success).toBe(false);
    const invalidPolicy = structuredClone(raw); invalidPolicy.policy.allowForAutomaticSuitabilityScoring = true;
    expect(f31Lot2Schema.safeParse(invalidPolicy).success).toBe(false);
  });
});
