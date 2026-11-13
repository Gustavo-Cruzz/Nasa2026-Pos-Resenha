import { cropById, crops, type Crop } from '@/lib/catalog';
import { isPilotLocation } from '@/lib/region';
import zarc from '@/data/rio-verde-zarc.json';
import type { Coordinates } from '@/lib/schema';

export type EvidenceStatus = 'supported' | 'partial' | 'insufficient_evidence' | 'unavailable';
export type EvidenceIndicator = { id: 'temperature' | 'cycle' | 'soil_ph' | 'purpose'; label: string; value: string | null; status: EvidenceStatus; sourceRefs: string[]; explanation: string };
export type CropCoverage = { crop: Crop; status: EvidenceStatus; indicators: EvidenceIndicator[]; warnings: string[]; missingEvidence: string[] };
const P0 = ['soybean', 'maize', 'sorghum', 'sunflower', 'cowpea', 'ruziziensis'] as const;

function range(value: { min: number; max: number } | null, unit: string): string | null { return value ? `${value.min}–${value.max} ${unit}` : null; }
function zarcExists(cropId: string): boolean { return zarc.entries.some((entry) => entry.cropId === cropId); }

/** Evaluates source applicability, not crop performance or local suitability. */
export function evidenceCoverageAssessment(location: Coordinates | null, cropId: string): CropCoverage {
  const crop = cropById.get(cropId as Crop['id']);
  if (!crop) throw new Error(`Unknown crop: ${cropId}`);
  const p0 = (P0 as readonly string[]).includes(crop.id);
  const contextualZarc = Boolean(location && isPilotLocation(location) && zarcExists(crop.id));
  const status: EvidenceStatus = !p0 ? 'unavailable' : contextualZarc ? 'partial' : 'insufficient_evidence';
  const reference = crop.sourceRefs;
  const indicators: EvidenceIndicator[] = [
    { id: 'temperature', label: 'Faixa térmica documentada', value: range(crop.viableTempC, '°C') ?? range(crop.idealTempC, '°C'), status: crop.viableTempC || crop.idealTempC ? 'partial' : 'insufficient_evidence', sourceRefs: reference, explanation: crop.viableTempC || crop.idealTempC ? 'Parâmetro documentado fora de uma validação local automática.' : 'N/D: faixa térmica verificável não está disponível.' },
    { id: 'cycle', label: 'Duração documentada', value: range(crop.cycleDaysRange, 'dias'), status: crop.cycleDaysRange ? 'partial' : 'insufficient_evidence', sourceRefs: reference, explanation: crop.cycleDaysRange ? 'Fonte de ciclo disponível; não cria calendário local.' : 'N/D: duração verificável não está disponível.' },
    { id: 'soil_ph', label: 'Contexto de pH', value: range(crop.soilPhRange, 'pH'), status: crop.soilPhRange ? 'partial' : 'insufficient_evidence', sourceRefs: reference, explanation: crop.soilPhRange ? 'Faixa documentada; requer análise/origem de solo compatível.' : 'N/D: não há faixa de pH verificável.' },
    { id: 'purpose', label: 'Finalidades catalogadas', value: crop.purposes.join(', '), status: 'partial', sourceRefs: reference, explanation: 'Finalidade catalogada não equivale a adequação local.' },
  ];
  const missingEvidence = [...new Set(indicators.filter((indicator) => indicator.status === 'insufficient_evidence').map((indicator) => indicator.id))];
  return { crop, status, indicators, warnings: [contextualZarc ? 'ZARC de Rio Verde está disponível como contexto regional; seus códigos brutos não são percentuais.' : 'Há fontes brasileiras no catálogo. Não há calendário ou regra agronômica local aplicável a esta coordenada.'], missingEvidence };
}

export function p0CropCoverage(location: Coordinates | null): CropCoverage[] { return P0.map((cropId) => evidenceCoverageAssessment(location, cropId)); }
export const P0_CROP_IDS = P0;
export const p0Crops = crops.filter((crop) => (P0 as readonly string[]).includes(crop.id));
