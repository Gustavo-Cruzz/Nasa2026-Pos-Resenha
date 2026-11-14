import { describe, expect, it } from 'vitest';
import { pamNoteState } from '@/lib/brazil/pam-note';
import { resolveBrazilRegionalContext } from '@/lib/brazil/context';

describe('what the Brazil note says about PAM', () => {
  it('says nothing when the context was not loaded or the point is outside Brazil', () => {
    expect(pamNoteState(undefined)).toBe('unknown');
    expect(pamNoteState(null)).toBe('unknown');
    expect(pamNoteState(resolveBrazilRegionalContext({ latitude: 5.6037, longitude: -0.187 }))).toBe('unknown');
  });
  it('shows the production list for Rio Verde, which has PAM records', () => {
    expect(pamNoteState(resolveBrazilRegionalContext({ latitude: -17.798, longitude: -50.919 }))).toBe('present');
  });
  it('reports "no PAM record" only for an identified municipality without one', () => {
    const base = resolveBrazilRegionalContext({ latitude: -17.798, longitude: -50.919 });
    expect(pamNoteState({ ...base, pam: null })).toBe('none');
    expect(pamNoteState({ ...base, pam: null, municipality: null })).toBe('unknown');
  });
});
