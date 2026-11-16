import { cropById, type Crop } from '@/lib/catalog';
import { highErosivityMonths } from '@/lib/engine/bare-soil';
import { slotSeasonWindow } from '@/lib/engine/slot-season';
import { slotWindow } from '@/lib/engine/slot-window';
import type { AnalysisResult, Rotation } from '@/lib/engine/types';
import { zarcWindowStatus } from '@/lib/brazil/zarc';
import { farmerZarcTexture } from '@/lib/lab/assessment';
import { shiftBalance, shiftRain, shiftTemp, type WhatIf } from '@/lib/rotation-timeline/what-if';

export const HORIZON = 24;
export type ScenarioId = 'A' | 'B' | 'C';
export const SCENARIO_IDS: ScenarioId[] = ['A', 'B', 'C'];

/** Calendar month (1-12) shown at a timeline offset (0 = planting month of scenario A). */
export const monthAt = (offset: number, startMonth: number) => (((startMonth - 1 + offset) % 12) + 12) % 12 + 1;

export type TimelineMonth = { offset: number; month: number; year: 1 | 2 };
export const timelineMonths = (startMonth: number): TimelineMonth[] => Array.from({ length: HORIZON }, (_, offset) => ({ offset, month: monthAt(offset, startMonth), year: offset < 12 ? 1 : 2 }));

type Monthly12<T> = Array<T | null>;
/** Monthly series indexed by calendar month - 1. Every entry is null when the source has no value; nothing is filled in. */
export type ClimateSeries = {
  rainMm: Monthly12<number>;
  /** Share of expected years with rain data (0-100); below 100 the bar is drawn as partial. */
  rainCoveragePct: Monthly12<number>;
  et0Mm: Monthly12<number>;
  balanceMm: Monthly12<number>;
  tmeanC: Monthly12<number>;
  wetness: Monthly12<number>;
  wetnessSource: 'rootZoneByMonth' | 'waterContextByMonth' | null;
  ndvi: Monthly12<number>;
  /** True when the NDVI series comes from the national municipal artifact (representative of the municipality, not the farm). */
  ndviMunicipal?: boolean;
  /** Share (%) of the annual rainfall falling in the month: the Fournier term basis. Null unless all 12 months have rain. */
  rainSharePct: Monthly12<number>;
  highErosivity: boolean[];
  erosivityClassId: NonNullable<AnalysisResult['climate']['erosivity']>['classId'];
  frost: Monthly12<{ years: number; valid: number }>;
  has: { rain: boolean; balance: boolean; temp: boolean; wetness: boolean; ndvi: boolean; erosivity: boolean; frost: boolean };
};

const blank = <T,>(): Monthly12<T> => Array.from({ length: 12 }, () => null);
const anyValue = (values: Array<unknown>) => values.some((value) => value !== null && value !== undefined);
const roundTo = (value: number, digits: number) => Number(value.toFixed(digits));

export function buildClimateSeries(data: Pick<AnalysisResult, 'climate'>): ClimateSeries {
  const climate = data.climate;
  const rainMm = blank<number>(); const rainCoveragePct = blank<number>(); const et0Mm = blank<number>(); const balanceMm = blank<number>(); const tmeanC = blank<number>();
  const wetness = blank<number>(); const ndvi = blank<number>(); const frost = blank<{ years: number; valid: number }>();
  const slot = (month: number) => month >= 1 && month <= 12 ? month - 1 : -1;
  for (const item of climate.historicalPrecipitationByMonth ?? []) { const index = slot(item.month); if (index >= 0) { rainMm[index] = item.medianTotalMm; rainCoveragePct[index] = item.medianTotalMm === null ? null : item.coveragePct; } }
  for (const item of climate.waterBalanceByMonth ?? []) { const index = slot(item.month); if (index >= 0) { et0Mm[index] = item.et0MedianMm; balanceMm[index] = item.balanceMedianMm; } }
  for (const item of climate.monthly ?? []) { const index = slot(item.month); if (index >= 0) tmeanC[index] = item.tmeanMedianC; }
  for (const item of climate.rootZoneByMonth ?? []) { const index = slot(item.month); if (index >= 0) wetness[index] = item.medianWetness; }
  let wetnessSource: ClimateSeries['wetnessSource'] = anyValue(wetness) ? 'rootZoneByMonth' : null;
  if (!wetnessSource) { for (const item of climate.waterContextByMonth ?? []) { const index = slot(item.month); if (index >= 0) wetness[index] = item.rootZoneWetnessMedian; } if (anyValue(wetness)) wetnessSource = 'waterContextByMonth'; }
  for (const item of climate.ndvi?.months ?? []) { const index = slot(item.month); if (index >= 0) ndvi[index] = item.medianNdvi; }
  for (const item of climate.frostByMonth ?? []) { const index = slot(item.month); if (index >= 0 && item.validYears > 0) frost[index] = { years: item.frostYears, valid: item.validYears }; }
  const complete = rainMm.every((value) => value !== null); const total = complete ? rainMm.reduce<number>((sum, value) => sum + (value as number), 0) : 0;
  const rainSharePct = rainMm.map((value) => complete && total > 0 ? roundTo(((value as number) / total) * 100, 2) : null);
  const high = highErosivityMonths({ ...climate, historicalPrecipitationByMonth: climate.historicalPrecipitationByMonth ?? [] });
  return { rainMm, rainCoveragePct, et0Mm, balanceMm, tmeanC, wetness, wetnessSource, ndvi, ndviMunicipal: climate.ndvi?.origin === 'municipal_artifact', rainSharePct, highErosivity: Array.from({ length: 12 }, (_, index) => high.includes(index + 1)), erosivityClassId: climate.erosivity?.classId ?? null, frost, has: { rain: anyValue(rainMm), balance: anyValue(balanceMm), temp: anyValue(tmeanC), wetness: anyValue(wetness), ndvi: anyValue(ndvi), erosivity: Boolean(climate.erosivity?.classId) && complete, frost: anyValue(frost) } };
}

export type MonthReading = { month: number; rainMm: number | null; rainBaseMm: number | null; et0Mm: number | null; balanceMm: number | null; balanceBaseMm: number | null; tmeanC: number | null; tmeanBaseC: number | null; wetness: number | null; ndvi: number | null; rainSharePct: number | null; highErosivity: boolean; frost: { years: number; valid: number } | null };
/** Everything the series knows about one calendar month, with the hypothetical shift applied to rain, P−ET0 and temperature. */
export function readMonth(series: ClimateSeries, month: number, whatIf: WhatIf): MonthReading {
  const index = month - 1;
  return { month, rainBaseMm: series.rainMm[index] ?? null, rainMm: shiftRain(series.rainMm[index] ?? null, whatIf), et0Mm: series.et0Mm[index] ?? null, balanceBaseMm: series.balanceMm[index] ?? null, balanceMm: shiftBalance(series.balanceMm[index] ?? null, series.rainMm[index] ?? null, whatIf), tmeanBaseC: series.tmeanC[index] ?? null, tmeanC: shiftTemp(series.tmeanC[index] ?? null, whatIf), wetness: series.wetness[index] ?? null, ndvi: series.ndvi[index] ?? null, rainSharePct: series.rainSharePct[index] ?? null, highErosivity: series.highErosivity[index] ?? false, frost: series.frost[index] ?? null };
}

export type CropSegment = { slotIndex: number; year: 1 | 2; season: 'A' | 'B'; cropId: string; startOffset: number; length: number; startMonth: number; months: number[]; source: 'documented_cycle' | 'assumed_default'; cycleDays: number | null; clipped: boolean; row: number };
export type UnplacedSlot = { slotIndex: number; year: 1 | 2; season: 'A' | 'B'; reason: 'no_crop' | 'no_start_month' };
export type BareSegment = { startOffset: number; length: number; highErosivityMonths: number };
export type ZarcCell = { offset: number; month: number; cropId: string; status: 'indicated' | 'not_indicated' | 'unknown'; riskPct: number | null; sowing: boolean; note: string; noteEn: string };
export type LaneModel = { id: ScenarioId; rotation: Rotation; segments: CropSegment[]; unplaced: UnplacedSlot[]; bare: BareSegment[]; /** False when the 24-month occupancy could not be built (slot without crop or start month). */ bareKnown: boolean; rows: number; zarc: Array<ZarcCell | null> };

/** Crop windows of a scenario from its lab slots, placed on the 24-month axis exactly as the bare-soil assessment does. */
export function buildSegments(rotation: Rotation, input: AnalysisResult['input']): { segments: CropSegment[]; unplaced: UnplacedSlot[]; rows: number } {
  const segments: CropSegment[] = []; const unplaced: UnplacedSlot[] = [];
  (rotation.slots ?? []).forEach((slot, slotIndex) => {
    if (!slot.cropId) { unplaced.push({ slotIndex, year: slot.year, season: slot.season, reason: 'no_crop' }); return; }
    const start = slotSeasonWindow(input, slot.season).month;
    const window = slotWindow(cropById.get(slot.cropId as Crop['id']), start, slot.season);
    if (!window) { unplaced.push({ slotIndex, year: slot.year, season: slot.season, reason: 'no_start_month' }); return; }
    const startOffset = ((window.startMonth - input.plantingMonth + 12) % 12) + (slot.year === 2 ? 12 : 0);
    if (startOffset >= HORIZON) return;
    const length = Math.min(window.months.length, HORIZON - startOffset);
    segments.push({ slotIndex, year: slot.year, season: slot.season, cropId: slot.cropId, startOffset, length, startMonth: window.startMonth, months: window.months.slice(0, length), source: window.source, cycleDays: window.cycleDays, clipped: length < window.months.length, row: 0 });
  });
  const ends: number[] = [];
  for (const segment of [...segments].sort((a, b) => a.startOffset - b.startOffset)) {
    let row = ends.findIndex((end) => end <= segment.startOffset); if (row < 0) { row = ends.length; ends.push(0); }
    ends[row] = segment.startOffset + segment.length; segment.row = row;
  }
  return { segments, unplaced, rows: Math.max(1, ends.length) };
}

/** Consecutive uncovered months of the bare-soil occupancy; empty when the occupancy is unknown. */
export function buildBareSegments(rotation: Rotation): { bare: BareSegment[]; known: boolean } {
  const bareSoil = rotation.bareSoil; if (!bareSoil || bareSoil.windowsSource === 'unknown') return { bare: [], known: false };
  const highOffsets = new Set(bareSoil.bareMonthsInHighErosivity.map((item) => item.offset));
  const bare: BareSegment[] = [];
  for (const item of bareSoil.occupancy) {
    if (item.covered) continue;
    const last = bare.at(-1);
    if (last && last.startOffset + last.length === item.offset) { last.length += 1; if (highOffsets.has(item.offset)) last.highErosivityMonths += 1; }
    else bare.push({ startOffset: item.offset, length: 1, highErosivityMonths: highOffsets.has(item.offset) ? 1 : 0 });
  }
  return { bare, known: true };
}

function buildZarc(data: AnalysisResult, segments: CropSegment[]): Array<ZarcCell | null> {
  const texture = farmerZarcTexture(data.input); const startMonth = data.input.plantingMonth;
  return Array.from({ length: HORIZON }, (_, offset) => {
    const segment = [...segments].reverse().find((item) => offset >= item.startOffset && offset < item.startOffset + item.length);
    if (!segment) return null;
    const month = monthAt(offset, startMonth); const status = zarcWindowStatus(data.regionalContext, segment.cropId, month, texture);
    return { offset, month, cropId: segment.cropId, status: status.status, riskPct: status.riskLevelPct, sowing: offset === segment.startOffset, note: status.note, noteEn: status.noteEn };
  });
}

export type TimelineModel = { startMonth: number; months: TimelineMonth[]; lanes: LaneModel[]; series: ClimateSeries; zarcAvailable: boolean };

export function buildTimelineModel(data: AnalysisResult): TimelineModel {
  const startMonth = data.input.plantingMonth;
  const series = buildClimateSeries(data);
  const lanes = SCENARIO_IDS.flatMap<LaneModel>((id) => {
    const rotation = data.strategies.find((item) => item.id === id); if (!rotation) return [];
    const placed = buildSegments(rotation, data.input); const bare = buildBareSegments(rotation);
    return [{ id, rotation, segments: placed.segments, unplaced: placed.unplaced, bare: bare.bare, bareKnown: bare.known, rows: placed.rows, zarc: buildZarc(data, placed.segments) }];
  });
  return { startMonth, months: timelineMonths(startMonth), lanes, series, zarcAvailable: Boolean(data.regionalContext.zarc) };
}

/** Segment of the "second crop" (safrinha) of a year, if the slot was placed. */
export const secondCropSegment = (lane: LaneModel, year: 1 | 2) => lane.segments.find((segment) => segment.season === 'B' && segment.year === year) ?? null;

export type WindowSum = { sumMm: number | null; missingMonths: number[] };
/** Sum of the displayed P−ET0 over the months of a window (hypothetical shift applied). Any missing month makes the sum null. */
export function windowBalanceSum(series: ClimateSeries, months: number[], whatIf: WhatIf): WindowSum {
  const values = months.map((month) => ({ month, value: readMonth(series, month, whatIf).balanceMm }));
  const missingMonths = values.filter((item) => item.value === null).map((item) => item.month);
  return { sumMm: missingMonths.length || !values.length ? null : roundTo(values.reduce((sum, item) => sum + (item.value as number), 0), 1), missingMonths };
}

/** Documented viable thermal range of the second crop of a scenario (falls back to its proposed crop). */
export function thermalReference(lane: LaneModel): { cropId: string | null; range: { min: number; max: number } | null } {
  const cropId = lane.rotation.slots?.[1]?.cropId ?? lane.rotation.proposedCrop?.cropId ?? null;
  const crop = cropId ? cropById.get(cropId as Crop['id']) : undefined;
  return { cropId, range: crop?.viableTempC ?? null };
}

/** Number of bare months that fall in months of above-average rainfall erosivity, per scenario. */
export const bareInHighErosivityCount = (lane: LaneModel): number | null => lane.rotation.bareSoil && lane.bareKnown ? lane.rotation.bareSoil.bareMonthsInHighErosivity.length : null;
export const bareMonthCount = (lane: LaneModel): number | null => lane.rotation.bareSoil && lane.bareKnown ? lane.rotation.bareSoil.bareMonths.length : null;
