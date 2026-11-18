import { describe, expect, it } from 'vitest';
import { analyze } from '@/lib/engine';
import { cropById, type Crop } from '@/lib/catalog';
import { deriveDecisionHero } from '@/lib/engine/decision-hero';
import { assessLabPlan } from '@/lib/lab/assessment';
import { changeLabSlot, createLabPlan } from '@/lib/lab';
import { slotWindow, windowWaterBalance, windowFrost, ASSUMED_WINDOW_MONTHS } from '@/lib/engine/slot-window';
import { frostByMonth, historicalPrecipitationByMonth, historicalWaterBalanceByMonth, historicalWaterContextByMonth, monthlyClimatology } from '@/lib/climate/indicators';
import type { ClimateContext, ClimateDay } from '@/lib/climate/nasa-power';
import type { AnalysisInput } from '@/lib/schema';
import { safrinhaMonth, slotSeasonWindow } from '@/lib/engine/slot-season';

const input: AnalysisInput = { location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 10, history: [{ cropId: 'soybean', startYearMonth: '2023-10', endYearMonth: '2024-02' }, { cropId: 'maize', startYearMonth: '2024-02', endYearMonth: '2024-06' }, { cropId: 'soybean', startYearMonth: '2024-10', endYearMonth: '2025-02' }], priorities: { water: 2, soil: 3, operations: 1 }, irrigation: 'unknown' };
const noSafrinha: AnalysisInput = { ...input, history: [{ cropId: 'soybean', startYearMonth: '2024-10', endYearMonth: '2025-02' }] };
const crop = (id: string) => cropById.get(id as Crop['id'])!;

/** Synthetic complete years (2011-2013) with controllable monthly Tmean/Tmin/rain/ET0. */
function daily(options: { tmean?: (month: number) => number; tmin?: (month: number, year: number, day: number) => number; rain?: (month: number) => number; et0?: (month: number) => number } = {}): ClimateDay[] {
  const out: ClimateDay[] = [];
  for (const year of [2011, 2012, 2013]) for (let month = 1; month <= 12; month += 1) for (let day = 1; day <= new Date(year, month, 0).getDate(); day += 1) {
    const rain = options.rain?.(month) ?? 2; const tmean = options.tmean?.(month) ?? 25;
    out.push({ date: `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`, tmeanC: tmean, tmaxC: tmean + 5, tminC: options.tmin?.(month, year, day) ?? tmean - 5, precipMm: rain, rhPct: 60, windMps: 2, solarMjM2Day: 20, imergPrecipMm: day % 2 === 0 ? rain * 2 : 0, rootZoneWetness: month / 20, et0Mm: options.et0?.(month) ?? 4 });
  }
  return out;
}
function context(series: ClimateDay[]): ClimateContext {
  const rain = historicalPrecipitationByMonth(series);
  return { status: 'available', origin: 'live', monthly: monthlyClimatology(series), plantingMonthPrecipitation: rain[9]!, historicalPrecipitationByMonth: rain, waterContext: historicalWaterContextByMonth(series)[9]!, waterContextByMonth: historicalWaterContextByMonth(series), waterBalanceByMonth: historicalWaterBalanceByMonth(series), frostByMonth: frostByMonth(series), provenance: { source: 'NASA_POWER', requestedCoordinates: input.location, period: { start: '20110101', end: '20251231' }, fetchedAt: '2026-11-12T00:00:00.000Z', rawParameterNames: ['T2M'], sourceUrl: 'https://power.larc.nasa.gov/example', timezone: 'UTC', coveragePct: { T2M: 100, T2M_MAX: 100, T2M_MIN: 100, PRECTOTCORR: 100, RH2M: 100, WS2M: 100, ALLSKY_SFC_SW_DWN: 100 }, missingDays: [], warnings: [] }, gaps: [] };
}
const slotB = (climate: ClimateContext, cropId: string, source: AnalysisInput = input) => {
  const plan = changeLabSlot(createLabPlan(source, ['soybean', 'soybean', 'soybean']), 'A', 1, cropId as never);
  return assessLabPlan(source, plan, climate).find((slot) => slot.scenarioId === 'A' && slot.slotIndex === 1)!;
};
const indicator = (slot: ReturnType<typeof slotB>, id: string) => slot.indicators.find((item) => item.id === id)!;

describe('slot window', () => {
  it('uses the producer-declared second-crop month when history cannot establish one', () => {
    const declared = { ...input, history: [input.history[0]!], safrinhaPlantingMonth: 3 };
    expect(safrinhaMonth(declared)).toBe(3);
    expect(slotSeasonWindow(declared, 'B').note).toContain('mês informado pelo produtor');
    expect(safrinhaMonth({ ...declared, safrinhaPlantingMonth: undefined })).toBeNull();
  });
  it('uses the documented maximum cycle rounded up to months', () => {
    expect(crop('maize').cycleDaysRange?.max).toBe(145);
    expect(slotWindow(crop('maize'), 2, 'B')).toMatchObject({ startMonth: 2, months: [2, 3, 4, 5, 6], source: 'documented_cycle', cycleDays: 145 });
  });
  it('falls back to a declared assumed length, wrapping past December', () => {
    expect(crop('sorghum').cycleDaysRange).toBeNull();
    expect(slotWindow(crop('sorghum'), 11, 'A')).toEqual({ startMonth: 11, months: [11, 12, 1, 2].slice(0, ASSUMED_WINDOW_MONTHS.A), source: 'assumed_default', cycleDays: null });
  });
  it('is null when the start month is unknown, never invented', () => expect(slotWindow(crop('maize'), null, 'B')).toBeNull());
});

describe('window indicators of a slot', () => {
  const series = daily({ tmean: (month) => month === 6 ? 8 : 25, rain: (month) => month >= 2 && month <= 6 ? 3 : 0.5, et0: () => 4 });
  const climate = context(series);
  it('flags the whole window thermal check and lists the out-of-range months', () => {
    const maize = slotB(climate, 'maize'); const sorghum = slotB(climate, 'sorghum');
    expect(indicator(maize, 'thermal_compatibility').state).toBe('attention');
    expect(indicator(maize, 'thermal_compatibility').detail).toMatch(/Fora da faixa em: jun/);
    expect(indicator(maize, 'thermal_compatibility').detail).toContain('ciclo documentado de até 145 dias');
    expect(indicator(sorghum, 'thermal_compatibility').state).toBe('compatible');
    expect(indicator(sorghum, 'thermal_compatibility').detail).toContain('janela presumida de 4 meses');
  });
  it('sums monthly P−ET0 medians over each window and says it is not crop demand', () => {
    const balance = historicalWaterBalanceByMonth(series);
    const sorghum = indicator(slotB(climate, 'sorghum'), 'window_water_balance'); const maize = indicator(slotB(climate, 'maize'), 'window_water_balance');
    expect(sorghum.state).toBe('observed'); expect(maize.state).toBe('observed');
    expect(sorghum.value).not.toBe(maize.value);
    expect(sorghum.detail).toMatch(/soma das medianas mensais/); expect(sorghum.detail).toMatch(/não é demanda da cultura, ETc nem necessidade de irrigação/);
  });
  it('window sum is the sum of the month medians', () => {
    const balance = historicalWaterBalanceByMonth(daily({ rain: () => 5, et0: () => 4 }));
    const result = windowWaterBalance({ startMonth: 1, months: [1, 2], source: 'assumed_default', cycleDays: null }, balance);
    expect(result.sumMm).toBe(59);
    expect(result.sumMm).toBeCloseTo(balance[0]!.balanceMedianMm! + balance[1]!.balanceMedianMm!, 1);
  });
  it('shows IMERG rain days and root-zone wetness for the safrinha window (P2)', () => {
    const slot = slotB(climate, 'sorghum');
    expect(indicator(slot, 'rainfall_distribution').state).toBe('observed');
    expect(indicator(slot, 'rainfall_distribution').detail).toMatch(/fev 14; mar 15; abr 15; mai 15/);
    expect(indicator(slot, 'root_zone_wetness').state).toBe('observed');
    expect(indicator(slot, 'root_zone_wetness').detail).toContain('fev 0,1');
  });
  it('gives different window results for maize, cowpea and sorghum safrinha slots', () => {
    const details = ['maize', 'cowpea', 'sorghum'].map((id) => indicator(slotB(climate, id), 'window_water_balance').detail);
    expect(new Set(details).size).toBeGreaterThan(1);
  });
  it('keeps the safrinha window unknown when its start month is not observed', () => {
    const slot = slotB(climate, 'maize', noSafrinha);
    expect(['thermal_compatibility', 'window_water_balance', 'frost_risk', 'rainfall_distribution'].every((id) => indicator(slot, id).state === 'unknown')).toBe(true);
  });
  it('degrades to unknown without monthly water balance, never to zero', () => {
    const slot = slotB({ ...climate, waterBalanceByMonth: undefined }, 'sorghum');
    expect(indicator(slot, 'window_water_balance')).toMatchObject({ state: 'unknown', value: null });
  });
});

describe('frost screen', () => {
  const frosty = daily({ tmean: () => 25, tmin: (month, year, day) => month === 7 && year !== 2013 && day <= 3 ? 1 : 12 });
  it('counts years with Tmin <= 2 C and the median number of such days', () => {
    const july = frostByMonth(frosty)[6]!;
    expect(july).toMatchObject({ month: 7, thresholdC: 2, frostYears: 2, validYears: 3, medianFrostDays: 3 });
    expect(july.frostYearShare).toBeCloseTo(0.6667, 3);
    expect(frostByMonth(frosty)[0]).toMatchObject({ frostYears: 0, frostYearShare: 0, medianFrostDays: 0 });
  });
  it('excludes years with a missing Tmin day instead of filling them', () => {
    const series = daily().map((day) => day.date === '20110105' ? { ...day, tminC: null } : day);
    expect(frostByMonth(series)[0]).toMatchObject({ validYears: 2, expectedYears: 3 });
  });
  it('is unknown, not safe, with no valid Tmin', () => expect(frostByMonth([])[0]).toMatchObject({ validYears: 0, frostYearShare: null, medianFrostDays: null }));
  it('raises attention in a slot whose window includes a frost month and names the screen threshold', () => {
    expect(indicator(slotB(context(daily()), 'maize'), 'frost_risk')).toMatchObject({ state: 'observed' });
    const frost = indicator(slotB(context(daily({ tmin: (month, year, day) => month === 4 && year !== 2013 && day <= 3 ? 1 : 12 })), 'maize'), 'frost_risk');
    expect(frost.state).toBe('attention');
    expect(frost.detail).toMatch(/Risco de geada: 2 de 3 anos com Tmín ≤ 2 °C em abr \(mediana 3 dia\(s\)\)/);
    expect(frost.detail).toMatch(/Limiar de triagem de 2 °C/); expect(frost.detail).toMatch(/não são modelados/);
  });
  it('windowFrost is observed (zero) only when every month has valid years', () => {
    const window = slotWindow(crop('sorghum'), 1, 'A')!;
    expect(windowFrost(window, context(daily())).state).toBe('observed');
    expect(windowFrost(window, { ...context(daily()), frostByMonth: undefined }).state).toBe('unknown');
  });
});

describe('P1: safrinha crop is read in its own month/window', () => {
  const monthly = (october: number, february: number) => context(daily({ tmean: (month) => month === 10 ? october : month === 2 ? february : 25 }));
  it('does not judge the safrinha crop by the October (planting month) temperature', () => {
    const result = analyze(input, monthly(35, 25));
    expect(result.nasaInsight.observedValue).toBe(35);
    const effects = result.nasaInsight.effects.filter((effect) => effect.ownWindow);
    expect(effects.length).toBeGreaterThan(0);
    expect(effects.every((effect) => effect.evaluatedMonth !== null && effect.state === 'compatible' && effect.observedValueC === 25)).toBe(true);
    expect(deriveDecisionHero(result).state).toBe('compatible');
  });
  it('flags attention from the safrinha month when February is the hot month', () => {
    const result = analyze(input, monthly(25, 40));
    const hero = deriveDecisionHero(result);
    expect(hero.state).toBe('attention');
    expect(hero.items.every((item) => item.evaluatedMonth === 2 && item.observedValueC === 40)).toBe(true);
    expect(result.nasaInsight.attentionDecision?.observedValue).toBe(40);
  });
  it('leaves the safrinha scenarios unknown when the safrinha month is not observed', () => {
    const result = analyze(noSafrinha, monthly(35, 25));
    expect(result.strategies.filter((strategy) => strategy.id !== 'A').every((strategy) => strategy.proposedCrop?.plantingMonth === null)).toBe(true);
    const safrinha = result.nasaInsight.effects.filter((effect) => effect.scenarioId !== 'A');
    expect(safrinha.map((effect) => effect.state)).toEqual(['unknown', 'unknown']);
    expect(safrinha.every((effect) => effect.evaluatedMonth === null)).toBe(true);
    expect(deriveDecisionHero(result).unreadScenarioIds).toEqual(['B', 'C']);
  });
  it('keeps the per-month calendar insights comparing every month for every scenario', () => {
    const result = analyze(input, monthly(35, 25));
    expect(result.nasaInsightByMonth[9]!.effects.every((effect) => effect.ownWindow === undefined)).toBe(true);
  });
});
