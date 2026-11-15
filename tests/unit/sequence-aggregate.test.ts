import { describe, expect, it } from 'vitest';
import { analyze } from '@/lib/engine';
import type { ClimateContext } from '@/lib/climate/nasa-power';

const climate: ClimateContext = { status: 'available', origin: 'live', monthly: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, tmeanMedianC: 25, precipMedianMm: 2, validTemperatureDays: 400, validPrecipitationDays: 400 })), plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [], provenance: null, gaps: [] };
const sorriso = { location: { latitude: -12.545, longitude: -55.721 }, plantingMonth: 10, history: [{ cropId: 'soybean', startYearMonth: '2024-10', endYearMonth: '2025-02' }, { cropId: 'maize', startYearMonth: '2025-02', endYearMonth: '2025-06' }], priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown' };
const row = (strategy: ReturnType<typeof analyze>['strategies'][number], id: string) => strategy.indicators.find((item) => item.id === id)!;

describe('sequence-level scenarios (round 3)', () => {
  const result = analyze(sorriso, climate);
  it('judges each scenario by its distinguishing safrinha crop and month', () => {
    const [a, b, c] = result.strategies;
    expect(a.proposedCrop).toMatchObject({ cropId: 'maize', plantingMonth: 2 });
    expect(new Set([a, b, c].map((item) => item.proposedCrop?.cropId)).size).toBe(3);
    expect(result.nasaInsight.effects.map((effect) => effect.cropId)).toEqual([a, b, c].map((item) => item.proposedCrop?.cropId));
  });
  it('assesses the safrinha slot in its own month and says where the month comes from', () => {
    const slot = result.strategies[1].slots[1];
    expect(slot.indicators.find((item) => item.id === 'thermal_compatibility')?.state).toBe('compatible');
    expect(slot.indicators.find((item) => item.id === 'thermal_compatibility')?.detail).toContain('Safrinha avaliada em fev (início observado no seu histórico)');
  });
  it('aggregates rows over the four slots so scenarios differ', () => {
    const [a, b] = result.strategies;
    expect(row(a, 'cover_potential').state).toBe('no'); expect(row(b, 'cover_potential').state).toBe('yes'); expect(row(b, 'cover_potential').detail).toContain('sorgo');
    expect(row(a, 'functional_diversity').state).toBe('compatible'); expect(row(b, 'functional_diversity').state).toBe('compatible'); /* family rule: B no longer repeats soybean's family (was cowpea, Fabaceae) */
    expect(row(a, 'thermal_compatibility').detail).toContain('soja (out)'); expect(row(a, 'thermal_compatibility').detail).toContain('milho (fev)');
    expect(b.soilHealth.find((item) => item.id === 'nitrogen_fixation_potential')?.detail).toContain('soja');
    expect(JSON.stringify(result.strategies)).not.toMatch(/"score"/);
  });
  it('never invents a safrinha month: thermal/climate rows become unknown and proposedCrop month is null', () => {
    const single = analyze({ ...sorriso, history: [sorriso.history[0]] }, climate);
    const slot = single.strategies[1].slots[1];
    expect(slot.indicators.find((item) => item.id === 'thermal_compatibility')).toMatchObject({ state: 'unknown', detail: 'Janela da safrinha não informada.' });
    expect(single.strategies[1].proposedCrop?.plantingMonth).toBeNull();
  });
});
