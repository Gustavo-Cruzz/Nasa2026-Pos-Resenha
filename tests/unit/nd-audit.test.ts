import { describe, expect, it } from 'vitest';
import audit from '@/docs/nd-audit/inventory.json';
import { crops } from '@/lib/catalog';

describe('N/D source inventory', () => {
  it('covers each catalog crop and core field exactly once without inventing a value', () => {
    expect(audit.totals.crops).toBe(crops.length);
    expect(audit.matrix).toHaveLength(crops.length * audit.totals.fields);
    const keys = audit.matrix.map((row) => `${row.cropId}:${row.field}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const row of audit.matrix) {
      if (row.status === 'verified_record') expect(row.records.some((record) => record.verification !== 'not_verified' && record.value !== null)).toBe(true);
      if (row.status === 'no_record') expect(row.records).toHaveLength(0);
    }
    expect(audit.totals.ndvi.available + audit.totals.ndvi.insufficient + audit.totals.ndvi.unavailable).toBe(audit.totals.ndvi.expected);
    expect(audit.uiOccurrences).toHaveLength(audit.totals.uiOccurrences);
    expect(audit.uiOccurrences.every((item) => item.file && item.line > 0 && item.family && item.plannedSprint)).toBe(true);
    expect(audit.totals.contextualCycles).toEqual({ records: 17, ranges: 9, noTerminalCycle: 8, harvestAssumptions: 1 });
    const cycle = (id: string) => audit.matrix.find((row) => row.cropId === id && row.field === 'cycleDaysRange');
    expect(cycle('watermelon')?.status).toBe('verified_record');
    expect(cycle('lettuce')?.contextualCycle?.verification).toBe('verified_with_harvest_assumption');
    expect(cycle('kale')?.contextualCycle?.value).toBeNull();
    expect(cycle('kale')?.status).toBe('no_record');
    expect(cycle('kale')?.contextualCycle?.milestones[0]?.kind).toBe('timeToFirstHarvest');
  });
});
