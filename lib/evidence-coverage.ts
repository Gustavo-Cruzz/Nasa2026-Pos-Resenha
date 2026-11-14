import { cropById, crops, type Crop } from '@/lib/catalog';
import type { Coordinates } from '@/lib/schema';
import type { BrazilRegionalContext } from '@/lib/brazil/types';

export type EvidenceStatus = 'supported' | 'partial' | 'insufficient_evidence' | 'unavailable';
export type EvidenceIndicator = { id: 'temperature' | 'cycle' | 'soil_ph' | 'purpose'; label: string; value: string | null; status: EvidenceStatus; sourceRefs: string[]; explanation: string };
export type CropCoverage = { crop: Crop; status: EvidenceStatus; indicators: EvidenceIndicator[]; warnings: string[]; missingEvidence: string[] };
const P0 = ['soybean', 'maize', 'sorghum', 'sunflower', 'cowpea', 'common_bean', 'upland_rice', 'ruziziensis'] as const;

function range(value: { min: number; max: number } | null, unit: string): string | null { return value ? `${value.min}–${value.max} ${unit}` : null; }

/** Evaluates source applicability, not crop performance or local suitability. */
export function evidenceCoverageAssessment(location: Coordinates | null, cropId: string, regionalContext?: BrazilRegionalContext | null): CropCoverage {
  const crop = cropById.get(cropId as Crop['id']);
  if (!crop) throw new Error(`Unknown crop: ${cropId}`);
  const p0 = (P0 as readonly string[]).includes(crop.id);
  const contextualZarc = Boolean(location && regionalContext?.zarc?.crops[crop.id]);
  const status: EvidenceStatus = contextualZarc ? 'partial' : p0 ? 'insufficient_evidence' : crop.sourceRefs.length ? 'partial' : 'insufficient_evidence';
  const reference = crop.sourceRefs;
  const indicators: EvidenceIndicator[] = [
    { id: 'temperature', label: 'Faixa térmica documentada', value: range(crop.viableTempC, '°C') ?? range(crop.idealTempC, '°C'), status: crop.viableTempC || crop.idealTempC ? 'partial' : 'insufficient_evidence', sourceRefs: reference, explanation: crop.viableTempC || crop.idealTempC ? 'Parâmetro documentado fora de uma validação local automática.' : 'N/D: faixa térmica verificável não está disponível.' },
    { id: 'cycle', label: 'Duração documentada', value: range(crop.cycleDaysRange, 'dias'), status: crop.cycleDaysRange ? 'partial' : 'insufficient_evidence', sourceRefs: reference, explanation: crop.cycleDaysRange ? 'Fonte de ciclo disponível; não cria calendário local.' : 'N/D: duração verificável não está disponível.' },
    { id: 'soil_ph', label: 'Contexto de pH', value: range(crop.soilPhRange, 'pH'), status: crop.soilPhRange ? 'partial' : 'insufficient_evidence', sourceRefs: reference, explanation: crop.soilPhRange ? 'Faixa documentada; requer análise/origem de solo compatível.' : 'N/D: não há faixa de pH verificável.' },
    { id: 'purpose', label: 'Finalidades catalogadas', value: crop.purposes.join(', '), status: 'partial', sourceRefs: reference, explanation: 'Finalidade catalogada não equivale a adequação local.' },
  ];
  const missingEvidence = [...new Set(indicators.filter((indicator) => indicator.status === 'insufficient_evidence').map((indicator) => indicator.id))];
  const place = regionalContext?.municipality ? `${regionalContext.municipality.name} (${regionalContext.municipality.uf})` : null;
  return { crop, status, indicators, warnings: [contextualZarc ? `ZARC ${regionalContext?.zarc?.safra} disponível para ${place}; códigos brutos preservados sem interpretação.` : place ? `Município identificado: ${place}. Não há registro ZARC desta cultura P0 na safra carregada.` : 'Há fontes brasileiras no catálogo. Não há contexto regional aplicável a esta coordenada.'], missingEvidence };
}

export function p0CropCoverage(location: Coordinates | null, regionalContext?: BrazilRegionalContext | null): CropCoverage[] { return P0.map((cropId) => evidenceCoverageAssessment(location, cropId, regionalContext)); }
export const P0_CROP_IDS = P0;
export const p0Crops = crops.filter((crop) => (P0 as readonly string[]).includes(crop.id));
