import type { AnalysisInput, SoilProfile } from '@/lib/schema';
import { verifiedCropEvidence, type Crop } from '@/lib/catalog';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import { slotWindow, windowThermal, windowThermalDetail, windowWaterBalance, windowWaterBalanceDetail, windowWater, rainDaysDetail, rootZoneDetail, windowFrost, windowFrostDetail, windowLabel } from '@/lib/engine/slot-window';
import type { IndicatorState, QualitativeIndicator } from '@/lib/engine/types';

/** Season window of a lab slot: `month` null means the window is not informed (never invented). */
export type SeasonWindow = { month: number | null; label?: string; note?: string; cycleContextConfirmed?: boolean };

/** Shared qualitative rules used by both scenario summaries and individual lab slots. */
export function assessCropIndicators(crop: Crop | undefined, previousCrop: Crop | undefined, input: AnalysisInput, climateIn: ClimateContext, regionalSoil?: SoilProfile, season?: SeasonWindow): QualitativeIndicator[] {
  const month = season ? season.month : input.plantingMonth; const monthKnown = month !== null;
  /** NASA monthly context is evaluated for the slot's own month; month-specific water context only exists for the planting month. */
  const climate: ClimateContext = !monthKnown ? { ...climateIn, status: 'unavailable', plantingMonthPrecipitation: null, waterContext: null, waterContextByMonth: undefined } : month === input.plantingMonth ? climateIn : { ...climateIn, plantingMonthPrecipitation: climateIn.historicalPrecipitationByMonth.find((item) => item.month === month) ?? null, waterContext: climateIn.waterContextByMonth?.find((item) => item.month === month) ?? (climateIn.waterContext?.month === month ? climateIn.waterContext : null) };
  /** Window of the slot (documented cycle, else assumed length); every window indicator comes from NASA series already loaded. */
  const window = crop && monthKnown ? slotWindow(crop, month, season?.label === 'safrinha' ? 'B' : 'A', season?.cycleContextConfirmed) : null;
  const thermalWindow = window ? windowThermal(window, crop, climate) : null;
  const thermal: IndicatorState = thermalWindow ? thermalWindow.state : !crop?.viableTempC || climate.status !== 'available' ? 'unknown' : (() => { const observed = climate.monthly.find((item) => item.month === month)?.tmeanMedianC; return observed === null || observed === undefined ? 'unknown' : observed >= crop.viableTempC.min && observed <= crop.viableTempC.max ? 'compatible' : 'attention'; })();
  const rain = climate.plantingMonthPrecipitation;
  const water = climate.waterContext;
  const byMonth = climate.waterContextByMonth; const winWater = window && byMonth ? windowWater(window, byMonth) : null;
  const rainWindowObserved = Boolean(winWater?.rainDays.some((item) => item.days !== null)); const rootWindowObserved = Boolean(winWater?.rootZone.some((item) => item.value !== null));
  const kcEvidence = crop ? verifiedCropEvidence(crop.id, 'kcStages') : undefined;
  const peakKc = crop?.kcStages?.reduce((peak, stage) => stage.kc > peak.kc ? stage : peak, crop.kcStages[0]);
  const waterResponseObserved = Boolean(peakKc && (rainWindowObserved || rootWindowObserved || water?.rootZoneWetnessMedian !== null && water?.rootZoneWetnessMedian !== undefined || water?.medianRainDays !== null && water?.medianRainDays !== undefined));
  const diversity: IndicatorState = !crop || !previousCrop ? 'unknown' : crop.family === previousCrop.family ? 'attention' : 'compatible';
  const farmerPh = input.soil?.ph; const regionalPh = farmerPh === undefined ? regionalSoil?.ph : undefined; const phValue = farmerPh ?? regionalPh; const regional = farmerPh === undefined && regionalPh !== undefined;
  const soil: IndicatorState = phValue === undefined || !crop?.soilPhRange ? 'unknown' : phValue >= crop.soilPhRange.min && phValue <= crop.soilPhRange.max ? 'compatible' : 'attention';
  const soilDetail = regional ? soilContextRegionalDetail(regionalPh!, soil, crop?.soilPhRange ?? null) : soil === 'unknown' ? 'pH informado e faixa de pH verificável são necessários.' : soil === 'compatible' ? 'pH informado dentro da faixa documentada.' : 'pH informado fora da faixa documentada.';
  const balance = window ? windowWaterBalance(window, climate.waterBalanceByMonth) : null; const frost = window ? windowFrost(window, climate) : null;
  const climateIds = new Set(['thermal_compatibility', 'historical_precipitation', 'rainfall_distribution', 'root_zone_wetness', 'documented_water_response', 'window_water_balance', 'frost_risk']);
  const indicators: QualitativeIndicator[] = [
    { id: 'thermal_compatibility', label: 'Compatibilidade térmica', state: thermal, detail: thermalWindow && window && thermal !== 'unknown' ? windowThermalDetail(window, crop, thermalWindow) : thermal === 'unknown' ? 'Faixa térmica documentada e/ou clima histórico indisponível.' : 'Comparação exploratória com a climatologia mensal NASA.', sourceRefs: crop?.sourceRefs ?? [] },
    { id: 'historical_precipitation', label: 'Precipitação histórica no mês', state: rain?.medianTotalMm === null || !rain ? 'unknown' : 'observed', detail: rain?.medianTotalMm === null || !rain ? 'Sem observação histórica disponível.' : `${rain.medianTotalMm} mm (mediana histórica; cobertura de ${rain.coveragePct}%). Não é demanda hídrica.`, sourceRefs: climate.provenance ? [climate.provenance.sourceUrl] : [] },
    { id: 'rainfall_distribution', label: 'Distribuição histórica da chuva', state: winWater && window ? (rainWindowObserved ? 'observed' : 'unknown') : water?.medianRainDays === null || water?.medianRainDays === undefined ? 'unknown' : 'observed', detail: winWater && window && rainWindowObserved ? rainDaysDetail(window, winWater) : water?.medianRainDays === null || water?.medianRainDays === undefined ? 'GPM IMERG indisponível para esta série.' : `${water.medianRainDays} dias com chuva registrada no mês mediano; cobertura anual completa de ${water.imergCoveragePct}%. Não indica suficiência para a cultura.`, sourceRefs: climate.provenance ? [climate.provenance.sourceUrl] : [] },
    { id: 'root_zone_wetness', label: 'Umidade relativa da zona radicular', state: winWater && window ? (rootWindowObserved ? 'observed' : 'unknown') : water?.rootZoneWetnessMedian === null || water?.rootZoneWetnessMedian === undefined ? 'unknown' : 'observed', detail: winWater && window && rootWindowObserved ? rootZoneDetail(window, winWater) : water?.rootZoneWetnessMedian === null || water?.rootZoneWetnessMedian === undefined ? 'Contexto de umidade da zona radicular indisponível.' : `${water.rootZoneWetnessMedian} (índice relativo 0–1; cobertura diária de ${water.rootZoneCoveragePct}%). Grade regional modelada, não medição do talhão.`, sourceRefs: climate.provenance ? [climate.provenance.sourceUrl] : [] },
    { id: 'window_water_balance', label: 'Balanço P−ET0 na janela', state: balance?.sumMm === null || !balance ? 'unknown' : 'observed', detail: balance && window ? windowWaterBalanceDetail(window, balance) : 'Janela da cultura ou balanço P−ET0 indisponível.', value: balance?.sumMm ?? null, sourceRefs: climate.provenance ? [climate.provenance.sourceUrl] : [] },
    { id: 'frost_risk', label: 'Risco de geada (triagem)', state: frost?.state ?? 'unknown', detail: frost && window ? windowFrostDetail(window, frost) : 'Janela da cultura ou Tmín histórica indisponível.', sourceRefs: climate.provenance ? [climate.provenance.sourceUrl] : [] },
    { id: 'documented_water_response', label: 'Resposta hídrica documentada', state: waterResponseObserved ? 'observed' : 'unknown', detail: !peakKc ? 'Perfil Kc verificável indisponível para esta cultura.' : !waterResponseObserved ? `Perfil Kc documentado disponível, mas exposição NASA indisponível. Pico Kc ${peakKc.kc} na fase “${peakKc.stage}”.` : `Exposição histórica ${window && winWater ? `na ${windowLabel(window)}: zona radicular ${winWater.rootZone.map((item) => item.value ?? 'N/D').join('/')}; dias com chuva IMERG ${winWater.rainDays.map((item) => item.days ?? 'N/D').join('/')}` : `comum: zona radicular ${water?.rootZoneWetnessMedian ?? 'N/D'}; ${water?.medianRainDays ?? 'N/D'} dias com chuva IMERG`}. Referência específica da cultura: pico Kc ${peakKc.kc} na fase “${peakKc.stage}”. Não calcula ETc, consumo ou irrigação e não ranqueia estudos.`, sourceRefs: [...(climate.provenance ? [climate.provenance.sourceUrl] : []), ...(kcEvidence?.source.url ? [kcEvidence.source.url] : [])] },
    { id: 'cover_potential', label: 'Potencial de cobertura', state: !crop ? 'unknown' : crop.purposes.includes('cover') ? 'yes' : 'no', detail: !crop ? 'Sem cultura proposta.' : crop.purposes.includes('cover') ? 'Finalidade de cobertura catalogada; não estima carbono, N ou fertilidade.' : 'Finalidade de cobertura não catalogada.', sourceRefs: crop?.sourceRefs ?? [] },
    { id: 'functional_diversity', label: 'Diversidade funcional', state: diversity, detail: diversity === 'unknown' ? 'Família da cultura anterior ou proposta desconhecida.' : diversity === 'compatible' ? 'Família diferente da cultura anterior informada.' : 'Mesma família da cultura anterior informada.', sourceRefs: crop?.sourceRefs ?? [] },
    { id: 'soil_context', label: 'Contexto de solo (pH)', state: soil, detail: soilDetail, origin: regional ? 'regional_estimate' : farmerPh !== undefined ? 'farmer' : undefined, value: phValue ?? null, sourceRefs: crop?.sourceRefs ?? [] },
  ];
  if (!monthKnown) return indicators.map((item) => climateIds.has(item.id) ? { ...item, state: 'unknown', detail: `Janela da ${season?.label ?? 'safrinha'} não informada.` } : item);
  return season?.note ? indicators.map((item) => climateIds.has(item.id) ? { ...item, detail: `${item.detail} ${season.note}` } : item) : indicators;
}

export const REGIONAL_SOIL_NOTE = 'Estimativa regional (SoilGrids, média municipal 0–30 cm), não é análise do talhão';
export const REGIONAL_SOIL_NOTE_EN = 'Regional estimate (SoilGrids, municipal mean, 0–30 cm), not a field analysis';
/** pH with a decimal comma for pt-BR text. */
export function formatDecimal(value: number, locale: 'pt-BR' | 'en' = 'pt-BR'): string { const text = String(Math.round(value * 100) / 100); return locale === 'pt-BR' ? text.replace('.', ',') : text; }
function soilContextRegionalDetail(ph: number, state: IndicatorState, range: { min: number; max: number } | null): string {
  const tail = !range ? 'faixa da cultura não documentada' : state === 'compatible' ? `dentro da faixa documentada da cultura (${formatDecimal(range.min)}–${formatDecimal(range.max)})` : `fora da faixa documentada da cultura (${formatDecimal(range.min)}–${formatDecimal(range.max)})`;
  return `${REGIONAL_SOIL_NOTE}. pH regional ${formatDecimal(ph)} — ${tail}.`;
}
