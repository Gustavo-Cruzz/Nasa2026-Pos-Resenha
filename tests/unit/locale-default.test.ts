import { describe, expect, it } from 'vitest';
import { defaultLocale, dictionaries } from '@/lib/i18n';
import { speechLanguage } from '@/lib/speech';

describe('interface language default', () => {
  it('starts in English and keeps pt-BR available', () => {
    expect(defaultLocale).toBe('en');
    expect(Object.keys(dictionaries).sort()).toEqual(['en', 'pt-BR']);
  });

  it('maps the default to the English speech voice', () => {
    expect(speechLanguage(defaultLocale)).toBe('en-US');
  });
});
