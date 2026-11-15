import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyze } from '@/lib/engine';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import { changeLabSlot, createLabPlan, type LabPlan } from '@/lib/lab';
import { analysisInputSchema, type AnalysisInput } from '@/lib/schema';
import { buildFarmScenarioViews, cropLabel, stableStringify } from '@/lib/future-farm/adapter';
import { composeFarmScene, FARM_BASE, farmSpriteSource, GENERIC_CROP_SPRITE } from '@/lib/future-farm/composer';
import { buildDemoScenarioViews, demoScenes, futureFarmDemo } from '@/lib/future-farm/demo';
import { FARM_SCENE_DISCLAIMER, type CropPresence } from '@/lib/future-farm/types';

const unavailable: ClimateContext = { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [], provenance: null, gaps: ['NASA down'] };
const event = (cropId: string, startYearMonth: string, endYearMonth: string) => ({ cropId, startYearMonth, endYearMonth });
const base: AnalysisInput = analysisInputSchema.parse({ location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 4, history: [event('soybean', '2023-01', '2023-06'), event('maize', '2023-07', '2023-12')], priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'rainfed' });

function fourStagePlan(): LabPlan {
  let plan = createLabPlan(base, ['maize', 'cowpea', 'sorghum']);
  plan = changeLabSlot(plan, 'A', 1, 'soybean'); plan = changeLabSlot(plan, 'A', 2, 'maize'); plan = changeLabSlot(plan, 'A', 3, 'ruziziensis');
  plan = changeLabSlot(plan, 'B', 2, 'maize'); plan = changeLabSlot(plan, 'B', 3, 'sunflower');
  return plan;
}
const primary = (cropId: string): CropPresence => ({ cropId, ...cropLabel(cropId, 'pt-BR'), role: 'primary' });

describe('Future Farm Stories adapter', () => {
  it('maps A/B/C in order with up to four real stages, never reordering or filling gaps', () => {
    const plan = fourStagePlan();
    const views = buildFarmScenarioViews({ analysis: analyze(base, unavailable, plan), currentPlan: plan }, 'pt-BR');
    expect(views.map((view) => view.id)).toEqual(['A', 'B', 'C']);
    expect(views[0].cycles.map((cycle) => cycle.crops[0].cropId)).toEqual(['maize', 'soybean', 'maize', 'ruziziensis']);
    expect(views[0].cycles.map((cycle) => cycle.index)).toEqual([0, 1, 2, 3]);
    expect(views[0].cycles.map((cycle) => cycle.period)).toEqual([{ year: 1, season: 'A' }, { year: 1, season: 'B' }, { year: 2, season: 'A' }, { year: 2, season: 'B' }]);
    // B has slot 1 empty: shown stages are 1, 3, 4 and nothing is invented for stage 2.
    expect(views[1].cycles.map((cycle) => [cycle.index, cycle.crops[0].cropId])).toEqual([[0, 'cowpea'], [2, 'maize'], [3, 'sunflower']]);
    expect(views[2].cycles).toHaveLength(1);
    expect(views.every((view) => !view.demoOnly && view.cycles.every((cycle) => !cycle.evidenceStale && cycle.measuredFieldCondition === null))).toBe(true);
  });

  it('follows a crop change immediately and withholds stale evidence instead of guessing', () => {
    const analysed = fourStagePlan();
    const analysis = analyze(base, unavailable, analysed);
    const edited = changeLabSlot(analysed, 'A', 1, 'cassava');
    const views = buildFarmScenarioViews({ analysis, currentPlan: edited }, 'pt-BR');
    const changed = views[0].cycles[1];
    expect(changed.crops.map((crop) => crop.cropId)).toEqual(['cassava']);
    expect(changed.evidenceStale).toBe(true);
    expect(changed.potentialBenefits).toEqual([]);
    expect(changed.evidenceLevel).toBeNull();
    expect(views[0].cycles[0].evidenceStale).toBe(false);
    const scene = composeFarmScene(changed.crops);
    expect(new Set(scene.plants.map((plant) => plant.cropId))).toEqual(new Set(['cassava']));
    expect(new Set(scene.plants.map((plant) => plant.src))).toEqual(new Set(['/assets/crops/cassava.png']));
  });

  it('keeps unknown crop names visible with the generic sprite, never disguised as a known crop', () => {
    const unknown = cropLabel('ora_pro_nobis', 'pt-BR');
    expect(unknown).toEqual({ label: 'Cultura não identificada no catálogo (ora_pro_nobis)', known: false });
    const scene = composeFarmScene([{ cropId: 'ora_pro_nobis', ...unknown, role: 'primary' }]);
    expect(scene.legend).toEqual([expect.objectContaining({ cropId: 'ora_pro_nobis', label: unknown.label, src: GENERIC_CROP_SPRITE, generic: true })]);
    expect(scene.plants.every((plant) => plant.src === GENERIC_CROP_SPRITE)).toBe(true);
    expect(farmSpriteSource('maize').src).toBe('/assets/crops/corn.png');
  });

  it('shows two- and three-crop declared intercrops in the same stage with every species identifiable', () => {
    const input = analysisInputSchema.parse({ ...base, croppingSystems: [
      { plotId: 'talhao-1', type: 'intercrop', validation: 'user_defined', events: [event('maize', '2025-10', '2026-03'), event('cowpea', '2025-11', '2026-02')] },
      { plotId: 'talhao-2', type: 'intercrop', validation: 'user_defined', events: [event('sorghum', '2025-10', '2026-03'), event('pumpkin', '2025-11', '2026-02'), event('cassava', '2025-10', '2026-06')] },
    ] });
    const plan = fourStagePlan();
    const views = buildFarmScenarioViews({ analysis: analyze(input, unavailable, plan), currentPlan: plan, croppingSystems: input.croppingSystems }, 'pt-BR');
    const two = views[0].cycles[0];
    expect(two.crops.map((crop) => [crop.cropId, crop.role])).toEqual([['maize', 'primary'], ['cowpea', 'intercrop']]);
    expect(two.intercropNotes[0]).toContain('não representa proporção');
    const three = views[2].cycles[0];
    expect(three.crops.map((crop) => crop.cropId)).toEqual(['sorghum', 'pumpkin', 'cassava']);
    const scene = composeFarmScene(three.crops);
    expect(scene.legend.map((item) => item.cropId)).toEqual(['sorghum', 'pumpkin', 'cassava']);
    expect(scene.legend.every((item) => item.rows.length > 0 && !item.generic)).toBe(true);
    expect(new Set(scene.plants.map((plant) => plant.cropId))).toEqual(new Set(['sorghum', 'pumpkin', 'cassava']));
    // The primary crop of the stage is never replaced by a companion.
    expect(views[0].cycles[1].crops.map((crop) => crop.cropId)).toEqual(['soybean']);
  });

  it('draws the same crop identically in A, B and C', () => {
    const plan = createLabPlan(base, ['maize', 'maize', 'maize']);
    const views = buildFarmScenarioViews({ analysis: analyze(base, unavailable, plan), currentPlan: plan }, 'pt-BR');
    const scenes = views.map((view) => composeFarmScene(view.cycles[0].crops));
    expect(scenes[1]).toEqual(scenes[0]);
    expect(scenes[2]).toEqual(scenes[0]);
    expect(composeFarmScene([primary('soybean')]).plants.map(({ leftPct, topPct, widthPct, heightPct }) => [leftPct, topPct, widthPct, heightPct])).toEqual(scenes[0].plants.map(({ leftPct, topPct, widthPct, heightPct }) => [leftPct, topPct, widthPct, heightPct]));
  });

  it('does not turn missing data into success imagery or fabricated evidence', () => {
    const plan = fourStagePlan();
    const views = buildFarmScenarioViews({ analysis: analyze(base, unavailable, plan), currentPlan: plan }, 'pt-BR');
    const cycle = views[0].cycles[0];
    expect(cycle.potentialBenefits.some((line) => line.startsWith('Compatibilidade térmica'))).toBe(false);
    expect(cycle.missingData.length).toBeGreaterThan(0);
    expect(cycle.evidenceLinks.every((link) => link.url.startsWith('http'))).toBe(true);
    // The picture depends only on crops: same layout with or without evidence.
    expect(composeFarmScene(cycle.crops)).toEqual(composeFarmScene([primary('maize')]));
    expect(composeFarmScene([])).toEqual({ plants: [], legend: [] });
  });

  it('falls back to the single proposed crop when no laboratory plan exists', () => {
    // Default plans now carry four slots; clearing them keeps the single-crop fallback path covered.
    const analysis = analyze(base, unavailable);
    const fallback = { ...analysis, strategies: analysis.strategies.map((strategy) => ({ ...strategy, slots: [] })) };
    const views = buildFarmScenarioViews({ analysis: fallback }, 'en');
    expect(views.every((view) => view.cycles.length <= 1)).toBe(true);
    expect(views[0].cycles[0]?.period).toBeNull();
    expect(stableStringify({ b: 1, a: [2, { d: undefined, c: 3 }] })).toBe('{"a":[2,{"c":3}],"b":1}');
  });
});

describe('Future Farm Stories assets and demo isolation', () => {
  const pub = (path: string) => join(process.cwd(), 'public', path);
  it('ships the base, overlays and all 12 PNG/GIF/WebP demo scenes at 960×540', () => {
    expect(existsSync(pub(FARM_BASE))).toBe(true);
    for (const id of ['maize', 'soybean', 'sorghum', 'sunflower', 'cowpea', 'ruziziensis', 'unknown-generic']) expect(existsSync(pub(`/assets/farm-stories/crop-overlays/${id}.png`))).toBe(true);
    expect(demoScenes.size).toBe(12);
    for (const scene of demoScenes.values()) {
      const png = readFileSync(pub(scene.png)); expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([960, 540]);
      const gif = readFileSync(pub(scene.gif)); expect(gif.subarray(0, 6).toString()).toBe('GIF89a'); expect([gif.readUInt16LE(6), gif.readUInt16LE(8)]).toEqual([960, 540]);
      let frames = 0; for (let i = 0; i < gif.length - 2; i += 1) if (gif[i] === 0x21 && gif[i + 1] === 0xf9 && gif[i + 2] === 0x04) frames += 1;
      expect(frames).toBe(6);
      const webp = readFileSync(pub(scene.webp)); expect(webp.subarray(8, 12).toString()).toBe('WEBP');
    }
  });

  it('keeps the curated demo fictional, evidence-free and separate from real farms', () => {
    expect(futureFarmDemo.demoOnly).toBe(true);
    const demo = buildDemoScenarioViews('pt-BR');
    expect(demo.every((view) => view.demoOnly && view.cycles.every((cycle) => cycle.potentialBenefits.length === 0 && cycle.evidenceLinks.length === 0 && cycle.evidenceLevel === null))).toBe(true);
    for (const view of demo) for (const cycle of view.cycles) expect(demoScenes.get(`${view.id}-${cycle.index}`)?.cropId).toBe(cycle.crops[0].cropId);
    const plan = fourStagePlan();
    const real = buildFarmScenarioViews({ analysis: analyze(base, unavailable, plan), currentPlan: plan }, 'pt-BR');
    expect(JSON.stringify(real)).not.toContain('/assets/farm-stories/scenes/');
    expect(real.every((view) => !view.demoOnly)).toBe(true);
  });

  it('keeps the permanent disclaimer in both languages', () => {
    expect(FARM_SCENE_DISCLAIMER['pt-BR']).toBe('Visualização ilustrativa da configuração de culturas; não representa produtividade ou condição real do campo.');
    expect(FARM_SCENE_DISCLAIMER.en).toMatch(/not represent yield/);
  });
});
