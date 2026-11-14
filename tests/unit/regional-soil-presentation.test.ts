import { describe, expect, it } from 'vitest';
import { resolveRegionalSoilAnalysis } from '@/lib/soil/regional-analysis';
import { buildRegionalSoilSummary } from '@/lib/soil/presentation';

describe('30-second regional soil summary', () => {
  it('returns exactly texture, pH, carbon and root-zone wetness', () => {
    const context = resolveRegionalSoilAnalysis({ latitude: -17.798, longitude: -50.919 });
    const summary = buildRegionalSoilSummary(context, 'pt-BR');
    expect(summary.map((item) => item.id)).toEqual(['texture', 'ph', 'organic_carbon', 'root_zone_wetness']);
    expect(summary).toHaveLength(4);
    expect(summary.every((item) => item.value !== 'N/D')).toBe(true);
    expect(summary.find((item) => item.id === 'root_zone_wetness')?.label).toMatch(/\d{2}\/\d{4}/);
  });

  it('keeps unavailable static values unknown while retaining NASA moisture', () => {
    const context = resolveRegionalSoilAnalysis({ latitude: -23.5505, longitude: -46.6333 });
    const summary = buildRegionalSoilSummary(context, 'pt-BR');
    expect(summary.filter((item) => item.id !== 'root_zone_wetness').every((item) => item.status === 'unknown' && item.value === 'N/D')).toBe(true);
    expect(summary.find((item) => item.id === 'root_zone_wetness')).toMatchObject({ status: 'modelled' });
  });
});
