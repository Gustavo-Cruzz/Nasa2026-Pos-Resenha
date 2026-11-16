import { describe, expect, it } from 'vitest';
import { analyze } from '@/lib/engine';
import { changeLabSlot, createLabPlan, type LabCropId } from '@/lib/lab';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import type { WaterBalanceMonth } from '@/lib/climate/indicators';
import type { AnalysisInput } from '@/lib/schema';
import { GLOSSARY } from '@/lib/rotation-timeline/glossary';
import { HORIZON, buildClimateSeries, buildTimelineModel, monthAt, readMonth, secondCropSegment, thermalReference, windowBalanceSum } from '@/lib/rotation-timeline/model';
import { buildStatusLine, buildTechnicianBrief, formatNumber, monthPanelRows, seriesTextEquivalent } from '@/lib/rotation-timeline/text';
import { NO_WHAT_IF, isHypothetical, normalizeWhatIf, shiftBalance, shiftRain, shiftTemp } from '@/lib/rotation-timeline/what-if';

const input: AnalysisInput = { location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 10, history: [{ cropId: 'soybean', startYearMonth: '2023-10', endYearMonth: '2024-02' }, { cropId: 'maize', startYearMonth: '2024-02', endYearMonth: '2024-06' }, { cropId: 'soybean', startYearMonth: '2024-10', endYearMonth: '2025-02' }], priorities: { water: 2, soil: 3, operations: 1 }, irrigation: 'unknown' };
const basePlan = createLabPlan(input, ['soybean', 'sorghum', 'maize']);
const plan = ['A', 'B', 'C'].reduce((current, id, index) => { const crops = [['soybean', 'maize', 'soybean', 'maize'], ['soybean', 'sorghum', 'soybean', 'sorghum'], ['soybean', 'maize', 'sorghum', 'maize']][index]!; return crops.reduce((acc, cropId, slot) => changeLabSlot(acc, id as 'A' | 'B' | 'C', slot, cropId as LabCropId), current); }, basePlan);

const rain = [250, 230, 200, 120, 40, 10, 5, 10, 50, 150, 210, 250];
const balance = (values: Array<number | null>): WaterBalanceMonth[] => values.map((value, index) => ({ month: index + 1, precipMedianMm: value === null ? null : 50 + value, et0MedianMm: value === null ? null : 50, balanceMedianMm: value, validYears: value === null ? 0 : 15, expectedYears: 15, coveragePct: value === null ? 0 : 100 }));
const climate = (extra: Partial<ClimateContext> = {}): ClimateContext => ({ status: 'available', origin: 'live', monthly: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, tmeanMedianC: 20 + index, precipMedianMm: 2, validTemperatureDays: 400, validPrecipitationDays: 400 })), plantingMonthPrecipitation: null, historicalPrecipitationByMonth: rain.map((mm, index) => ({ month: index + 1, medianTotalMm: mm, validYears: 15, expectedYears: 15, coveragePct: 100 })), erosivity: { mfi: 130, classId: 'severe', validYears: 15, expectedYears: 15, coveragePct: 100 }, provenance: { source: 'NASA_POWER', requestedCoordinates: input.location, period: { start: '20110101', end: '20251231' }, fetchedAt: '2026-11-12T00:00:00.000Z', rawParameterNames: ['T2M'], sourceUrl: 'https://power.larc.nasa.gov/example', timezone: 'UTC', coveragePct: { T2M: 100, T2M_MAX: 100, T2M_MIN: 100, PRECTOTCORR: 100, RH2M: 100, WS2M: 100, ALLSKY_SFC_SW_DWN: 100 }, missingDays: [], warnings: [] }, gaps: [], ...extra });
const full = climate({ waterBalanceByMonth: balance([100, 80, 60, 20, -30, -60, -90, -100, -80, -20, 40, 90]), rootZoneByMonth: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, medianWetness: 0.3 + index / 40, lastYearWetness: null })) });

describe('what-if (hypothetical, display only)', () => {
  it('clamps sliders to the documented limits and ignores NaN', () => {
    expect(normalizeWhatIf({ tempC: 9, rainPct: -90 })).toEqual({ tempC: 3, rainPct: -30 });
    expect(normalizeWhatIf({ tempC: Number.NaN, rainPct: Number.NaN })).toEqual(NO_WHAT_IF);
    expect(isHypothetical(NO_WHAT_IF)).toBe(false); expect(isHypothetical({ tempC: 0.5, rainPct: 0 })).toBe(true);
  });
  it('shifts rain and temperature, keeps ET0 and never invents values for missing data', () => {
    const shifted = { tempC: 2, rainPct: -20 };
    expect(shiftRain(200, shifted)).toBe(160); expect(shiftTemp(25, shifted)).toBe(27);
    expect(shiftBalance(30, 200, shifted)).toBe(-10);
    expect(shiftBalance(30, null, shifted)).toBeNull(); expect(shiftBalance(null, 200, shifted)).toBeNull();
    expect(shiftBalance(30, null, NO_WHAT_IF)).toBe(30);
    expect(shiftRain(null, shifted)).toBeNull(); expect(shiftTemp(null, shifted)).toBeNull();
  });
});

describe('climate series', () => {
  it('maps the monthly series by calendar month and keeps missing months null', () => {
    const series = buildClimateSeries({ climate: climate({ waterBalanceByMonth: balance([10, null, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]) }) });
    expect(series.rainMm[0]).toBe(250); expect(series.balanceMm[1]).toBeNull(); expect(series.balanceMm[0]).toBe(10);
    expect(series.has.balance).toBe(true); expect(series.has.ndvi).toBe(false); expect(series.has.wetness).toBe(false);
    expect(series.ndvi.every((value) => value === null)).toBe(true);
  });
  it('computes the rain share only with all twelve months and flags above-average months from the engine rule', () => {
    const series = buildClimateSeries({ climate: climate() });
    expect(series.rainSharePct.reduce<number>((sum, value) => sum + (value ?? 0), 0)).toBeGreaterThan(99.9);
    expect(series.highErosivity[0]).toBe(true); expect(series.highErosivity[6]).toBe(false);
    const partial = buildClimateSeries({ climate: climate({ historicalPrecipitationByMonth: [{ month: 1, medianTotalMm: 100, validYears: 15, expectedYears: 15, coveragePct: 100 }] }) });
    expect(partial.rainSharePct.every((value) => value === null)).toBe(true); expect(partial.has.erosivity).toBe(false);
  });
  it('applies the what-if to a month reading and sums windows only when every month exists', () => {
    const series = buildClimateSeries({ climate: full });
    const reading = readMonth(series, 1, { tempC: 1, rainPct: 10 });
    expect(reading.rainMm).toBeCloseTo(275); expect(reading.balanceMm).toBeCloseTo(125); expect(reading.tmeanC).toBe(21); expect(reading.rainBaseMm).toBe(250);
    expect(windowBalanceSum(series, [1, 2, 3], NO_WHAT_IF)).toEqual({ sumMm: 240, missingMonths: [] });
    const gap = buildClimateSeries({ climate: climate({ waterBalanceByMonth: balance([10, null, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]) }) });
    expect(windowBalanceSum(gap, [1, 2], NO_WHAT_IF)).toEqual({ sumMm: null, missingMonths: [2] });
  });
  it('wraps calendar months from the planting month', () => { expect(monthAt(0, 10)).toBe(10); expect(monthAt(3, 10)).toBe(1); expect(monthAt(23, 10)).toBe(9); });
});

describe('timeline model from a real analysis', () => {
  const data = analyze(input, full, plan);
  const model = buildTimelineModel(data);
  it('places crop windows on the 24-month axis using the slot windows of each scenario', () => {
    expect(model.lanes.map((lane) => lane.id)).toEqual(['A', 'B', 'C']); expect(model.months).toHaveLength(HORIZON); expect(model.months[0]).toMatchObject({ month: 10, year: 1 }); expect(model.months[12]).toMatchObject({ month: 10, year: 2 });
    for (const lane of model.lanes) {
      for (const segment of lane.segments) { expect(segment.startOffset).toBeGreaterThanOrEqual(0); expect(segment.startOffset + segment.length).toBeLessThanOrEqual(HORIZON); expect(segment.months[0]).toBe(model.months[segment.startOffset]!.month); }
      expect(lane.segments.length + lane.unplaced.length).toBeLessThanOrEqual(4);
    }
  });
  it('derives hatched bare-soil segments from the engine occupancy and nothing else', () => {
    for (const lane of model.lanes) {
      const bareSoil = lane.rotation.bareSoil!;
      if (!lane.bareKnown) { expect(lane.bare).toEqual([]); continue; }
      expect(lane.bare.reduce((sum, segment) => sum + segment.length, 0)).toBe(bareSoil.bareMonths.length);
      expect(lane.bare.reduce((sum, segment) => sum + segment.highErosivityMonths, 0)).toBe(bareSoil.bareMonthsInHighErosivity.length);
    }
  });
  it('takes the thermal reference and second-crop window from the scenario slots', () => {
    const lane = model.lanes[1]!; const reference = thermalReference(lane);
    expect(reference.cropId).toBe('sorghum');
    const segment = secondCropSegment(lane, 1)!; expect(segment).toMatchObject({ season: 'B', year: 1, cropId: 'sorghum', startMonth: 2, startOffset: 4 });
    expect(secondCropSegment(lane, 2)).toMatchObject({ year: 2, startOffset: 16 });
    expect(lane.segments.find((item) => item.slotIndex === 0)).toMatchObject({ startOffset: 0, startMonth: 10 });
  });
  it('builds the status line and month rows without placeholder numbers', () => {
    expect(buildStatusLine(data, model, NO_WHAT_IF, 'pt-BR')).toContain('P−ET₀');
    const noClimate = analyze(input, undefined, plan); const empty = buildTimelineModel(noClimate);
    expect(empty.series.has.balance).toBe(false); expect(empty.zarcAvailable).toBe(false);
    expect(buildStatusLine(noClimate, empty, NO_WHAT_IF, 'pt-BR')).toContain('N/D');
    const rows = monthPanelRows(empty.series, 3, NO_WHAT_IF, 'pt-BR');
    expect([rows.rain, rows.et0, rows.balance, rows.temp, rows.wetness, rows.ndvi, rows.share, rows.frost]).toEqual(Array(8).fill('N/D'));
  });
  it('marks every ZARC cell unknown (never indicated) without municipal ZARC', () => {
    for (const lane of model.lanes) for (const cell of lane.zarc) if (cell) expect(cell.status).toBe('unknown');
  });
  it('lists missing evidence for the technician instead of hiding it', () => {
    const brief = buildTechnicianBrief(data, 'pt-BR');
    expect(brief.missing).toContain('série NDVI MODIS'); expect(brief.missing).toContain('ZARC municipal'); expect(brief.questions.length).toBeGreaterThan(0);
    expect(buildTechnicianBrief(data, 'en').missing).toContain('MODIS NDVI series');
  });
});

describe('degraded analyses', () => {
  it('survives an analysis without climate series, slots or bare-soil data and shows everything as N/D', () => {
    const degraded = { input, climate: { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, provenance: null, gaps: [] }, regionalContext: { country: null, municipality: null, municipalitySource: null, zarc: null, gaps: [] }, warnings: [], strategies: ['A', 'B', 'C'].map((id) => ({ id, title: `Cenário ${id}`, baseline: id === 'A', baselineAssumed: false, horizonMonths: 24, proposedCrop: null, indicators: [], explanations: [], missingData: ['historical_climate'], unavailable: true })) } as unknown as Parameters<typeof buildTimelineModel>[0];
    const model = buildTimelineModel(degraded);
    expect(model.lanes).toHaveLength(3); expect(model.lanes.every((lane) => lane.segments.length === 0 && lane.bare.length === 0 && !lane.bareKnown)).toBe(true);
    expect(Object.values(model.series.has).every((value) => value === false)).toBe(true);
    expect(buildTechnicianBrief(degraded, 'pt-BR').missing).toContain('clima histórico');
  });
});

describe('text helpers and glossary', () => {
  it('formats numbers with locale separators and N/D', () => {
    expect(formatNumber(-3.5, 1, 'pt-BR')).toBe('−3,5'); expect(formatNumber(3.5, 1, 'en', { sign: true })).toBe('+3.5'); expect(formatNumber(null, 1, 'en')).toBe('N/D'); expect(formatNumber(-0.01, 0, 'pt-BR')).toBe('0');
  });
  it('writes a text equivalent starting at the planting month with N/D gaps', () => {
    const values = Array.from({ length: 12 }, (_, index) => index === 0 ? null : index);
    const text = seriesTextEquivalent('Chuva', values, 'mm', 10, 0, 'pt-BR');
    expect(text.startsWith('Chuva: out 9 mm; nov 10 mm; dez 11 mm; jan N/D; fev 1 mm')).toBe(true);
  });
  it('defines every dotted term in both languages', () => { for (const entry of Object.values(GLOSSARY)) { expect(entry['pt-BR'].length).toBeGreaterThan(10); expect(entry.en.length).toBeGreaterThan(10); } expect(Object.keys(GLOSSARY)).toEqual(expect.arrayContaining(['ET0', 'PET0', 'ZARC', 'GWETROOT', 'SoilGrids', 'MFI'])); });
});
