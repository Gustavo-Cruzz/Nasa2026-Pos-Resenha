import type { BrazilRegionalContext } from '@/lib/brazil/types';

/**
 * What the Brazil note may say about PAM: `present` shows the production list, `none` says that the identified municipality has no
 * PAM record, and `unknown` says nothing. A context that was not loaded, or a point outside Brazil, is not "no observation".
 */
export function pamNoteState(context: BrazilRegionalContext | null | undefined): 'present' | 'none' | 'unknown' {
  if (!context) return 'unknown';
  if (context.pam) return 'present';
  return context.municipality ? 'none' : 'unknown';
}
