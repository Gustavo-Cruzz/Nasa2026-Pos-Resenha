import { describe, expect, it } from 'vitest';
import { analyze } from '@/lib/engine';
import { deriveDecisionHero } from '@/lib/engine/decision-hero';
import { buildSourceHealth, summarizeSourceStates } from '@/lib/source-health';
import { buildAnalysisSummary } from '@/lib/export-summary';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import type { AnalysisInput } from '@/lib/schema';
import { createLabPlan } from '@/lib/lab';

const input: AnalysisInput = { location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 4, history: [{ cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' }, { cropId: 'maize', startYearMonth: '2023-07', endYearMonth: '2023-12' }, { cropId: 'soybean', startYearMonth: '2024-01', endYearMonth: '2024-06' }], priorities: { water: 3, soil: 2, operations: 1 }, irrigation: 'unknown', futureBaseline: { cropId: 'soybean', confirmed: true } };
const monthly = (april: number | null) => Array.from({ length: 12 }, (_, index) => ({ month: index + 1, tmeanMedianC: index === 3 ? april : 25, precipMedianMm: 2, validTemperatureDays: 400, validPrecipitationDays: 400 }));
const rain = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, medianTotalMm: 100 + index, validYears: 15, expectedYears: 15, coveragePct: 100 }));
const climate = (april: number | null, extra: Partial<ClimateContext> = {}): ClimateContext => ({ status: 'available', origin: 'live', monthly: monthly(april), plantingMonthPrecipitation: rain[3], historicalPrecipitationByMonth: rain, provenance: { source: 'NASA_POWER', requestedCoordinates: input.location, period: { start: '20110101', end: '20251231' }, fetchedAt: '2026-11-12T00:00:00.000Z', rawParameterNames: ['T2M', 'PRECTOTCORR'], sourceUrl: 'https://power.larc.nasa.gov/example', timezone: 'UTC', coveragePct: { T2M: 100, T2M_MAX: 100, T2M_MIN: 100, PRECTOTCORR: 100, RH2M: 100, WS2M: 100, ALLSKY_SFC_SW_DWN: 100 }, missingDays: [], warnings: [] }, gaps: [], ...extra });
const unavailable: ClimateContext = { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [], provenance: null, gaps: ['NASA down'] };

describe('decision hero', () => {
  it('reports attention with month, NASA value, documented range, rule, source and a human next step', () => {
    const data = analyze(input, climate(35));
    const hero = deriveDecisionHero(data);
    expect(hero.state).toBe('attention');
    expect(hero.month).toBe(4);
    expect(hero.observedValue).toBe(35);
    expect(hero.items.map((item) => item.scenarioId)).toEqual(['A', 'C']);
    expect(hero.items.every((item) => item.rangeC && item.ruleId === 'DOCUMENTED_THERMAL_RANGE' && item.sourceRefs.length > 0)).toBe(true);
    expect(hero.sourceUrl).toContain('power.larc.nasa.gov');
    expect(hero.nextCheck).toBe('review_with_technician');
  });

  it('is compatible only when every hypothesis has a documented range containing the value', () => {
    const hero = deriveDecisionHero(analyze(input, climate(25)));
    expect(hero.state).toBe('compatible');
    expect(hero.unreadScenarioIds).toEqual([]);
  });

  it('never turns missing evidence into compatible', () => {
    expect(deriveDecisionHero(analyze(input, unavailable))).toMatchObject({ state: 'unknown', observedValue: null, nextCheck: 'provide_data' });
    expect(deriveDecisionHero(analyze(input, climate(null))).state).toBe('unknown');
    const precipitationOnly = deriveDecisionHero(analyze(input, climate(25), createLabPlan(input, ['common_bean', 'upland_rice', 'ruziziensis'])));
    expect(precipitationOnly.state).toBe('unknown');
    expect(precipitationOnly.observedValue).toBeNull();
  });

  it('exports the concrete decision and source status in Markdown', () => {
    const md = buildAnalysisSummary(analyze(input, climate(35)), 'en');
    expect(md).toContain('## Concrete decision');
    expect(md).toMatch(/State: attention/);
    expect(md).toMatch(/NASA signal: 35 °C/);
    expect(md).toMatch(/documented range \d+–\d+ °C/);
    expect(md).toContain('Next human check');
    expect(md).toContain('## Source status');
    expect(md).toMatch(/SMAP: N\/D .*Earthdata/);
    const pt = buildAnalysisSummary(analyze(input, unavailable), 'pt-BR');
    expect(pt).toContain('Decisão concreta');
    expect(pt).toMatch(/Estado: N\/D/);
  });
});

describe('source health', () => {
  it('distinguishes available, verified cache, partial coverage and N/D, with SMAP always N/D', () => {
    const live = buildSourceHealth(analyze(input, climate(25)));
    expect(live.find((item) => item.id === 'nasa_power')?.state).toBe('available');
    expect(live.find((item) => item.id === 'smap')).toMatchObject({ state: 'nd', gap: 'requires_earthdata_preprocessing' });
    expect(live.find((item) => item.id === 'gpm_imerg')?.state).toBe('nd');
    const cached = buildSourceHealth(analyze(input, climate(25, { origin: 'verified_fixture' })));
    expect(cached.find((item) => item.id === 'nasa_power')?.state).toBe('cache_verified');
    const partialClimate = climate(25);
    partialClimate.provenance!.coveragePct.T2M = 92;
    expect(buildSourceHealth(analyze(input, partialClimate)).find((item) => item.id === 'nasa_power')?.state).toBe('partial');
    expect(buildSourceHealth(analyze(input, unavailable)).find((item) => item.id === 'nasa_power')?.state).toBe('nd');
    expect(summarizeSourceStates(live).some((group) => group.state === 'nd')).toBe(true);
  });

  it('does not apply Brazilian context outside Brazil', () => {
    const ghana = { ...input, location: { latitude: 5.6037, longitude: -0.187 } };
    const health = buildSourceHealth(analyze(ghana, climate(25)));
    for (const id of ['zarc', 'pam', 'ibge'] as const) expect(health.find((item) => item.id === id)).toMatchObject({ state: 'nd', gap: 'outside_brazil' });
  });
});

describe('season content in the export', () => {
  it('adds the monthly window, calendar and water-balance status without inventing values', () => {
    const md = buildAnalysisSummary(analyze(input, climate(35)), 'en');
    expect(md).toContain('## Climate window by month');
    expect(md).toContain('Thermal calendar');
    expect(md).toMatch(/not a forecast/);
    expect(md).toContain('Climate water balance: N/D');
    expect(buildAnalysisSummary(analyze(input, unavailable), 'pt-BR')).toContain('Balanço hídrico climático: N/D');
  });
});

describe('terrain content in the export', () => {
  it('lists relief, hotspots, erosivity and the soil-loss N/D guardrail; and N/D when SRTM is missing', async () => {
    const { buildSampleGrid, analyzeTerrain } = await import('@/lib/terrain/terrain');
    const grid = buildSampleGrid(undefined, input.location);
    const terrain = analyzeTerrain(grid, grid.points.map((point) => 700 + 0.1 * point.row * grid.dyM), '2026-11-14T00:00:00.000Z');
    const withTerrain = { ...analyze(input, climate(25)), terrain };
    const md = buildAnalysisSummary(withTerrain, 'en');
    expect(md).toContain('## Relief and erosion context');
    expect(md).toMatch(/Slope mean \/ max: 10% \/ 10%/);
    expect(md).toMatch(/Relief hotspots \(slope ≥ 8%\): 1 cells/);
    expect(md).toContain('Soil loss (RUSLE): N/D');
    expect(buildSourceHealth(withTerrain).find((item) => item.id === 'srtm')).toMatchObject({ state: 'available', gap: null });
    expect(buildAnalysisSummary(analyze(input, climate(25)), 'pt-BR')).toContain('Relevo (NASA SRTM): N/D');
    expect(buildSourceHealth(analyze(input, climate(25))).find((item) => item.id === 'srtm')).toMatchObject({ state: 'nd', gap: 'terrain_unavailable' });
  });
});
