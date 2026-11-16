import { describe, expect, it } from 'vitest';
import { buildRotationSummary, secondCropWaterMm } from '@/lib/rotation-summary';
import { analyze } from '@/lib/engine';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import type { AnalysisResult, Rotation } from '@/lib/engine/types';

const slot = (slotIndex: number, cropId: string | null, water: number | null, zarc?: string) => ({ slotIndex, year: slotIndex < 2 ? 1 : 2, season: slotIndex % 2 ? 'B' : 'A', cropId, cropName: cropId, indicators: [{ id: 'window_water_balance', value: water }], zarc: zarc ? { status: zarc } : null });
const rot = (id: 'A' | 'B' | 'C', slots: unknown[], extra: Record<string, unknown> = {}) => ({ id, title: id, baselineAssumed: false, slots, ...extra }) as unknown as Rotation;
const data = (strategies: Rotation[]) => ({ strategies, input: { plantingMonth: 10, history: [{ cropId: 'soybean', startYearMonth: '2023-10', endYearMonth: '2024-02' }, { cropId: 'maize', startYearMonth: '2024-02', endYearMonth: '2024-06' }] } }) as unknown as AnalysisResult;

describe('rotation summary', () => {
  it('shows A as reference and B as the real second-crop water difference vs A', () => {
    const summary = buildRotationSummary(data([
      rot('A', [slot(0, 'soybean', 10), slot(1, 'maize', -40)]),
      rot('B', [slot(0, 'soybean', 10), slot(1, 'sorghum', 61)], { tradeoffs: { summary: { gains: ['mais cobertura'], gainsEn: ['more cover'] } } }),
    ]), 'en');
    expect(summary.lanes.map((lane) => lane.id)).toEqual(['A', 'B']);
    expect(summary.lanes[0]!.outcome).toEqual({ kind: 'reference' });
    expect(summary.lanes[1]!.outcome).toEqual({ kind: 'delta', waterDeltaMm: 101, missingReason: null, tag: { kind: 'gain', text: 'more cover' } });
    expect(summary.monthLabels).toHaveLength(24); expect(summary.monthLabels[0]).toBe('Oct');
  });
  it('keeps unknown water as null and prefers the missing ZARC tag', () => {
    const summary = buildRotationSummary(data([
      rot('A', [slot(0, 'soybean', null), slot(1, 'maize', null)]),
      rot('C', [slot(0, 'soybean', 1), slot(1, 'sorghum', 5, 'not_indicated')]),
    ]), 'pt-BR');
    const outcome = summary.lanes[1]!.outcome;
    expect(outcome.kind === 'delta' && outcome.waterDeltaMm).toBeNull();
    expect(outcome.kind === 'delta' && outcome.tag?.kind).toBe('no_zarc');
    expect(secondCropWaterMm(undefined)).toBeNull();
  });
  it('skips empty slots and lays out blocks inside the 24-month horizon with a text description', () => {
    const lane = buildRotationSummary(data([rot('A', [slot(0, 'soybean', null), slot(1, null, null), slot(2, 'soybean', null), slot(3, 'maize', null)])]), 'pt-BR').lanes[0]!;
    expect(lane.blocks.map((block) => block.slotIndex)).toEqual([0, 2, 3]);
    for (const block of lane.blocks) { expect(block.startOffset).toBeGreaterThanOrEqual(0); expect(block.startOffset + block.months).toBeLessThanOrEqual(24); }
    expect(lane.description).toContain('–'); expect(lane.bareKnown).toBe(false); expect(lane.bareRuns).toEqual([]);
  });

  const climate = { status: 'available', origin: 'live', monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [], provenance: null, gaps: [], waterBalanceByMonth: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, precipMedianMm: 0, et0MedianMm: 0, balanceMedianMm: 10 * (index + 1), validYears: 15, expectedYears: 15, coveragePct: 100 })) } as unknown as ClimateContext;
  const input = (history: Array<{ cropId: string; startYearMonth: string; endYearMonth: string }>) => ({ location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 10, history, priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown' }) as never;
  it('real engine output with a safra->safrinha history shows both crops, repeated in year 2, with a numeric water delta', () => {
    const result = analyze(input([{ cropId: 'soybean', startYearMonth: '2023-10', endYearMonth: '2024-02' }, { cropId: 'maize', startYearMonth: '2024-02', endYearMonth: '2024-06' }]), climate);
    const lanes = buildRotationSummary(result, 'en').lanes;
    for (const lane of lanes) expect(lane.blocks.map((block) => block.slotIndex)).toEqual([0, 1, 2, 3]);
    expect(lanes[1]!.outcome.kind === 'delta' && typeof lanes[1]!.outcome.waterDeltaMm).toBe('number');
  });
  it('single-crop history (safrinha start unknown) still lays out B/C second crops instead of collapsing to one crop, and computes the water delta', () => {
    const result = analyze(input([{ cropId: 'soybean', startYearMonth: '2023-10', endYearMonth: '2024-02' }]), climate);
    const [a, b] = buildRotationSummary(result, 'en').lanes;
    expect(a!.blocks.map((block) => block.cropId)).toEqual(['soybean', 'soybean']);
    expect(b!.blocks.map((block) => block.cropId)).toEqual(['soybean', 'sorghum', 'soybean', 'sorghum']);
    for (const block of b!.blocks) expect(block.startOffset + block.months).toBeLessThanOrEqual(24);
    expect(secondCropWaterMm(result.strategies[1], result)).toEqual(expect.any(Number));
    expect(b!.outcome.kind === 'delta' && b!.outcome.missingReason).toBe('base_missing');
    const withA = buildRotationSummary(data([rot('A', [slot(0, 'soybean', 1), slot(1, 'maize', 2)]), rot('B', [slot(0, 'soybean', 1), slot(1, 'sorghum', null)])]), 'en').lanes[1]!;
    expect(withA.outcome.kind === 'delta' && withA.outcome.missingReason).toBe('no_data');
  });
});
