import type { AnalysisInput } from '@/lib/schema';

export type Scope = 'pilot_recommendation' | 'global_climate_only';
export type Feasibility = 'pass' | 'warn' | 'fail' | 'unknown';
export type Explanation = { kind: 'benefit' | 'risk' | 'limitation'; message: string; ruleId: string; sourceRefs: string[]; certainty: 'high' | 'medium' | 'low'; missingData: string[] };
export type Rotation = { id: 'A' | 'B' | 'C'; title: string; baseline: boolean; baselineAssumed: boolean; horizonMonths: 24; timeline: Array<{ cropIds: string[]; startYearMonth: string; endYearMonth: string; mode: 'single' | 'intercrop' | 'cover' }>; feasibility: Feasibility; score: number | null; metrics: Array<{ id: string; value: number | null; unit?: string; relative: boolean; evidenceRefs: string[] }>; explanations: Explanation[]; missingData: string[]; unavailable?: boolean };
export type AnalysisResult = { scope: Scope; strategies: Rotation[]; warnings: string[]; input: AnalysisInput };
