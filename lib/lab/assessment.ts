import { cropById, type Crop } from '@/lib/catalog';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import { assessCropIndicators } from '@/lib/engine/indicators';
import type { QualitativeIndicator } from '@/lib/engine/types';
import type { LabPlan } from '@/lib/lab';
import type { AnalysisInput } from '@/lib/schema';
import type { BrazilRegionalContext } from '@/lib/brazil/types';
import type { ValidationLevel } from '@/lib/engine/types';

export type LabSlotAssessment = { scenarioId: 'A' | 'B' | 'C'; slotIndex: number; year: 1 | 2; season: 'A' | 'B'; cropId: string | null; cropName: string | null; previousCropId: string | null; validationLevel: ValidationLevel; indicators: QualitativeIndicator[]; sourceRefs: string[]; missingEvidence: string[] };

const getCrop = (id: string | null | undefined): Crop | undefined => id ? cropById.get(id as Crop['id']) : undefined;

export function assessLabPlan(input: AnalysisInput, plan: LabPlan, climate: ClimateContext, regionalContext?: BrazilRegionalContext): LabSlotAssessment[] {
  const historicalCrop = getCrop(input.history.at(-1)?.cropId);
  return plan.scenarios.flatMap((scenario) => scenario.slots.map((slot, slotIndex) => {
    const crop = getCrop(slot.cropId);
    const previousCrop = slotIndex === 0 ? historicalCrop : getCrop(scenario.slots[slotIndex - 1]?.cropId);
    const indicators = assessCropIndicators(crop, previousCrop, input, climate);
    const missingEvidence = [...new Set([
      ...(!crop ? ['crop'] : []),
      ...(crop && !crop.viableTempC ? ['temperature'] : []),
      ...(crop && !crop.cycleDaysRange ? ['cycle'] : []),
      ...(input.soil?.ph === undefined || !crop?.soilPhRange ? ['soil_ph'] : []),
      ...(!previousCrop ? ['previous_crop_family'] : []),
    ])];
    const validationLevel: ValidationLevel = crop && regionalContext?.zarc?.crops[crop.id] ? 'regionally_contextualized' : 'climate_exploration';
    return { scenarioId: scenario.id, slotIndex, year: slot.year, season: slot.season, cropId: crop?.id ?? null, cropName: crop?.commonNames['pt-BR'] ?? null, previousCropId: previousCrop?.id ?? null, validationLevel, indicators, sourceRefs: [...new Set(indicators.flatMap((indicator) => indicator.sourceRefs))], missingEvidence };
  }));
}
