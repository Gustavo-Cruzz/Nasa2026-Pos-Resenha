import { cropById, crops, type Crop } from '@/lib/catalog';
import type { Coordinates } from '@/lib/schema';
import type { BrazilRegionalContext } from '@/lib/brazil/types';
import type { Locale } from '@/lib/i18n';

export type EvidenceStatus = 'supported' | 'partial' | 'insufficient_evidence' | 'unavailable';
export type EvidenceIndicator = { id: 'temperature' | 'cycle' | 'soil_ph' | 'purpose'; label: string; value: string | null; status: EvidenceStatus; sourceRefs: string[]; explanation: string };
export type CropCoverage = { crop: Crop; status: EvidenceStatus; indicators: EvidenceIndicator[]; warnings: string[]; missingEvidence: string[] };
const P0 = ['soybean', 'maize', 'sorghum', 'sunflower', 'cowpea', 'common_bean', 'upland_rice', 'ruziziensis'] as const;

function range(value: { min: number; max: number } | null, unit: string): string | null { return value ? `${value.min}–${value.max} ${unit}` : null; }

/** Evaluates source applicability, not crop performance or local suitability. */
export function evidenceCoverageAssessment(location: Coordinates | null, cropId: string, regionalContext?: BrazilRegionalContext | null, locale: Locale = 'en'): CropCoverage {
  const en = locale === 'en';
  const crop = cropById.get(cropId as Crop['id']);
  if (!crop) throw new Error(`Unknown crop: ${cropId}`);
  const priorityP0 = (P0 as readonly string[]).includes(crop.id);
  const contextualZarc = Boolean(location && regionalContext?.zarc?.crops[crop.id]);
  const status: EvidenceStatus = contextualZarc ? 'partial' : 'insufficient_evidence';
  const reference = crop.sourceRefs;
  const indicators: EvidenceIndicator[] = [
    { id: 'temperature', label: en ? 'Documented thermal range' : 'Faixa térmica documentada', value: range(crop.viableTempC, '°C') ?? range(crop.idealTempC, '°C'), status: crop.viableTempC || crop.idealTempC ? 'partial' : 'insufficient_evidence', sourceRefs: reference, explanation: crop.viableTempC || crop.idealTempC ? (en ? 'Documented parameter, outside any automatic local validation.' : 'Parâmetro documentado fora de uma validação local automática.') : (en ? 'N/A: no verifiable thermal range is available.' : 'N/D: faixa térmica verificável não está disponível.') },
    { id: 'cycle', label: en ? 'Documented duration' : 'Duração documentada', value: range(crop.cycleDaysRange, en ? 'days' : 'dias'), status: crop.cycleDaysRange ? 'partial' : 'insufficient_evidence', sourceRefs: reference, explanation: crop.cycleDaysRange ? (en ? 'Cycle source available; it does not create a local calendar.' : 'Fonte de ciclo disponível; não cria calendário local.') : (en ? 'N/A: no verifiable duration is available.' : 'N/D: duração verificável não está disponível.') },
    { id: 'soil_ph', label: en ? 'pH context' : 'Contexto de pH', value: range(crop.soilPhRange, 'pH'), status: crop.soilPhRange ? 'partial' : 'insufficient_evidence', sourceRefs: reference, explanation: crop.soilPhRange ? (en ? 'Documented range; requires a compatible soil analysis or origin.' : 'Faixa documentada; requer análise/origem de solo compatível.') : (en ? 'N/A: no verifiable pH range.' : 'N/D: não há faixa de pH verificável.') },
    { id: 'purpose', label: en ? 'Cataloged purposes' : 'Finalidades catalogadas', value: crop.purposes.join(', '), status: 'partial', sourceRefs: reference, explanation: en ? 'A cataloged purpose does not equal local suitability.' : 'Finalidade catalogada não equivale a adequação local.' },
  ];
  const missingEvidence = [...new Set(indicators.filter((indicator) => indicator.status === 'insufficient_evidence').map((indicator) => indicator.id))];
  const place = regionalContext?.municipality ? `${regionalContext.municipality.name} (${regionalContext.municipality.uf})` : null;
  return { crop, status, indicators, warnings: [contextualZarc ? (en ? `ZARC ${regionalContext?.zarc?.safra} available for ${place}; raw codes preserved without interpretation.` : `ZARC ${regionalContext?.zarc?.safra} disponível para ${place}; códigos brutos preservados sem interpretação.`) : place ? (en ? `Municipality identified: ${place}. There is no applicable ${priorityP0 ? 'P0 ' : ''}ZARC record for this crop in the loaded season.` : `Município identificado: ${place}. Não há registro ZARC ${priorityP0 ? 'P0 ' : ''}aplicável desta cultura na safra carregada.`) : (en ? 'Brazilian sources exist in the catalog. There is no regional context applicable to this coordinate.' : 'Há fontes brasileiras no catálogo. Não há contexto regional aplicável a esta coordenada.')], missingEvidence };
}

export function p0CropCoverage(location: Coordinates | null, regionalContext?: BrazilRegionalContext | null, locale: Locale = 'en'): CropCoverage[] { return P0.map((cropId) => evidenceCoverageAssessment(location, cropId, regionalContext, locale)); }
export const P0_CROP_IDS = P0;
export const p0Crops = crops.filter((crop) => (P0 as readonly string[]).includes(crop.id));
