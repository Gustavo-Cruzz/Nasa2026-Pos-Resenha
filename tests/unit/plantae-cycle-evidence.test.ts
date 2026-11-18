import { describe, expect, it } from 'vitest';
import { cropById, plantaeCycleEvidence } from '@/lib/catalog';

describe('Plantae contextual cycle evidence', () => {
  it('has exactly 17 unique catalog crops with sourced context and valid ranges', () => {
    expect(plantaeCycleEvidence).toHaveLength(17);
    expect(new Set(plantaeCycleEvidence.map((record) => record.cropId)).size).toBe(17);
    for (const record of plantaeCycleEvidence) {
      expect(cropById.has(record.cropId)).toBe(true);
      expect(record.source.url).toMatch(/^https?:\/\//);
      expect(record.source.accessedAt).toBe('2026-11-18');
      expect(record.context.cycleDefinition.trim()).not.toBe('');
      if (record.value) expect(record.value.min).toBeGreaterThan(0), expect(record.value.min).toBeLessThanOrEqual(record.value.max);
      for (const milestone of record.milestones) expect(milestone.source.url).toMatch(/^https?:\/\//);
    }
  });
  it('does not project non-terminal crops or milestones into the engine cycle range', () => {
    for (const id of ['ruziziensis', 'kale', 'bell_pepper', 'okra', 'coffee', 'banana', 'cacao', 'acai']) {
      expect(plantaeCycleEvidence.find((record) => record.cropId === id)?.value).toBeNull();
      expect(cropById.get(id)?.cycleDaysRange).toBeNull();
    }
    expect(plantaeCycleEvidence.find((record) => record.cropId === 'peanut')?.context.cycleDefinition).toContain('emergência');
    expect(plantaeCycleEvidence.find((record) => record.cropId === 'onion')?.context.region).toContain('Nordeste');
    expect(plantaeCycleEvidence.find((record) => record.cropId === 'cassava')?.context.cycleDefinition).toContain('fenológico');
    expect(plantaeCycleEvidence.find((record) => record.cropId === 'lettuce')?.verification).toBe('verified_with_harvest_assumption');
  });
});
