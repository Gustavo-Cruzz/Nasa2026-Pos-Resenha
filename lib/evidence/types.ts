import type { ValidationLevel } from '@/lib/engine/types';
import type { SourceHealth } from '@/lib/source-health';

export type EvidenceSource = { id: string; kind: 'nasa' | 'farmer' | 'catalog' | 'regional'; title: string; status: 'available' | 'partial' | 'unavailable'; scope: 'global' | 'municipal' | 'user_supplied'; url: string | null; period: string | null; coveragePct: number | null };
export type EvidenceClaim = { id: string; scenarioId: 'A' | 'B' | 'C' | null; slotIndex: number | null; indicatorId: string; label: string; observation: string; ruleId: string; result: string; status: 'supported' | 'partial' | 'missing'; validationLevel: ValidationLevel; sourceIds: string[]; missingData: string[] };
export type EvidenceGap = { id: string; label: string; scenarioIds: Array<'A' | 'B' | 'C'> };
export type EvidenceManifest = { sources: EvidenceSource[]; claims: EvidenceClaim[]; gaps: EvidenceGap[]; guardrails: string[]; sourceHealth: SourceHealth[] };
export type EvidenceFilter = { scenarioId?: 'A' | 'B' | 'C'; slotIndex?: number; indicatorId?: string };
