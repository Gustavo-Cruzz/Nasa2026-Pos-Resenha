import { describe, expect, it } from 'vitest';
import { familyLabel, formatYearMonth, rotationRead } from '@/lib/farm/rotation';
import { advance, buildAnalysisInput, prompt, type ChatState } from '@/lib/chat/flow';

describe('rotation read', () => {
  it('says alternates when every consecutive pair differs, repeats when two in a row match, unknown when too little is known', () => {
    expect(rotationRead(['Poaceae', 'Fabaceae', 'Poaceae'])).toBe('alternates');
    expect(rotationRead(['Fabaceae', 'Fabaceae'])).toBe('repeats');
    expect(rotationRead(['Poaceae', 'Fabaceae', 'Fabaceae'])).toBe('repeats');
    expect(rotationRead(['Poaceae'])).toBe('unknown');
    expect(rotationRead([undefined, 'Poaceae'])).toBe('unknown');
  });
  it('names legumes and grasses in plain words and keeps other families as they are', () => {
    expect(familyLabel('Fabaceae', 'pt-BR')).toBe('Leguminosa');
    expect(familyLabel('Poaceae', 'en')).toBe('Grass');
    expect(familyLabel('Asteraceae', 'pt-BR')).toBe('Asteraceae');
    expect(familyLabel(undefined, 'pt-BR')).toBe('Família desconhecida');
  });
  it('formats a year-month, and leaves anything else alone', () => {
    expect(formatYearMonth('2023-10', 'pt-BR')).toBe('out/2023');
    expect(formatYearMonth('2024-02', 'en')).toBe('Feb 2024');
    expect(formatYearMonth('amanhã', 'pt-BR')).toBe('amanhã');
  });
});

describe('chat: finish analysis setup', () => {
  const confirm: ChatState = { step: 'confirm', draft: { location: { latitude: -17.798, longitude: -50.919, label: 'Rio Verde (GO)' }, current: 'soybean', previous: 'maize', soil: null, soilDone: true } };

  it('offers only analysis or answer editing at the confirm step', () => {
    const chips = prompt('confirm', confirm.draft, 'pt-BR').at(-1)?.chips ?? [];
    expect(chips).toEqual(['Ver minha análise', 'Mudar algo']);
    expect(prompt('confirm', confirm.draft, 'en').at(-1)?.chips).toEqual(['See my analysis', 'Change something']);
    expect(prompt('confirm', confirm.draft, 'pt-BR').at(-1)?.text).toContain('Na próxima tela, eu vou comparar três caminhos de rotação');
  });
  it('opens the analysis directly after confirmation', () => {
    expect(advance(confirm, 'Ver minha análise', 'pt-BR').effects).toEqual([{ type: 'go' }]);
  });
  it('keeps a valid analysis input', () => {
    expect(buildAnalysisInput(confirm.draft)).toMatchObject({ location: { latitude: -17.798 }, irrigation: expect.any(String) });
  });
});
