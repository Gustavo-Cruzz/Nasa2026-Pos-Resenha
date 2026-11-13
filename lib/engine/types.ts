import type { ClimateContext } from '@/lib/climate/nasa-power';
import type { AnalysisInput } from '@/lib/schema';
import type { BrazilRegionalContext } from '@/lib/brazil/types';
import type { LabSlotAssessment } from '@/lib/lab/assessment';
import type { EvidenceManifest } from '@/lib/evidence/types';

export type ValidationLevel = 'climate_exploration' | 'regionally_contextualized' | 'locally_validated';
export type IndicatorState = 'compatible' | 'attention' | 'unknown' | 'yes' | 'no' | 'observed';
export type Explanation = { kind: 'benefit' | 'risk' | 'limitation'; message: string; ruleId: string; sourceRefs: string[]; certainty: 'high' | 'medium' | 'low'; missingData: string[] };
export type QualitativeIndicator = { id: 'thermal_compatibility' | 'historical_precipitation' | 'rainfall_distribution' | 'root_zone_wetness' | 'cover_potential' | 'functional_diversity' | 'soil_context'; label: string; state: IndicatorState; detail: string; sourceRefs: string[] };
export type ProposedCrop = { cropId: string; name: string; plantingMonth: number; durationDays: null; family: string; purposes: string[] };
export type Rotation = { id: 'A' | 'B' | 'C'; title: string; baseline: boolean; baselineAssumed: boolean; horizonMonths: 24; proposedCrop: ProposedCrop | null; validationLevel: ValidationLevel; regionalContextAvailable: boolean; indicators: QualitativeIndicator[]; slots: LabSlotAssessment[]; configuredSlots: number; explanations: Explanation[]; missingData: string[]; unavailable?: boolean };
export type NasaInsightStatus = 'contrast' | 'shared_signal' | 'observational' | 'unknown';
export type NasaInsightEffect = { scenarioId: 'A' | 'B' | 'C'; cropId: string | null; cropName: string | null; state: 'compatible' | 'attention' | 'unknown' | 'observed'; ruleId: 'DOCUMENTED_THERMAL_RANGE' | 'HISTORICAL_PRECIPITATION_ONLY' | 'MISSING_CLIMATE_EVIDENCE'; documentedRangeC: { min: number; max: number } | null; sourceRefs: string[] };
export type NasaInsight = { status: NasaInsightStatus; month: number; metric: 'temperature' | 'precipitation' | 'unavailable'; observedValue: number | null; unit: '°C' | 'mm' | null; period: { start: string; end: string } | null; coveragePct: number | null; changesComparison: boolean; effects: NasaInsightEffect[]; limitations: string[]; sourceUrl: string | null };
export type AnalysisResult = { strategies: Rotation[]; climate: ClimateContext; regionalContext: BrazilRegionalContext; warnings: string[]; input: AnalysisInput; regionalContextAvailable: boolean; disclaimer: string; priorityHighlights: Array<'root_zone_wetness' | 'cover_potential' | 'functional_diversity'>; nasaInsight: NasaInsight; nasaInsightByMonth: NasaInsight[]; evidenceManifest: EvidenceManifest };
