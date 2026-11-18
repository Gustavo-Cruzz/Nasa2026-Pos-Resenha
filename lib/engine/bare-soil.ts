import { cropById, type Crop } from '@/lib/catalog';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import { erosivityLabel, type ErosivityClassId } from '@/lib/climate/erosivity';
import type { LabSlotAssessment } from '@/lib/lab/assessment';
import type { AnalysisInput } from '@/lib/schema';
import { MONTH_ABBR, slotSeasonWindow } from '@/lib/engine/slot-season';
import { slotWindow } from '@/lib/engine/slot-window';
import { reliefClass, reliefLabel, type TerrainContext } from '@/lib/terrain/terrain';

/** Relief at or above this mean slope (%) counts as erosion-relevant: the start of Embrapa's "moderadamente ondulado" class (same as terrain hotspots). */
const SLOPE_ATTENTION_PCT = 8;
const HIGH_CLASSES: ErosivityClassId[] = ['moderate', 'severe', 'very_severe'];
const HORIZON = 24;

export type BareSoilMonth = { offset: number; month: number };
export type BareSoilAssessment = {
  state: 'attention' | 'compatible' | 'unknown';
  /** Whether the crop windows come from documented cycles, a declared default, or both. `unknown` when slots lack a crop or start month. */
  windowsSource: 'documented' | 'assumed' | 'mixed' | 'unknown';
  /** One entry per month of the 24-month horizon (offset 0 = planting month). */
  occupancy: Array<{ offset: number; month: number; covered: boolean }>;
  /** Months of the horizon not inside any crop window (potentially bare; residue after harvest is not modelled). */
  bareMonths: BareSoilMonth[];
  /** Subset of `bareMonths` in months whose rainfall contribution to the Fournier index is above average (annual class moderate or higher). */
  bareMonthsInHighErosivity: BareSoilMonth[];
  highErosivityMonths: number[];
  erosivityClass: ErosivityClassId | null;
  slope: { meanPct: number; maxPct: number; reliefId: string } | null;
  detail: string;
  detailEn: string;
  sourceRefs: string[];
  missing: string[];
};

const monthName = (month: number) => MONTH_ABBR[month - 1];
const list = (items: BareSoilMonth[]) => items.map((item) => monthName(item.month)).join(', ');

/** Months whose Fournier term p_i^2/P exceeds the mean term (MFI/12), only when the annual class is moderate or higher. Screening rule, not a threshold from a source. */
export function highErosivityMonths(climate: ClimateContext): number[] {
  const classId = climate.erosivity?.classId ?? null;
  const rain = climate.historicalPrecipitationByMonth;
  if (!classId || !HIGH_CLASSES.includes(classId) || rain.length !== 12 || rain.some((item) => item.medianTotalMm === null)) return [];
  const total = rain.reduce((sum, item) => sum + (item.medianTotalMm as number), 0);
  return total > 0 ? rain.filter((item) => (item.medianTotalMm as number) / total > 1 / 12).map((item) => item.month) : [];
}

/**
 * 24-month occupancy calendar of one scenario from the crop window of each lab slot (documented cycle or the declared assumed default of
 * slot-window.ts). Months outside every window are potentially bare; crossed with the Fournier rainfall class and the SRTM slope when supplied.
 * Does not model residue persistence after harvest, tillage or management.
 */
export function assessBareSoil(input: AnalysisInput, slots: LabSlotAssessment[], climate: ClimateContext, terrain?: TerrainContext | null): BareSoilAssessment {
  const startA = input.plantingMonth;
  const crops = slots.map((slot) => slot.cropId ? cropById.get(slot.cropId as Crop['id']) : undefined);
  const starts = slots.map((slot) => slotSeasonWindow(input, slot.season).month);
  const missing = [...new Set([...(slots.length < 4 || crops.some((crop) => !crop) ? ['unconfigured_lab_slots'] : []), ...(starts.some((month) => month === null) ? ['safrinha_start_month'] : [])])];
  const windows = slots.map((slot, index) => slot.window !== undefined ? slot.window : slotWindow(crops[index], starts[index] ?? null, slot.season));
  if (windows.some((window, index) => window === null && crops[index] && starts[index] !== null)) missing.push('cycle_context_confirmation');
  const complete = !missing.length && windows.every(Boolean);
  const sources = new Set(windows.flatMap((window) => window ? [window.source] : []));
  const windowsSource: BareSoilAssessment['windowsSource'] = !complete ? 'unknown' : sources.size > 1 ? 'mixed' : sources.has('documented_cycle') ? 'documented' : 'assumed';
  const covered = new Array<boolean>(HORIZON).fill(false);
  if (complete) slots.forEach((slot, index) => {
    const window = windows[index]!; const base = ((window.startMonth - startA + 12) % 12) + (slot.year === 2 ? 12 : 0);
    window.months.forEach((_, step) => { if (base + step < HORIZON) covered[base + step] = true; });
  });
  const occupancy = covered.map((isCovered, offset) => ({ offset, month: (startA - 1 + offset) % 12 + 1, covered: isCovered }));
  const bareMonths = complete ? occupancy.filter((item) => !item.covered).map(({ offset, month }) => ({ offset, month })) : [];
  const high = highErosivityMonths(climate); const classId = climate.erosivity?.classId ?? null;
  const bareHigh = bareMonths.filter((item) => high.includes(item.month));
  const stats = terrain?.status === 'available' ? terrain.slopePct : null;
  const slope = stats ? { meanPct: stats.mean, maxPct: stats.max, reliefId: reliefClass(stats.mean) } : null;
  const steep = Boolean(slope && slope.meanPct >= SLOPE_ATTENTION_PCT);
  const sourceRefs = [...new Set([...windows.flatMap((window) => window?.simulation ? [window.simulation.sourceUrl] : []), ...(climate.erosivity?.classId ? ['https://journals.ltn.lodz.pl/Acta-Geographica-Lodziensia/article/download/2022/1789'] : []), ...(terrain?.status === 'available' ? [terrain.source.url] : [])])];
  if (!classId) missing.push('rainfall_erosivity');
  if (!slope) missing.push('terrain_slope');
  missing.push('residue_and_management');

  const state: BareSoilAssessment['state'] = !complete ? 'unknown' : !bareMonths.length ? 'compatible' : bareHigh.length || steep ? 'attention' : classId ? 'compatible' : 'unknown';
  const srcPt = windowsSource === 'documented' ? 'ciclos documentados' : windowsSource === 'assumed' ? 'janelas presumidas (ciclo não documentado; duração padrão declarada)' : 'ciclos documentados e janelas presumidas (ciclo não documentado em alguma cultura)';
  const srcEn = windowsSource === 'documented' ? 'documented cycles' : windowsSource === 'assumed' ? 'assumed windows (cycle not documented; declared default length)' : 'documented cycles and assumed windows (cycle not documented for some crop)';
  const eroPt = classId ? `Erosividade da chuva (Fournier modificado) ${erosivityLabel(classId, 'pt-BR')}${high.length ? `; meses com contribuição acima da média: ${high.map(monthName).join(', ')}` : ''}.` : 'Erosividade da chuva indisponível.';
  const eroEn = classId ? `Rainfall erosivity (Modified Fournier) ${erosivityLabel(classId, 'en')}${high.length ? `; above-average months: ${high.map(monthName).join(', ')}` : ''}.` : 'Rainfall erosivity unavailable.';
  const slopePt = slope ? ` Declividade SRTM média ${slope.meanPct.toFixed(1).replace('.', ',')}% (${reliefLabel(slope.reliefId as never, 'pt-BR').toLowerCase()}).` : ' Declividade indisponível.';
  const slopeEn = slope ? ` SRTM mean slope ${slope.meanPct.toFixed(1)}% (${reliefLabel(slope.reliefId as never, 'en').toLowerCase()}).` : ' Slope unavailable.';
  const tailPt = ' Palhada após a colheita, plantio direto e manejo não são modelados; não calcula perda de solo.';
  const tailEn = ' Residue after harvest, no-till and management are not modelled; no soil loss is computed.';
  let detail: string; let detailEn: string;
  if (!complete) { detail = 'Não sabemos: slots sem cultura, mês de início ou confirmação de contexto impedem montar o calendário de ocupação de 24 meses.'; detailEn = 'We do not know: slots without a crop, start month or context confirmation prevent building the 24-month occupancy calendar.'; }
  else if (!bareMonths.length) { detail = `Os 24 meses ficam dentro de alguma janela de cultura (${srcPt}).${tailPt}`; detailEn = `All 24 months fall inside some crop window (${srcEn}).${tailEn}`; }
  else { detail = `${bareMonths.length} de 24 meses fora de qualquer janela de cultura (${list(bareMonths)}), a partir de ${srcPt}. ${bareHigh.length ? `Destes, ${bareHigh.length} em meses de chuva mais erosiva (${list(bareHigh)}). ` : ''}${eroPt}${slopePt}${tailPt}`; detailEn = `${bareMonths.length} of 24 months fall outside every crop window (${list(bareMonths)}), from ${srcEn}. ${bareHigh.length ? `${bareHigh.length} of them in higher-erosivity months (${list(bareHigh)}). ` : ''}${eroEn}${slopeEn}${tailEn}`; }
  const simulationNotes = [...new Set(windows.flatMap((window) => window?.simulation ? [window.simulation.warning] : []))].join(' ');
  if (simulationNotes) { detail += ` Simulação exploratória: ${simulationNotes}`; detailEn += ` Exploratory simulation: ${simulationNotes}`; }
  return { state, windowsSource, occupancy, bareMonths, bareMonthsInHighErosivity: bareHigh, highErosivityMonths: high, erosivityClass: classId, slope, detail, detailEn, sourceRefs, missing: [...new Set(missing)] };
}
