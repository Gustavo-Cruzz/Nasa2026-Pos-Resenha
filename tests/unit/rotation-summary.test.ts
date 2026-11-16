import { describe, expect, it } from 'vitest';
import { buildRotationSummary, secondCropWaterMm } from '@/lib/rotation-summary';
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
    expect(summary.lanes[1]!.outcome).toEqual({ kind: 'delta', waterDeltaMm: 101, tag: { kind: 'gain', text: 'more cover' } });
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
});
