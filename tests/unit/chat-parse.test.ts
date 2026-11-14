import { describe, expect, it } from 'vitest';
import { detectCommand, findCrop, isDone, isSkip, normalize, parseLocation, parseSoilAnswer, parseYesNo } from '@/lib/chat/parse';
import { cropChips } from '@/lib/chat/flow';

describe('chat parsers: coordinates and foreign examples', () => {
  it('reads coordinates in the common notations', () => {
    expect(parseLocation('-17.798, -50.919')).toEqual({ latitude: -17.798, longitude: -50.919 });
    expect(parseLocation('minha fazenda fica em -17,798 -50,919')).toEqual({ latitude: -17.798, longitude: -50.919 });
    expect(parseLocation('−17.798;−50.919')).toEqual({ latitude: -17.798, longitude: -50.919 });
    expect(parseLocation('17.798 S, 50.919 W')).toEqual({ latitude: -17.798, longitude: -50.919 });
    expect(parseLocation('50.919 W 17.798 S')).toEqual({ latitude: -17.798, longitude: -50.919 });
    expect(parseLocation('5.6037, -0.187')).toEqual({ latitude: 5.6037, longitude: -0.187 });
  });
  it('recognizes only the foreign example places by name; Brazilian cities go to the city lookup', () => {
    expect(parseLocation('Acra, Gana')).toMatchObject({ latitude: 5.6037 });
    expect(parseLocation('Accra, Ghana')).toMatchObject({ latitude: 5.6037 });
    expect(parseLocation('Nova Délhi')).toMatchObject({ latitude: 28.6139 });
    expect(parseLocation('new delhi')).toMatchObject({ longitude: 77.209 });
    expect(parseLocation('Rio Verde, GO')).toBeUndefined();
    expect(parseLocation('Sorriso, MT')).toBeUndefined();
  });
  it('rejects out-of-range numbers instead of guessing', () => {
    expect(parseLocation('95.5, 10.2')).toBeUndefined();
    expect(parseLocation('10.2, 200.5')).toBeUndefined();
    expect(parseLocation('')).toBeUndefined();
  });
});

describe('chat parsers: crops', () => {
  it('maps crop names, preferring the longest alias', () => {
    expect(findCrop('feijão-caupi')).toBe('cowpea');
    expect(findCrop('feijao caupi')).toBe('cowpea');
    expect(findCrop('feijão')).toBe('common_bean');
    expect(findCrop('corn')).toBe('maize');
    expect(findCrop('Soja 2024')).toBe('soybean');
    expect(findCrop('braquiária')).toBe('ruziziensis');
    expect(findCrop('trigo')).toBeUndefined();
  });
  it('every crop suggestion, in either language, is read back as its own crop', () => {
    const ids = ['soybean', 'maize', 'sorghum', 'sunflower', 'cowpea', 'common_bean', 'upland_rice', 'ruziziensis'];
    for (const locale of ['pt-BR', 'en'] as const) expect(cropChips(locale).map((chip) => findCrop(chip)), locale).toEqual(ids);
  });
});

describe('chat parsers: soil observation', () => {
  it('maps what the producer describes to kinds and keeps their words as the note', () => {
    expect(parseSoilAnswer('Água empoçada')).toEqual({ kind: 'observed', observation: { kinds: ['waterlogging'] } });
    expect(parseSoilAnswer('empoça água depois da chuva')).toEqual({ kind: 'observed', observation: { kinds: ['waterlogging'], note: 'empoça água depois da chuva' } });
    expect(parseSoilAnswer('o solo ficou duro e tem sulcos de enxurrada')).toMatchObject({ kind: 'observed', observation: { kinds: ['compaction', 'erosion'] } });
    expect(parseSoilAnswer('Solo rachado')).toMatchObject({ observation: { kinds: ['dry_cracked'] } });
    expect(parseSoilAnswer('Crosta branca')).toMatchObject({ observation: { kinds: ['salt_crust'] } });
    expect(parseSoilAnswer('Manchas')).toMatchObject({ observation: { kinds: ['discoloration'] } });
    expect(parseSoilAnswer('Erosion')).toMatchObject({ observation: { kinds: ['erosion'] } });
    expect(parseSoilAnswer('Standing water after rain')).toMatchObject({ observation: { kinds: ['waterlogging'] } });
  });
  it('keeps anything else as an "other" note instead of interpreting or discarding it', () => {
    expect(parseSoilAnswer('tem um cheiro esquisito')).toEqual({ kind: 'observed', observation: { kinds: ['other'], note: 'tem um cheiro esquisito' } });
    expect(parseSoilAnswer('x'.repeat(300))?.kind).toBe('observed');
    const long = parseSoilAnswer('x'.repeat(300));
    expect(long?.kind === 'observed' ? long.observation.note?.length : undefined).toBe(200);
  });
  it('reads "that is all" when the producer has no more problems to add', () => {
    for (const text of ['só isso', 'Só isso', "That's all", 'pronto', 'nada mais', 'não', 'done']) expect(isDone(text), text).toBe(true);
    expect(isDone('solo duro')).toBe(false);
    expect(isDone('erosão')).toBe(false);
    expect(isDone('Só isso, obrigado.')).toBe(true);
    expect(isDone('tem um formigueiro enorme no meio do talhão')).toBe(false);
    expect(isDone('no meio do talhão tem erosão')).toBe(false);
    expect(isDone('não, mas tem erosão')).toBe(false);
  });
  it('reads "nothing unusual" and skip', () => {
    for (const text of ['Nada de estranho', 'nada', 'não', 'normal', 'Nothing unusual', 'none', 'pular', 'skip']) expect(parseSoilAnswer(text), text).toEqual({ kind: 'none' });
    expect(parseSoilAnswer('   ')).toBeUndefined();
  });
});

describe('chat parsers: small answers and commands', () => {
  it('reads yes/no and skip', () => {
    expect(parseYesNo('sim, pode analisar')).toBe('yes');
    expect(parseYesNo('Ver minha análise')).toBe('yes');
    expect(parseYesNo('See my analysis')).toBe('yes');
    expect(parseYesNo('não')).toBe('no');
    expect(parseYesNo('talvez')).toBeUndefined();
    for (const text of ['pular', 'skip', 'não sei', 'primeira vez', 'não lembro', 'nenhuma']) expect(isSkip(text), text).toBe(true);
    expect(isSkip('milho')).toBe(false);
  });
  it('detects restart and help only', () => {
    expect(detectCommand('recomeçar')).toBe('restart');
    expect(detectCommand('start over')).toBe('restart');
    expect(detectCommand('ajuda')).toBe('help');
    expect(detectCommand('calendário')).toBeUndefined();
    expect(detectCommand('bom dia')).toBeUndefined();
  });
  it('normalizes accents and the unicode minus', () => {
    expect(normalize('  Água  −3 ')).toBe('agua -3');
  });
});
