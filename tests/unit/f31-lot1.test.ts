import { describe, expect, it } from 'vitest';
import raw from '@/data/plantae_F31_lote1_fbn_palhada_28_culturas_2026-11-18.json';
import audit from '@/docs/nd-audit/inventory.json';
import { f31Lot1, f31Lot1Schema } from '@/lib/f31-lot1';
import { cropById, cropEvidence } from '@/lib/catalog';

describe('F31 batch 1 research', () => {
  it('preserves all 56 supplied records and keeps pending research out of verified counts', () => {
    expect(f31Lot1).toEqual(raw);
    expect(audit.totals.pendingResearch).toEqual({ records: 56, sourced: 24, insufficient: 32, fieldTypeMismatches: 23 });
    expect(audit.matrix.find((row) => row.cropId === 'peanut' && row.field === 'nitrogenFixationPotential')?.pendingResearch?.reviewStatus).toBe('pending');
    expect(cropEvidence.some((item) => item.source.url === f31Lot1.records.find((record) => record.cropId === 'peanut' && record.field === 'nitrogenFixationPotential')?.source.url && item.field === 'nitrogenFixationPotential')).toBe(false);
    expect(cropById.get('peanut')?.nitrogenFixationPotential).toBeNull();
  });
  it('rejects duplicate pairs, missing sources and non-null insufficient values', () => {
    const duplicate = structuredClone(raw); duplicate.records[1] = duplicate.records[0];
    expect(f31Lot1Schema.safeParse(duplicate).success).toBe(false);
    const missing = structuredClone(raw); missing.records[0].source.url = null as never;
    expect(f31Lot1Schema.safeParse(missing).success).toBe(false);
    const insufficient = structuredClone(raw); const record = insufficient.records.find((item) => item.status === 'insufficient_source')!; record.value = 'unsupported' as never;
    expect(f31Lot1Schema.safeParse(insufficient).success).toBe(false);
  });
});
