import { describe, expect, it } from 'vitest';
import { analyze } from '@/lib/engine';
import { dominantPriorities, pickCover, pickThird, selectionNote } from '@/lib/engine/priorities';
import { assessCropIndicators } from '@/lib/engine/indicators';
import { assessSoilHealth } from '@/lib/engine/soil-health';
import { deriveDataQuality } from '@/lib/engine/data-quality';
import { cropById } from '@/lib/catalog';
import { analysisInputSchema, type SoilProfile } from '@/lib/schema';
import type { ClimateContext } from '@/lib/climate/nasa-power';

const unavailable: ClimateContext = { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [], provenance: null, gaps: ['NASA down'] };
const rio = { location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 10, history: [{ cropId: 'soybean', startYearMonth: '2023-10', endYearMonth: '2024-02' }, { cropId: 'maize', startYearMonth: '2024-02', endYearMonth: '2024-06' }], irrigation: 'unknown' };
const run = (priorities: { water: number; soil: number; operations: number }) => analyze({ ...rio, priorities }, unavailable);
const crops = (result: ReturnType<typeof run>) => result.strategies.map((item) => item.proposedCrop?.cropId);

describe('priority-aware scenarios (audit 1.1)', () => {
  it('different dominant priorities change B/C or the alignment, keep A, and are deterministic', () => {
    const soil = run({ water: 0, soil: 5, operations: 0 }); const water = run({ water: 5, soil: 0, operations: 0 });
    expect(crops(soil)[0]).toBe(crops(water)[0]);
    expect(soil.strategies.map((item) => item.id)).toEqual(['A', 'B', 'C']);
    expect(JSON.stringify([crops(soil), soil.strategies.map((item) => item.priorityAlignment)])).not.toBe(JSON.stringify([crops(water), water.strategies.map((item) => item.priorityAlignment)]));
    expect(water.strategies[2].title).toBe('Menor exposição hídrica documentada');
    expect(JSON.stringify(run({ water: 5, soil: 0, operations: 0 }))).toBe(JSON.stringify(water));
  });
  it('only reports alignment for priorities with weight > 0, qualitatively and with a concrete attribute', () => {
    const result = run({ water: 5, soil: 0, operations: 2 });
    for (const strategy of result.strategies) { expect(strategy.priorityAlignment?.map((item) => item.priority)).toEqual(['water', 'operations']); for (const item of strategy.priorityAlignment ?? []) { expect(['supports', 'neutral', 'conflicts', 'unknown']).toContain(item.level); expect(item.reason.length).toBeGreaterThan(10); expect(item.reasonEn.length).toBeGreaterThan(10); } }
    expect(JSON.stringify(result.strategies.map((item) => item.priorityAlignment))).not.toMatch(/"score"/);
  });
  it('marks the water criterion as not applied (neutral title) when no Kc or cycle is documented', () => {
    const ids = ['upland_rice', 'ruziziensis', 'soybean'];
    const result = analyze({ ...rio, history: [{ cropId: 'maize', startYearMonth: '2024-02', endYearMonth: '2024-06' }], priorities: { water: 5, soil: 0, operations: 0 }, farmerCrops: { availableCropIds: ids, exploreCropIds: [], blockedCropIds: [], customCrops: [] } }, unavailable);
    expect(result.strategies[2].title === 'Diversificação' || result.strategies[2].explanations.some((item) => item.ruleId === 'PRIORITY_RULE_APPLIED')).toBe(true);
  });
  it('treats equal weights as no dominant priority', () => { expect(dominantPriorities({ water: 1, soil: 1, operations: 1 }).size).toBe(0); expect([...dominantPriorities({ water: 3, soil: 1, operations: 0 })]).toEqual(['water']); });
  it('keeps lab-plan crops untouched while attaching alignment', () => {
    const plan = { scenarios: [{ id: 'A' as const, title: 'A', slots: [] }, { id: 'B' as const, title: 'B', slots: [] }, { id: 'C' as const, title: 'C', slots: [] }] };
    expect(plan.scenarios).toHaveLength(3);
  });
});

describe('regional soil in the engine (audit 1.5)', () => {
  const regional: SoilProfile = { origin: 'regional_estimate', depthCm: 30, ph: 5.2, organicCarbonGKg: 14.5, sandPct: 30, siltPct: 20, clayPct: 50 };
  const input = analysisInputSchema.parse({ ...rio, priorities: { water: 1, soil: 1, operations: 1 } });
  it('states the regional origin in the pH indicator and never calls it local', () => {
    const maize = cropById.get('maize'); const indicator = assessCropIndicators(maize, undefined, input, unavailable, regional).find((item) => item.id === 'soil_context');
    expect(indicator?.origin).toBe('regional_estimate'); expect(indicator?.detail).toContain('Estimativa regional (SoilGrids, média municipal 0–30 cm), não é análise do talhão'); expect(indicator?.detail).toContain('pH regional 5,2'); expect(indicator?.detail).not.toMatch(/informado/);
    const noRange = assessCropIndicators(cropById.get('cassava'), undefined, input, unavailable, regional).find((item) => item.id === 'soil_context');
    expect(noRange?.state).toBe('unknown'); expect(noRange?.detail).toContain('pH regional 5,2 — faixa da cultura não documentada');
  });
  it('farmer soil takes precedence over regional soil', () => {
    const farmer = analysisInputSchema.parse({ ...rio, priorities: { water: 1, soil: 1, operations: 1 }, soil: { origin: 'farmer_lab', ph: 6.1, organicCarbonGKg: 18 } });
    expect(assessCropIndicators(cropById.get('maize'), undefined, farmer, unavailable, regional).find((item) => item.id === 'soil_context')?.origin).toBe('farmer');
    expect(assessSoilHealth(farmer, cropById.get('maize'), [], [], regional).find((item) => item.id === 'organic_carbon_context')?.value).toBe(18);
  });
  it('uses regional organic carbon with an explicit origin, and analyze() keeps input.soil undefined', () => {
    const result = analyze({ ...rio, priorities: { water: 1, soil: 1, operations: 1 } }, unavailable, undefined, undefined, { regionalSoil: regional });
    expect(result.input.soil).toBeUndefined();
    const carbon = result.strategies[1].soilHealth.find((item) => item.id === 'organic_carbon_context');
    expect(carbon).toMatchObject({ value: 14.5, origin: 'regional_estimate' }); expect(carbon?.detail).toContain('Estimativa regional');
    expect(result.strategies.every((item) => !item.missingData.includes('soil_ph_or_verified_range'))).toBe(true);
    expect(result.strategies[0].explanations.some((item) => item.ruleId === 'REGIONAL_SOIL_ESTIMATE_ONLY')).toBe(true);
    expect(analyze({ ...rio, priorities: { water: 1, soil: 1, operations: 1 } }, unavailable).strategies[0].missingData).toContain('soil_ph_or_verified_range');
  });
  it('adds a separate estimated regional_soil record and keeps farmer_soil unknown', () => {
    const records = deriveDataQuality(input, unavailable, regional);
    expect(records.find((item) => item.id === 'regional_soil')?.classification).toBe('estimated');
    expect(records.find((item) => item.id === 'farmer_soil')?.classification).toBe('unknown');
    expect(deriveDataQuality(input, unavailable).find((item) => item.id === 'regional_soil')?.classification).toBe('unknown');
  });
});

describe('family rule: B/C avoid the safra crop family', () => {
  const crops = (ids: string[]) => ids.map((id) => cropById.get(id as never)!);
  const soy = cropById.get('soybean' as never)!;
  it('soil priority after a legume picks a different-family candidate, B and C stay distinct', () => {
    const pool = crops(['cowpea', 'common_bean', 'ruziziensis', 'pearl_millet', 'sorghum']);
    const b = pickCover(pool, soy, new Set<'soil'>(['soil']), ['soybean', 'maize']);
    expect(b.crop?.family).not.toBe(soy.family); expect(['soil_n_fixation', 'soil_residue']).toContain(b.rule);
    const c = pickThird(pool, soy, ['soybean', 'maize', b.crop!.id], new Set<'soil'>(['soil']));
    expect(c.crop?.family).not.toBe(soy.family); expect(c.crop?.id).not.toBe(b.crop?.id);
    expect(selectionNote(b, soy)?.message).toContain('Família diferente da cultura da safra (soja)');
  });
  it('falls back to the same family only when no different-family candidate exists', () => {
    expect(pickCover(crops(['cowpea', 'sunn_hemp']), soy, new Set<'soil'>(['soil']), []).crop?.family).toBe('Fabaceae');
  });
});

describe('ZARC calendar in B/C selection', () => {
  const soy = cropById.get('soybean' as never)!;
  const pool = ['sorghum', 'pearl_millet', 'ruziziensis'].map((id) => cropById.get(id as never)!);
  it('puts not_indicated candidates after all others and does not penalise unknown', () => {
    const filter = (crop: { id: string }) => crop.id === 'sorghum' || crop.id === 'pearl_millet' ? 'not_indicated' as const : 'unknown' as const;
    const b = pickCover(pool, soy, new Set<'soil'>(['soil']), [], filter);
    expect(b.crop?.id).toBe('ruziziensis');
    expect(pickCover(pool, soy, new Set<'soil'>(['soil']), [], () => 'not_indicated').crop).toBeDefined();
  });
  it('note says indicated in ZARC with risk, or unknown not penalised', () => {
    const status = { status: 'indicated', month: 2, riskLevelPct: 20 } as never;
    expect(selectionNote({ crop: pool[0], rule: 'soil_residue' }, soy, status)?.message).toContain('indicada no ZARC para fev (risco 20%)');
    expect(selectionNote({ crop: pool[0], rule: 'soil_residue' }, soy, { status: 'unknown', month: 2 } as never)?.message).toContain('não foi penalizada');
  });
});
