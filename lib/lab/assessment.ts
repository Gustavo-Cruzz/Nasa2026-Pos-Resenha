import { cropById, type Crop } from '@/lib/catalog';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import { assessCropIndicators } from '@/lib/engine/indicators';
import type { QualitativeIndicator } from '@/lib/engine/types';
import type { LabPlan } from '@/lib/lab';
import type { AnalysisInput, SoilProfile } from '@/lib/schema';
import type { BrazilRegionalContext } from '@/lib/brazil/types';
import type { ValidationLevel } from '@/lib/engine/types';
import { slotSeasonWindow } from '@/lib/engine/slot-season';
import { zarcWindowStatus, type ZarcSoilTexture, type ZarcWindowStatus } from '@/lib/brazil/zarc';

export type LabSlotAssessment = { scenarioId: 'A' | 'B' | 'C'; slotIndex: number; year: 1 | 2; season: 'A' | 'B'; cropId: string | null; cropName: string | null; previousCropId: string | null; validationLevel: ValidationLevel; indicators: QualitativeIndicator[]; sourceRefs: string[]; missingEvidence: string[]; /** ZARC status for the slot start month (calendar axis); null when there is no crop or no start month. */ zarc: ZarcWindowStatus | null };

/** MAPA soil Tipo 1/2/3 from farmer-declared clay share (<15 %, 15-35 %, >35 %); null (any soil) when no farmer texture exists. */
export function farmerZarcTexture(input: AnalysisInput): ZarcSoilTexture | null {
  const soil = input.soil; if (!soil || soil.origin !== 'farmer_lab' || soil.clayPct === undefined) return null;
  return soil.clayPct < 15 ? 'sandy' : soil.clayPct <= 35 ? 'medium' : 'clayey';
}

const getCrop = (id: string | null | undefined): Crop | undefined => id ? cropById.get(id as Crop['id']) : undefined;

export function assessLabPlan(input: AnalysisInput, plan: LabPlan, climate: ClimateContext, regionalContext?: BrazilRegionalContext, regionalSoil?: SoilProfile): LabSlotAssessment[] {
  const historicalCrop = getCrop(input.history.at(-1)?.cropId);
  return plan.scenarios.flatMap((scenario) => scenario.slots.map((slot, slotIndex) => {
    const crop = getCrop(slot.cropId);
    const previousCrop = slotIndex === 0 ? historicalCrop : getCrop(scenario.slots[slotIndex - 1]?.cropId);
    const indicators = assessCropIndicators(crop, previousCrop, input, climate, regionalSoil, slotSeasonWindow(input, slot.season));
    const missingEvidence = [...new Set([
      ...(!crop ? ['crop'] : []),
      ...(crop && !crop.viableTempC ? ['temperature'] : []),
      ...(crop && !crop.cycleDaysRange ? ['cycle'] : []),
      ...((input.soil?.ph === undefined && regionalSoil?.ph === undefined) || (input.soil?.ph !== undefined && !crop?.soilPhRange) ? ['soil_ph'] : []),
      ...(!previousCrop ? ['previous_crop_family'] : []),
    ])];
    const validationLevel: ValidationLevel = crop && regionalContext?.zarc?.crops[crop.id] ? 'regionally_contextualized' : 'climate_exploration';
    const startMonth = slotSeasonWindow(input, slot.season).month;
    const zarc = crop ? zarcWindowStatus(regionalContext, crop.id, startMonth ?? 0, farmerZarcTexture(input)) : null;
    return { scenarioId: scenario.id, slotIndex, year: slot.year, season: slot.season, cropId: crop?.id ?? null, cropName: crop?.commonNames['pt-BR'] ?? null, previousCropId: previousCrop?.id ?? null, validationLevel, indicators, sourceRefs: [...new Set(indicators.flatMap((indicator) => indicator.sourceRefs))], missingEvidence, zarc };
  }));
}
