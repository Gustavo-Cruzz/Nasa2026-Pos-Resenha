import { describe, expect, it } from 'vitest';
import { defaultLocale, dictionaries } from '@/lib/i18n';
import { speechLanguage } from '@/lib/speech';

describe('interface language default', () => {
  it('starts in Brazilian Portuguese and keeps English available', () => {
    expect(defaultLocale).toBe('pt-BR');
    expect(Object.keys(dictionaries).sort()).toEqual(['en', 'pt-BR']);
  });

  it('maps the default to the Brazilian Portuguese speech voice', () => {
    expect(speechLanguage(defaultLocale)).toBe('pt-BR');
  });
});
