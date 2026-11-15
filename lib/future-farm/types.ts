/**
 * Future Farm Stories visual contract, adapted from the supplied
 * `integration/future-farm.types.ts`. Visuals illustrate the crop
 * configuration only; they never encode predicted yield, soil health or water.
 */
import type { ValidationLevel } from '@/lib/engine/types';

export type ScenarioId = 'A' | 'B' | 'C';
export type EvidenceLevel = ValidationLevel;
export type SceneMode = 'illustrative' | 'historical_context' | 'forecast_context';
export type CropRole = 'primary' | 'intercrop';

export interface CropPresence {
  /** Canonical catalogue ID exactly as persisted; never inferred from an image. */
  cropId: string;
  label: string;
  role: CropRole;
  /** False when the ID is not in the catalogue: the name stays visible and the sprite is the generic fallback. */
  known: boolean;
  /** Declared cropping system that contributed this crop (intercrops only). */
  systemPlotId?: string;
}

export interface EvidenceLink { title: string; url: string }

export type CycleWeather = 'drought' | 'rain' | 'neutral' | 'unknown';
/** Per-window climate context behind the scene's rain/drought layer. Historical medians, never a forecast. */
export interface CycleClimate {
  /** Accumulated median P-ET0 over the crop's own window (mm); null = N/D. */
  waterBalanceMm: number | null;
  /** drought: P-ET0 deficit; rain: surplus; neutral: within the tolerance band; unknown: no data (no weather drawn). */
  weather: CycleWeather;
  frost: 'attention' | 'observed' | 'unknown';
  /** Localised reading of the P-ET0 window indicator, or null when absent. */
  waterDetail: string | null;
  frostDetail: string | null;
}

export interface FarmCycleView {
  /** Stable across edits: scenario + original slot index. */
  id: string;
  /** Original 0-based slot index (0..3); gaps are preserved, never filled. */
  index: number;
  /** "Ano 1 · A" style period, from the existing laboratory slot. */
  period: { year: 1 | 2; season: 'A' | 'B' } | null;
  crops: CropPresence[];
  /** Documented purposes and family from the catalogue, per crop. */
  functions: Array<{ cropId: string; purposes: string[]; family: string | null }>;
  /** Sequence justification drawn from the functional-diversity indicator. */
  sequenceNote: string | null;
  potentialBenefits: string[];
  risksAndUnknowns: string[];
  missingData: string[];
  evidenceLevel: EvidenceLevel | null;
  evidenceLinks: EvidenceLink[];
  intercropNotes: string[];
  /** True when the farmer changed this cycle after the last analysis: evidence is withheld, not guessed. */
  evidenceStale: boolean;
  sceneMode: SceneMode;
  /** Real per-window climate; null when the evidence is stale or missing. */
  climate: CycleClimate | null;
  /** Always null: no implied soil or crop condition. */
  measuredFieldCondition: null;
}

export interface FarmScenarioView {
  id: ScenarioId;
  title: string;
  scenarioNotes: string[];
  scenarioMissingData: string[];
  cycles: FarmCycleView[];
  /** Trade-offs against scenario A from the engine (Ganha / Perde / Não sabemos); empty when not computed. */
  tradeoffs: { gains: string[]; losses: string[]; unknowns: string[] };
  /** 24-month bare-soil and erosion screening reading; null when not computed. */
  bareSoilNote: string | null;
  demoOnly: boolean;
}

export const FARM_SCENE_DISCLAIMER = {
  'pt-BR': 'Visualização ilustrativa da configuração de culturas; não representa produtividade ou condição real do campo.',
  en: 'Illustrative visualization of the crop configuration; it does not represent yield or actual field conditions.',
} as const;
