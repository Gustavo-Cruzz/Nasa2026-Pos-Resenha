import type { QualitativeIndicator } from '@/lib/engine/types';
import type { LabSlotAssessment } from '@/lib/lab/assessment';

const tracked = new Set<QualitativeIndicator['id']>(['thermal_compatibility', 'cover_potential', 'functional_diversity', 'soil_context']);
export type LabIndicatorChange = { indicator: QualitativeIndicator['id']; label: string; before: QualitativeIndicator['state']; after: QualitativeIndicator['state']; direction: 'changed' | 'unchanged' | 'became_unknown' };
export type LabChangeDelta = { scenarioId: 'A' | 'B' | 'C'; slotIndex: number; previousCropId: string | null; nextCropId: string | null; changes: LabIndicatorChange[]; evidenceAdded: string[]; evidenceStillMissing: string[] };

export function diffLabSlot(before: LabSlotAssessment, after: LabSlotAssessment): LabChangeDelta {
  const previous = new Map(before.indicators.map((indicator) => [indicator.id, indicator]));
  const changes = after.indicators.filter((indicator) => tracked.has(indicator.id)).map<LabIndicatorChange>((indicator) => {
    const prior = previous.get(indicator.id);
    return { indicator: indicator.id, label: indicator.label, before: prior?.state ?? 'unknown', after: indicator.state, direction: indicator.state === 'unknown' && prior?.state !== 'unknown' ? 'became_unknown' : prior?.state === indicator.state ? 'unchanged' : 'changed' };
  });
  return { scenarioId: after.scenarioId, slotIndex: after.slotIndex, previousCropId: before.cropId, nextCropId: after.cropId, changes, evidenceAdded: after.sourceRefs.filter((source) => !before.sourceRefs.includes(source)), evidenceStillMissing: after.missingEvidence };
}
