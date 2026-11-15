import type { AnalysisInput } from '@/lib/schema';

/** What the registration still lacks. Each gap is something the user can still tell us; none of them blocks the registration. */
export type RegistrationGap = 'previous_crop' | 'water' | 'area';

const FIELDS: ReadonlyArray<readonly [RegistrationGap, (input: AnalysisInput) => boolean]> = [
  ['previous_crop', (input) => input.history.length < 2],
  ['water', (input) => input.irrigation === 'unknown'],
  ['area', (input) => !input.fieldBoundary || input.fieldBoundary.length < 3],
];

export function registrationGaps(input: AnalysisInput): RegistrationGap[] {
  return FIELDS.filter(([, missing]) => missing(input)).map(([gap]) => gap);
}

/** Total number of items the completeness line counts, and how many are filled in. */
export function registrationProgress(input: AnalysisInput): { filled: number; total: number } {
  return { filled: FIELDS.length - registrationGaps(input).length, total: FIELDS.length };
}

export const GAP_LABEL: Record<RegistrationGap, { 'pt-BR': string; en: string }> = {
  previous_crop: { 'pt-BR': 'cultura anterior', en: 'previous crop' },
  water: { 'pt-BR': 'como a lavoura recebe água', en: 'how the crop gets water' },
  area: { 'pt-BR': 'área desenhada no mapa', en: 'area drawn on the map' },
};
