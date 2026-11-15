import { describe, expect, it } from 'vitest';
import { cropById, type Crop } from '@/lib/catalog';
import { assessBareSoil } from '@/lib/engine/bare-soil';
import { buildTradeoffs, orderAxes } from '@/lib/engine/tradeoffs';
import { assessLabPlan, farmerZarcTexture, type LabSlotAssessment } from '@/lib/lab/assessment';
import { createLabPlan } from '@/lib/lab';
import { brazilRegionalContextSchema } from '@/lib/atlas';
import { resolveBrazilRegionalContext } from '@/lib/brazil/context';
import type { ZarcWindowStatus } from '@/lib/brazil/zarc';
import type { BrazilRegionalContext } from '@/lib/brazil/types';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import type { Rotation, QualitativeIndicator } from '@/lib/engine/types';
import type { TerrainContext } from '@/lib/terrain/terrain';
import type { AnalysisInput } from '@/lib/schema';

const input: AnalysisInput = { location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 10, history: [{ cropId: 'soybean', startYearMonth: '2023-10', endYearMonth: '2024-02' }, { cropId: 'maize', startYearMonth: '2024-02', endYearMonth: '2024-06' }], priorities: { soil: 3, water: 2, operations: 1 }, irrigation: 'unknown' } as AnalysisInput;
const crop = (id: string) => cropById.get(id as Crop['id'])!;
const rain = [250, 230, 200, 120, 40, 10, 5, 10, 50, 150, 210, 250];
const climate = { status: 'available', origin: 'live', monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: rain.map((mm, index) => ({ month: index + 1, medianTotalMm: mm, validYears: 10, expectedYears: 10, coveragePct: 100 })), erosivity: { mfi: 130, classId: 'severe', validYears: 10, expectedYears: 10, coveragePct: 100 }, provenance: { sourceUrl: 'https://power.larc.nasa.gov/' }, gaps: [] } as unknown as ClimateContext;
const terrain = { status: 'available', slopePct: { mean: 9, max: 14 }, source: { dataset: 'SRTM', url: 'https://example.org/srtm', fetchedAt: '' } } as unknown as TerrainContext;

function slots(scenarioId: 'A' | 'B' | 'C', ids: Array<string | null>, zarc: Array<ZarcWindowStatus['status'] | null> = []): LabSlotAssessment[] {
  return ids.map((id, slotIndex) => ({ scenarioId, slotIndex, year: slotIndex < 2 ? 1 : 2, season: slotIndex % 2 ? 'B' : 'A', cropId: id, cropName: id ? crop(id).commonNames['pt-BR'] : null, previousCropId: slotIndex === 0 ? 'maize' : ids[slotIndex - 1], validationLevel: 'climate_exploration', indicators: [{ id: 'window_water_balance', label: '', state: 'observed', detail: '', value: null, sourceRefs: [] } as QualitativeIndicator], sourceRefs: [], missingEvidence: [], zarc: id && zarc[slotIndex] ? { status: zarc[slotIndex]!, month: slotIndex % 2 ? 2 : 10, cropId: id, riskLevelPct: zarc[slotIndex] === 'indicated' ? 20 : null, riskLevelWorstPct: null, decendios: [], indicatedDecendios: [], allConsideredIndicated: false, soilScope: 'any', soilCodes: [], cycleCodes: [], zarcCultures: [], note: '', noteEn: '', sourceRefs: [{ label: 'ZARC', url: 'https://example.org/zarc', locator: '', quote: '' }] } : null }));
}
const withWater = (list: LabSlotAssessment[], value: number | null) => list.map((slot, index) => index === 1 ? { ...slot, indicators: [{ ...slot.indicators[0]!, value }] } : slot);
function rotation(id: 'A' | 'B' | 'C', list: LabSlotAssessment[], extra: Partial<Rotation> = {}): Rotation {
  return { id, title: id, baseline: id === 'A', baselineAssumed: false, horizonMonths: 24, proposedCrop: null, slots: list, configuredSlots: list.filter((slot) => slot.cropId).length, bareSoil: assessBareSoil(input, list, climate, terrain), ...extra } as unknown as Rotation;
}
const ctx = (regionalContext: Partial<BrazilRegionalContext> = {}) => ({ input, climate, regionalContext: { country: 'BR', municipality: { code: '5218805', name: 'Rio Verde', uf: 'GO' }, municipalitySource: null, zarc: null, pam: null, gaps: [], ...regionalContext } as BrazilRegionalContext });

describe('bare soil occupancy calendar (audit 2.4)', () => {
  it('flags assumed windows when no cycle is documented', () => {
    // Soybean now has a documented ZARC cycle (100-130 d); sorghum (grain) still has none.
    const result = assessBareSoil(input, slots('A', ['sorghum', 'sorghum', 'sorghum', 'sorghum']), climate, terrain);
    expect(result.windowsSource).toBe('assumed'); expect(result.detail).toContain('presumidas'); expect(result.detailEn).toContain('assumed');
    expect(result.occupancy).toHaveLength(24);
  });
  it('treats months outside every window as bare and crosses them with erosivity and slope', () => {
    const result = assessBareSoil(input, slots('A', ['sorghum', 'maize', 'sorghum', 'maize']), climate, terrain);
    expect(result.windowsSource).toBe('mixed');
    expect(result.bareMonths.map((item) => item.month)).toEqual([7, 8, 9, 7, 8, 9]);
    expect(result.bareMonthsInHighErosivity).toEqual([]);
    expect(result.slope?.meanPct).toBe(9); expect(result.state).toBe('attention'); expect(result.detail).toContain('Palha');
    expect(assessBareSoil(input, slots('A', ['sorghum', 'maize', 'sorghum', 'maize']), climate).slope).toBeNull();
  });
  it('a longer documented window or a cover crop fills the gap', () => {
    const plain = assessBareSoil(input, slots('A', ['sorghum', 'sorghum', 'sorghum', 'sorghum']), climate, terrain);
    const longer = assessBareSoil(input, slots('A', ['sorghum', 'maize', 'sorghum', 'maize']), climate, terrain);
    expect(longer.bareMonths.length).toBeLessThan(plain.bareMonths.length);
    const cover = assessBareSoil(input, slots('B', ['soybean', 'pigeon_pea', 'soybean', 'pigeon_pea']), climate, terrain);
    expect(cover.occupancy.slice(0, 8).every((item) => item.covered)).toBe(true);
  });
  it('is unknown when a slot has no crop', () => {
    const result = assessBareSoil(input, slots('A', ['soybean', null, 'soybean', 'maize']), climate, terrain);
    expect(result.state).toBe('unknown'); expect(result.bareMonths).toEqual([]); expect(result.missing).toContain('unconfigured_lab_slots');
  });
});

describe('trade-off matrix (audit 2.3)', () => {
  const a = rotation('A', withWater(slots('A', ['soybean', 'maize', 'soybean', 'maize'], ['indicated', 'indicated', 'indicated', 'indicated']), -100));
  const b = rotation('B', withWater(slots('B', ['soybean', 'cowpea', 'soybean', 'cowpea'], ['indicated', 'not_indicated', 'indicated', 'not_indicated']), -300));
  const matrix = buildTradeoffs([a, b], ctx());
  const cell = (id: 'A' | 'B', axis: string) => matrix.get(id)!.cells.find((item) => item.axis === axis)!;
  it('erosion compares high-erosivity bare months, not total bare months', () => { const e = cell('B', 'erosion'); expect(e.level).toBe('similar'); expect(e.evidence.join(' ')).toContain('meses descobertos fora do período de maior erosividade'); });
  it('keeps A as reference', () => { expect(['water', 'soil', 'diseases', 'calendar'].map((axis) => cell('A', axis).level)).toEqual(['reference', 'reference', 'reference', 'reference']); expect(matrix.get('A')!.summary.gains).toEqual([]); });
  it('marks consecutive same-family slots as worse for diseases without inventing diseases', () => {
    const disease = cell('B', 'diseases'); expect(disease.level).toBe('worse'); expect(disease.summary).toContain('Fabaceae');
    expect(disease.evidence.some((item) => item.includes('Nenhuma doença específica') || item.includes('Nota documentada'))).toBe(true);
  });
  it('marks ZARC not_indicated slots as worse in the calendar', () => { expect(cell('B', 'calendar').level).toBe('worse'); expect(matrix.get('B')!.summary.losses.join(' ')).toContain('Calendário'); });
  it('compares window P-ET0 and flags missing PAM as unknown', () => {
    expect(cell('B', 'water').level).toBe('worse'); expect(cell('B', 'water').summary).toContain('200');
    expect(cell('B', 'market').level).toBe('unknown'); expect(matrix.get('B')!.summary.unknowns).toContain('Mercado local'); expect(cell('B', 'market').summary).toContain('Não sabemos');
  });
  it('states local chain from PAM area without price', () => {
    const pam = { year: '2024', sourceUrl: 'https://example.org/pam', accessedAt: '', sha256: '', caveat: 'PAM', products: [{ productCode: '1', productLabel: 'Milho', cropIds: ['maize'], harvestedAreaHa: 1000, producedQuantity: null, productionUnit: null, caveat: null }] };
    const withPam = buildTradeoffs([a, b], ctx({ pam: pam as never })); const market = withPam.get('A')!.cells.find((item) => item.axis === 'market')!;
    expect(market.summary).toContain('1.000 ha colhidos em 2024'); expect(market.summary).toContain('não preço nem lucro'); expect(withPam.get('B')!.cells.find((item) => item.axis === 'market')!.level).toBe('worse');
  });
  it('orders gains and losses by dominant priority without scores', () => {
    expect(orderAxes({ soil: 3, water: 2, operations: 1 }).slice(0, 2)).toEqual(['soil', 'erosion']);
    expect(orderAxes({ soil: 1, water: 3, operations: 2 })[0]).toBe('water');
    expect(orderAxes({ soil: 2, water: 2, operations: 2 })).toEqual(['water', 'soil', 'erosion', 'diseases', 'calendar', 'market']);
    const better = rotation('B', withWater(slots('B', ['soybean', 'pigeon_pea', 'sorghum', 'maize'], ['indicated', 'indicated', 'indicated', 'indicated']), 500));
    const soilFirst = buildTradeoffs([a, better], ctx()).get('B')!.summary.gains; const waterFirst = buildTradeoffs([a, better], { ...ctx(), input: { priorities: { soil: 1, water: 3, operations: 1 } } }).get('B')!.summary.gains;
    expect(soilFirst.length).toBeGreaterThan(1); expect(soilFirst[0]).toMatch(/^(Solo|Erosão)/); expect(waterFirst[0]).toMatch(/^Água/);
  });
});

describe('ZARC per slot and atlas schema', () => {
  it('attaches the ZARC status of the slot start month, unknown without regional context', () => {
    const rioVerde = resolveBrazilRegionalContext({ latitude: -17.75, longitude: -50.95 });
    const plan = createLabPlan(input, ['soybean', 'maize', 'sorghum']);
    const result = assessLabPlan(input, plan, climate, rioVerde);
    expect(result.every((slot) => slot.zarc === null || slot.zarc.month >= 1)).toBe(true);
    expect(result.find((slot) => slot.scenarioId === 'A' && slot.slotIndex === 0)?.zarc?.status).toBe('indicated');
    expect(assessLabPlan(input, plan, climate).find((slot) => slot.cropId)?.zarc?.status).toBe('unknown');
    expect(farmerZarcTexture(input)).toBeNull();
  });
  it('keeps ZARC windows through the atlas schema', () => {
    const rioVerde = resolveBrazilRegionalContext({ latitude: -17.75, longitude: -50.95 });
    const parsed = brazilRegionalContextSchema.parse(rioVerde);
    expect(parsed.zarc?.crops.soybean?.windows.length).toBeGreaterThan(0);
  });
});
