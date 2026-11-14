import { describe, expect, it } from 'vitest';
import { advance, buildAnalysisInput, chooseSoil, cropChips, greeting, initialState, lookupFailed, mergeSoil, prompt, provideLocation, stepNumber, summarize, type ChatState } from '@/lib/chat/flow';
import type { PlaceMatch } from '@/lib/brazil/places';

const rioVerde: PlaceMatch = { code: '5218805', name: 'Rio Verde', uf: 'GO', latitude: -17.798, longitude: -50.919 };
const say = (state: ChatState, text: string, locale: 'pt-BR' | 'en' = 'pt-BR') => advance(state, text, locale);
const located = (): ChatState => provideLocation(initialState(), [rioVerde], 'Rio Verde, GO', 'pt-BR').state;
const confirm = (): ChatState => ['soja', 'milho', 'Água empoçada', 'só isso'].reduce((state, message) => say(state, message).state, located());

describe('chat registration: the questions', () => {
  it('greets, promises 4 quick questions and asks for the city first, with typing suggestions', () => {
    const replies = greeting('pt-BR');
    expect(replies[0].text).toContain('4 perguntas rápidas');
    expect(replies[1].text).toContain('Comece a digitar');
    expect(replies[1].chips).toEqual(['Rio Verde, GO', 'Sorriso, MT', 'Cascavel, PR']);
    expect(greeting('en')[0].text).toContain('4 quick questions');
  });
  it('asks exactly: city, current crop, previous crop, soil, then confirms', () => {
    const steps = [initialState().step];
    let state = located(); steps.push(state.step);
    for (const answer of ['soja', 'milho', 'Água empoçada', 'só isso']) { state = say(state, answer).state; steps.push(state.step); }
    expect(steps).toEqual(['location', 'current', 'previous', 'soil', 'soil', 'confirm']);
    expect(state.draft).toMatchObject({ location: { latitude: -17.798, longitude: -50.919, label: 'Rio Verde (GO)' }, current: 'soybean', previous: 'maize', soil: { kinds: ['waterlogging'] }, soilDone: true });
    expect(['location', 'current', 'previous', 'soil', 'confirm'].map((step) => stepNumber(step as ChatState['step']))).toEqual([1, 2, 3, 4, 4]);
  });
  it('no longer asks about the planting month, priorities, boundary or water point', () => {
    const texts: string[] = greeting('pt-BR').map((reply) => reply.text);
    let state = located();
    for (const answer of ['soja', 'milho', 'Nada de estranho']) { const turn = say(state, answer); texts.push(...turn.replies.map((reply) => reply.text)); state = turn.state; }
    const all = texts.join(' ').toLowerCase();
    for (const word of ['mês', 'plantar a próxima', 'prioridade', 'contorno', 'geojson', 'poço', 'açude']) expect(all, word).not.toContain(word);
    expect(all).toContain('estranha');
  });
  it('accepts coordinates and the foreign examples without a lookup', () => {
    expect(say(initialState(), '5.6037, -0.187').state.step).toBe('current');
    const accra = say(initialState(), 'Acra, Gana');
    expect(accra.state.draft.location).toMatchObject({ latitude: 5.6037, label: 'Acra, Gana' });
    expect(accra.effects).toEqual([]);
  });
});

describe('chat registration: city lookup', () => {
  it('asks the app to look up anything that is not coordinates', () => {
    const turn = say(initialState(), 'Rio Verde, GO');
    expect(turn.effects).toEqual([{ type: 'lookup', query: 'Rio Verde, GO' }]);
    expect(turn.replies).toEqual([]);
    expect(turn.state.step).toBe('location');
  });
  it('rejects invalid coordinates instead of looking them up', () => {
    const turn = say(initialState(), '95.5, 10.2');
    expect(turn.effects).toEqual([]);
    expect(turn.replies[0].text).toContain('não parecem válidas');
  });
  it('moves on with a single match and labels the city with its state', () => {
    const turn = provideLocation(initialState(), [rioVerde], 'rio verde', 'pt-BR');
    expect(turn.state.step).toBe('current');
    expect(turn.replies[0].text).toBe('Encontrei Rio Verde (GO).');
    expect(turn.replies[1].text).toContain('Qual cultura');
  });
  it('asks which one when several cities match, offering "Name (UF)" chips', () => {
    const matches: PlaceMatch[] = [{ code: '2201200', name: 'Bom Jesus', uf: 'PI', latitude: -9.07, longitude: -44.36 }, { code: '4302105', name: 'Bom Jesus', uf: 'RS', latitude: -28.67, longitude: -50.42 }];
    const turn = provideLocation(initialState(), matches, 'Bom Jesus', 'pt-BR');
    expect(turn.state.step).toBe('location');
    expect(turn.replies[0].chips).toEqual(['Bom Jesus (PI)', 'Bom Jesus (RS)']);
  });
  it('explains when nothing is found and when the lookup fails, never guessing a place', () => {
    const none = provideLocation(initialState(), [], 'Xyzlandia', 'pt-BR');
    expect(none.state.step).toBe('location');
    expect(none.replies[0].text).toContain('Não encontrei "Xyzlandia"');
    expect(lookupFailed(initialState(), 'pt-BR').replies[0].text).toContain('Não consegui buscar');
    expect(provideLocation({ step: 'soil', draft: {} }, [rioVerde], 'x', 'pt-BR').replies).toEqual([]);
  });
});

describe('chat registration: crops and soil', () => {
  it('suggests every crop the app knows, in the chat language', () => {
    expect(cropChips('pt-BR')).toEqual(['soja', 'milho', 'sorgo', 'girassol', 'feijão-caupi', 'feijão-comum', 'arroz de terras altas', 'braquiária-ruziziensis']);
    expect(cropChips('en')).toHaveLength(8);
    expect(prompt('current', {}, 'pt-BR')[0].chips).toEqual(cropChips('pt-BR'));
    expect(prompt('previous', {}, 'en')[0].chips).toEqual([...cropChips('en'), 'skip']);
  });
  it('keeps asking, with the crop list, when a crop is not recognized', () => {
    const turn = say(located(), 'trigo');
    expect(turn.state.step).toBe('current');
    expect(turn.replies[0].text).toContain('Não reconheci a cultura');
    expect(turn.replies[0].chips).toEqual(cropChips('pt-BR'));
  });
  it('lets the previous crop be skipped and keeps the order of the two crops', () => {
    const afterCurrent = say(located(), 'milho').state;
    expect(afterCurrent.step).toBe('previous');
    const skipped = say(afterCurrent, 'primeira vez');
    expect(skipped.state.draft.previous).toBeNull();
    expect(skipped.state.step).toBe('soil');
    expect(say(say(located(), 'milho').state, 'soja').state.draft).toMatchObject({ current: 'maize', previous: 'soybean' });
  });
  it('asks about the soil with one suggestion per kind plus "nothing unusual"', () => {
    const turn = say(say(located(), 'soja').state, 'milho');
    expect(turn.state.step).toBe('soil');
    expect(turn.replies.at(-1)?.text).toContain('Você notou alguma coisa estranha no solo?');
    expect(turn.replies.at(-1)?.chips).toEqual(['Água empoçada', 'Solo duro', 'Erosão', 'Solo rachado', 'Crosta branca', 'Manchas']);
    expect(turn.replies.at(-1)?.multi).toEqual({ finishLabel: 'Nada de estranho' });
    expect(turn.replies.at(-1)?.text).toContain('Marque todas as opções que valem');
  });
  it('records what the producer says without diagnosing, and "nothing unusual" as no observation', () => {
    const atSoil = say(say(located(), 'soja').state, 'milho').state;
    const observed = say(atSoil, 'o solo ficou duro e tem sulcos de enxurrada');
    expect(observed.state.draft.soil).toMatchObject({ kinds: ['compaction', 'erosion'], note: 'o solo ficou duro e tem sulcos de enxurrada' });
    const none = say(atSoil, 'Nada de estranho');
    expect(none.state.draft.soil).toBeNull();
    expect(none.state.step).toBe('confirm');
    const other = say(atSoil, 'tem um cheiro esquisito');
    expect(other.state.draft.soil).toEqual({ kinds: ['other'], note: 'tem um cheiro esquisito' });
    expect(say(atSoil, '   ').replies).toEqual([]);
    expect(say(say(atSoil, 'Água empoçada').state, 'só isso').replies[0].text).toContain('Eu não diagnostico o solo');
  });
  it('lets the producer report more than one soil problem, one at a time, until "só isso"', () => {
    const atSoil = say(say(located(), 'soja').state, 'milho').state;
    const first = say(atSoil, 'Água empoçada');
    expect(first.state.step).toBe('soil');
    expect(first.state.draft.soil).toEqual({ kinds: ['waterlogging'] });
    expect(first.replies.at(-1)?.text).toContain('Quer relatar mais algum problema no solo?');
    expect(first.replies.at(-1)?.chips).toEqual(['Solo duro', 'Erosão', 'Solo rachado', 'Crosta branca', 'Manchas']);
    expect(first.replies.at(-1)?.multi).toEqual({ finishLabel: 'Só isso' });
    const second = say(first.state, 'Solo duro');
    expect(second.state.step).toBe('soil');
    expect(second.state.draft.soil).toEqual({ kinds: ['waterlogging', 'compaction'] });
    expect(second.replies.at(-1)?.chips).toEqual(['Erosão', 'Solo rachado', 'Crosta branca', 'Manchas']);
    const third = say(second.state, 'Erosão');
    expect(third.state.draft.soil).toEqual({ kinds: ['waterlogging', 'compaction', 'erosion'] });
    const done = say(third.state, 'Só isso');
    expect(done.state.step).toBe('confirm');
    expect(done.state.draft).toMatchObject({ soil: { kinds: ['waterlogging', 'compaction', 'erosion'] }, soilDone: true });
    expect(summarize(done.state.draft, 'pt-BR')).toContain('Solo: água empoçada, solo duro ou compactado, erosão');
  });
  it('also accepts several problems in one message, merges repeats and treats "nada" or "não" as done', () => {
    const atSoil = say(say(located(), 'soja').state, 'milho').state;
    const both = say(atSoil, 'o solo está duro e encharcado');
    expect(both.state.draft.soil?.kinds).toEqual(['waterlogging', 'compaction']);
    const again = say(both.state, 'encharcado de novo');
    expect(again.state.draft.soil?.kinds).toEqual(['waterlogging', 'compaction']);
    expect(say(both.state, 'nada').state.step).toBe('confirm');
    expect(say(both.state, 'não').state.step).toBe('confirm');
    const withOther = say(both.state, 'tem um cheiro esquisito');
    expect(withOther.state.draft.soil?.kinds).toEqual(['waterlogging', 'compaction', 'other']);
    expect(withOther.state.draft.soil?.note?.length).toBeLessThanOrEqual(200);
    expect(withOther.state.step).toBe('soil');
    // "no" inside a sentence must not close the question.
    const ant = say(first(), 'tem um formigueiro enorme no meio do talhão');
    expect(ant.state.step).toBe('soil');
    expect(ant.state.draft.soil?.kinds).toEqual(['waterlogging', 'other']);
    function first() { return say(say(say(located(), 'soja').state, 'milho').state, 'Água empoçada').state; }
  });
  it('lets the producer tick several soil problems at once and confirm them together', () => {
    const atSoil = say(say(located(), 'soja').state, 'milho').state;
    const turn = chooseSoil(atSoil, ['Água empoçada', 'Erosão', 'Manchas'], 'pt-BR');
    expect(turn.state.step).toBe('confirm');
    expect(turn.state.draft).toMatchObject({ soil: { kinds: ['waterlogging', 'erosion', 'discoloration'] }, soilDone: true });
    expect(turn.state.draft.soil?.note).toBeUndefined();
    expect(turn.replies[0].text).toContain('Eu não diagnostico o solo');
    expect(summarize(turn.state.draft, 'pt-BR')).toContain('Solo: água empoçada, erosão, manchas');
    expect(buildAnalysisInput(turn.state.draft, 2026, 5)?.soilObservation).toEqual({ kinds: ['waterlogging', 'erosion', 'discoloration'] });
  });
  it('merges ticked options with what was already typed, and ticking none falls back to "nothing unusual"', () => {
    const typed = say(say(say(located(), 'soja').state, 'milho').state, 'tem um formigueiro enorme').state;
    const turn = chooseSoil(typed, ['Solo duro'], 'pt-BR');
    expect(turn.state.draft.soil).toEqual({ kinds: ['compaction', 'other'], note: 'tem um formigueiro enorme' });
    expect(turn.state.step).toBe('confirm');
    const none = chooseSoil(say(say(located(), 'soja').state, 'milho').state, [], 'pt-BR');
    expect(none.state.draft.soil).toBeNull();
    expect(none.state.step).toBe('confirm');
    expect(chooseSoil(confirm(), ['Erosão'], 'pt-BR').replies).toEqual([]);
  });
  it('offers the soil list in English and merges notes without exceeding 200 characters', () => {
    expect(prompt('soil', {}, 'en')[0].multi).toEqual({ finishLabel: 'Nothing unusual' });
    expect(prompt('soil', { soil: { kinds: ['erosion'] } }, 'en')[0].multi).toEqual({ finishLabel: "That's all" });
    expect(prompt('soil', {}, 'en')[0].chips).toEqual(['Standing water', 'Hard soil', 'Erosion', 'Cracked soil', 'White crust', 'Stains']);
    const merged = mergeSoil({ kinds: ['other'], note: 'a'.repeat(150) }, { kinds: ['other'], note: 'b'.repeat(150) });
    expect(merged.note?.length).toBe(200);
    expect(mergeSoil(undefined, { kinds: ['erosion'] })).toEqual({ kinds: ['erosion'] });
    expect(mergeSoil(null, { kinds: ['erosion'] })).toEqual({ kinds: ['erosion'] });
  });
  it('answers in English when asked to', () => {
    const turn = advance(located(), 'soybean', 'en');
    expect(turn.replies[0].text).toBe('Noted: soybean.');
    expect(turn.replies[1].text).toContain('which crop came before');
  });
});

describe('chat registration: confirmation and hand-off to the results page', () => {
  it('summarizes the four answers', () => {
    const text = summarize(confirm().draft, 'pt-BR');
    expect(text).toContain('Rio Verde (GO)');
    expect(text).toContain('Cultura atual: soja');
    expect(text).toContain('Cultura anterior: milho');
    expect(text).toContain('Solo: água empoçada');
    expect(text).not.toContain('Mês');
    expect(summarize(say(say(say(located(), 'soja').state, 'pular').state, 'nada').state.draft, 'en')).toContain('Soil: nothing unusual');
  });
  it('goes to the analysis only after an explicit yes', () => {
    expect(say(confirm(), 'talvez').effects).toEqual([]);
    expect(say(confirm(), 'Ver minha análise').effects).toEqual([{ type: 'go' }]);
    expect(say(confirm(), 'sim').effects).toEqual([{ type: 'go' }]);
  });
  it('lets the user change one answer and returns to the confirmation', () => {
    const ask = say(confirm(), 'Mudar algo');
    expect(ask.replies[0].chips).toEqual(['Mudar a cidade', 'Mudar a cultura atual', 'Mudar a cultura anterior', 'Mudar o solo']);
    const changeSoil = say(confirm(), 'Mudar o solo');
    expect(changeSoil.state.step).toBe('soil');
    expect(changeSoil.state.draft.soil).toBeUndefined();
    expect(changeSoil.replies[0].multi).toEqual({ finishLabel: 'Nada de estranho' });
    expect(say(confirm(), 'Mudar a cultura anterior').state.step).toBe('previous');
    expect(say(confirm(), 'mudar a cultura atual').state.step).toBe('current');
    expect(say(confirm(), 'Mudar a cidade').state.step).toBe('location');
    const back = say(say(say(confirm(), 'Mudar o solo').state, 'Erosão').state, 'só isso');
    expect(back.state.step).toBe('confirm');
    expect(back.state.draft.soil).toEqual({ kinds: ['erosion'] });
    expect(back.replies.at(-1)?.text).toContain('Tudo certo?');
  });
  it('restarts and shows help from any step', () => {
    const turn = say(confirm(), 'recomeçar');
    expect(turn.effects).toEqual([{ type: 'restart' }]);
    expect(turn.state).toEqual(initialState());
    expect(say(initialState(), 'ajuda').replies[0].text).toContain('só cadastro');
  });
});

describe('analysis input from the registration', () => {
  it('orders the two crops in consecutive years, uses the current month as the climate window and equal priorities', () => {
    expect(buildAnalysisInput(confirm().draft, 2026, 11)).toMatchObject({
      location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 11, irrigation: 'unknown', priorities: { water: 1, soil: 1, operations: 1 },
      history: [{ cropId: 'maize', startYearMonth: '2025-01', endYearMonth: '2025-12' }, { cropId: 'soybean', startYearMonth: '2026-01', endYearMonth: '2026-12' }],
      soilObservation: { kinds: ['waterlogging'] },
    });
  });
  it('defaults the climate window to the current calendar month', () => {
    expect(buildAnalysisInput(confirm().draft)?.plantingMonth).toBe(new Date().getMonth() + 1);
  });
  it('works with only the current crop and no soil observation, and rejects an incomplete draft', () => {
    const state = say(say(say(located(), 'soja').state, 'pular').state, 'nada').state;
    const input = buildAnalysisInput(state.draft, 2026, 3);
    expect(input?.history).toEqual([{ cropId: 'soybean', startYearMonth: '2026-01', endYearMonth: '2026-12' }]);
    expect(input?.soilObservation).toBeUndefined();
    expect(buildAnalysisInput({}, 2026, 3)).toBeUndefined();
    expect(buildAnalysisInput({ location: { latitude: 1, longitude: 2 } }, 2026, 3)).toBeUndefined();
  });
});
