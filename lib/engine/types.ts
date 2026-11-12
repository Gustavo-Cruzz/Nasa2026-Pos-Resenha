import type { ClimateContext } from '@/lib/climate/nasa-power';
import type { AnalysisInput } from '@/lib/schema';

export type ValidationLevel = 'climate_exploration' | 'regionally_contextualized' | 'locally_validated';
export type IndicatorState = 'compatible' | 'attention' | 'unknown' | 'yes' | 'no' | 'observed';
export type Explanation = { kind: 'benefit' | 'risk' | 'limitation'; message: string; ruleId: string; sourceRefs: string[]; certainty: 'high' | 'medium' | 'low'; missingData: string[] };
export type QualitativeIndicator = { id: 'thermal_compatibility' | 'historical_precipitation' | 'cover_potential' | 'functional_diversity' | 'soil_context'; label: string; state: IndicatorState; detail: string; sourceRefs: string[] };
export type ProposedCrop = { cropId: string; name: string; plantingMonth: number; durationDays: null; family: string; purposes: string[] };
export type Rotation = { id: 'A' | 'B' | 'C'; title: string; baseline: boolean; baselineAssumed: boolean; horizonMonths: 24; proposedCrop: ProposedCrop | null; validationLevel: ValidationLevel; regionalContextAvailable: boolean; indicators: QualitativeIndicator[]; explanations: Explanation[]; missingData: string[]; unavailable?: boolean };
export type AnalysisResult = { strategies: Rotation[]; climate: ClimateContext; warnings: string[]; input: AnalysisInput; regionalContextAvailable: boolean; disclaimer: string; priorityHighlights: Array<'historical_precipitation' | 'cover_potential' | 'functional_diversity'> };
