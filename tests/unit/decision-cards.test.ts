import { describe, expect, it } from 'vitest';
import { buildCardDelta, buildScenarioCards, humanizeMissing } from '@/lib/engine/decision-cards';
import type { AnalysisResult, Rotation } from '@/lib/engine/types';

const slot = (id: 'A' | 'B' | 'C', i: number, cropId: string | null) => ({ scenarioId: id, slotIndex: i, year: i < 2 ? 1 : 2, season: i % 2 ? 'B' : 'A', cropId, cropName: cropId, previousCropId: null, indicators: [], sourceRefs: [], missingEvidence: [], zarc: null });
const rot = (id: 'A' | 'B' | 'C', crops: Array<string | null>, extra: Partial<Rotation> = {}) => ({ id, title: id, baseline: id === 'A', slots: crops.map((c, i) => slot(id, i, c)), missingData: [], ...extra }) as unknown as Rotation;
const summary = { gains: ['g1', 'g2', 'g3', 'g4'], losses: ['l1'], unknowns: [], gainsEn: ['eg1'], lossesEn: ['el1'], unknownsEn: ['eu1'] };
const cell = (axis: string, level: string, missing: string[] = []) => ({ axis, level, summary: `s-${axis}`, summaryEn: `en-${axis}`, evidence: [], sourceRefs: [], missing });

describe('decision cards view-model (audit 3.1/3.3/3.7)', () => {
  const a = rot('A', ['soybean', 'maize', 'soybean', 'maize']);
  const b = rot('B', ['soybean', 'sorghum', 'soybean', 'maize'], { tradeoffs: { summary, cells: [cell('water', 'better'), cell('soil', 'unknown', ['residue_potential', 'weird_id']), cell('market', 'worse')] } as never, missingData: ['zarc_window'] });
  const data = { strategies: [a, b] } as unknown as AnalysisResult;
  it('limits benefits to three and picks the locale', () => {
    const [, card] = buildScenarioCards(data, 'pt-BR');
    expect(card!.benefits).toEqual(['g1', 'g2', 'g3']);
    expect(buildScenarioCards(data, 'en')[1]!.benefits).toEqual(['eg1']);
  });
  it('leaves empty lists (N/D) when tradeoffs are absent', () => {
    const [card] = buildScenarioCards(data, 'pt-BR');
    expect(card!.benefits).toEqual([]); expect(card!.honesty.know).toEqual([]);
  });
  it('computes the slot delta against A only for changed slots', () => {
    expect(buildCardDelta(a, b)).toEqual([expect.objectContaining({ slotIndex: 1, fromId: 'maize', toId: 'sorghum' })]);
    expect(buildCardDelta(a, a)).toEqual([]);
  });
  it('builds the honesty strip from cells and missing data', () => {
    const { honesty } = buildScenarioCards(data, 'en')[1]!;
    expect(honesty.know).toEqual(['Water: en-water', 'Local market: en-market']);
    expect(honesty.missing).toEqual(['residue potential', 'additional evidence', 'ZARC window']);
    expect(honesty.validate).toEqual(['Soil', 'Local market']);
    expect(humanizeMissing('x', 'pt-BR')).toBe('evidência adicional');
  });
});
