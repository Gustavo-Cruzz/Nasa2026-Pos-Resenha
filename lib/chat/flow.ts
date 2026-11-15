import { analysisInputSchema, soilObservationKinds, type AnalysisInput, type SoilObservation } from '@/lib/schema';
import { cropDisplayName } from '@/lib/presentation';
import { detectCommand, findCrop, isDone, isSkip, normalize, parseLocation, parseSoilAnswer, parseYesNo, SOIL_CHIP_LABELS, type PlaceResult } from '@/lib/chat/parse';
import type { PlaceMatch } from '@/lib/brazil/places';

type Locale = 'pt-BR' | 'en';
/** The chat only registers the farm; the analysis is presented on the results page. */
export type Step = 'location' | 'current' | 'previous' | 'soil' | 'confirm';
/** `soil`: undefined = not asked yet, null = nothing unusual, otherwise the problems reported so far; `soilDone` closes the "anything else?" loop. */
export type ChatDraft = { location?: PlaceResult; current?: string; previous?: string | null; soil?: SoilObservation | null; soilDone?: boolean };
export type ChatState = { step: Step; draft: ChatDraft };
/** `multi`: the chips can be ticked several at a time; `finishLabel` is the button shown while none is ticked (with some ticked it confirms them). */
export type Reply = { text: string; chips?: string[]; multi?: { finishLabel: string } };
export type Effect = { type: 'lookup'; query: string } | { type: 'go' } | { type: 'restart' };
export type Turn = { state: ChatState; replies: Reply[]; effects: Effect[] };
export const TOTAL_STEPS = 4;

export const initialState = (): ChatState => ({ step: 'location', draft: {} });

const pick = (locale: Locale, pt: string, en: string) => (locale === 'en' ? en : pt);
const crop = (id: string | undefined | null, locale: Locale) => cropDisplayName(id, null, locale);
/** Every crop the app knows, named in the chat language, so each suggestion is a valid answer. */
const CHIP_ORDER = ['soybean', 'maize', 'sorghum', 'sunflower', 'cowpea', 'common_bean', 'upland_rice', 'ruziziensis'] as const;
export const cropChips = (locale: Locale) => CHIP_ORDER.map((id) => crop(id, locale));
const reply = (text: string, chips?: string[], multi?: Reply['multi']): Reply => ({ text, ...(chips ? { chips } : {}), ...(multi ? { multi } : {}) });

const SOIL_LABEL = { 'pt-BR': { waterlogging: 'água empoçada', compaction: 'solo duro ou compactado', erosion: 'erosão', dry_cracked: 'solo muito seco ou rachado', salt_crust: 'crosta esbranquiçada', discoloration: 'manchas ou cor estranha', other: 'outro' }, en: { waterlogging: 'standing water', compaction: 'hard or compacted soil', erosion: 'erosion', dry_cracked: 'very dry or cracked soil', salt_crust: 'whitish crust', discoloration: 'stains or odd color', other: 'other' } } as const;
type ChipKind = Exclude<(typeof soilObservationKinds)[number], 'other'>;
const CHIP_KINDS: ChipKind[] = ['waterlogging', 'compaction', 'erosion', 'dry_cracked', 'salt_crust', 'discoloration'];
const soilChipLabel = (kind: ChipKind, locale: Locale) => SOIL_CHIP_LABELS[kind][locale];
/** Tickable chips: every kind at first, afterwards only the kinds not reported yet. The finish label is "nothing unusual" / "that's all". */
const soilChips = (locale: Locale, reported: SoilObservation | null | undefined): { chips: string[]; multi: NonNullable<Reply['multi']> } => ({
  chips: CHIP_KINDS.filter((kind) => !reported?.kinds.includes(kind)).map((kind) => soilChipLabel(kind, locale)),
  multi: { finishLabel: reported ? pick(locale, 'Só isso', "That's all") : pick(locale, 'Nada de estranho', 'Nothing unusual') },
});

/** Adds a new answer to the problems already reported: kinds are united, notes joined and cut at 200 characters. */
export function mergeSoil(current: SoilObservation | null | undefined, added: SoilObservation): SoilObservation {
  if (!current) return added;
  const kinds = soilObservationKinds.filter((kind) => current.kinds.includes(kind) || added.kinds.includes(kind));
  const notes = [current.note, added.note].filter((note): note is string => Boolean(note));
  const note = [...new Set(notes)].join('; ').slice(0, 200);
  return { kinds, ...(note ? { note } : {}) };
}

function nextStep(draft: ChatDraft): Step {
  if (!draft.location) return 'location';
  if (!draft.current) return 'current';
  if (draft.previous === undefined) return 'previous';
  if (draft.soil === undefined || (draft.soil && !draft.soilDone)) return 'soil';
  return 'confirm';
}

export function stepNumber(step: Step): number { return { location: 1, current: 2, previous: 3, soil: 4, confirm: 4 }[step]; }

export function greeting(locale: Locale): Reply[] {
  return [reply(pick(locale, 'Oi! Eu sou o João.\nQuero te ajudar a proteger a sua colheita.', 'Hi! I am João.\nI want to help you protect your harvest.')), ...prompt('location', {}, locale)];
}

/** Chat opened from the explorer with the place already chosen: the city question is skipped. */
export function startWithLocation(place: PlaceResult, locale: Locale): Turn {
  const draft: ChatDraft = { location: place };
  const where = place.label ?? `${place.latitude}, ${place.longitude}`;
  return { state: { step: nextStep(draft), draft }, replies: [greeting(locale)[0], reply(pick(locale, `Anotado: ${where}.`, `Noted: ${where}.`)), ...prompt(nextStep(draft), draft, locale)], effects: [] };
}

export function prompt(step: Step, draft: ChatDraft, locale: Locale): Reply[] {
  switch (step) {
    case 'location': return [reply(pick(locale, 'Em que cidade fica a sua fazenda?\nComece a digitar e escolha na lista. Fora do Brasil, envie latitude e longitude.', 'Which city is your farm in?\nStart typing and pick from the list. Outside Brazil, send latitude and longitude.'))];
    case 'current': return [reply(pick(locale, 'O que você está plantando agora?', 'What are you growing now?'), cropChips(locale))];
    case 'previous': return [reply(pick(locale, 'E o que você plantou antes?\nSe não lembra, toque em "pular".', 'And what did you grow before?\nIf you do not remember, tap "skip".'), [...cropChips(locale), pick(locale, 'pular', 'skip')])];
    case 'soil': {
      const { chips, multi } = soilChips(locale, draft.soil);
      return draft.soil
        ? [reply(pick(locale, `Anotei: ${soilList(draft.soil, locale)}.\nMais alguma coisa no solo?`, `Noted: ${soilList(draft.soil, locale)}.\nAnything else in the soil?`), chips, multi)]
        : [reply(pick(locale, 'Você notou alguma coisa estranha no solo?\nMarque o que valer, ou escreva do seu jeito.', 'Have you noticed anything unusual in the soil?\nTick what applies, or write it your way.'), chips, multi)];
    }
    case 'confirm': return [reply(`${summarize(draft, locale)}\n\n${pick(locale, 'Tudo certo?', 'All good?')}`, [pick(locale, 'Ver minha análise', 'See my analysis'), pick(locale, 'Mudar algo', 'Change something')])];
  }
}

function soilList(soil: SoilObservation, locale: Locale): string {
  return soil.kinds.map((kind) => SOIL_LABEL[locale][kind]).join(', ') + (soil.note && soil.kinds.includes('other') ? ` (“${soil.note}”)` : '');
}

export function summarize(draft: ChatDraft, locale: Locale): string {
  const soil = draft.soil ? soilList(draft.soil, locale) : pick(locale, 'nada de estranho', 'nothing unusual');
  return [
    pick(locale, 'Sua fazenda:', 'Your farm:'),
    `• ${pick(locale, 'Local', 'Location')}: ${draft.location ? (draft.location.label ?? `${draft.location.latitude}, ${draft.location.longitude}`) : 'N/D'}`,
    `• ${pick(locale, 'Cultura atual', 'Current crop')}: ${draft.current ? crop(draft.current, locale) : 'N/D'}`,
    `• ${pick(locale, 'Cultura anterior', 'Previous crop')}: ${draft.previous ? crop(draft.previous, locale) : pick(locale, 'não informada', 'not informed')}`,
    `• ${pick(locale, 'Solo', 'Soil')}: ${soil}`,
  ].join('\n');
}

/**
 * Draft to the validated analysis input. Only the ORDER of the two crops is known, so they are stored as whole-year events in
 * consecutive years ending in `year`; the analysis uses the order (last crop, its family), never the dates. Priorities are equal.
 * The climate window is the current calendar month (`month`); the results page lets the reader explore any other month.
 */
export function buildAnalysisInput(draft: ChatDraft, year = new Date().getFullYear(), month = new Date().getMonth() + 1): AnalysisInput | undefined {
  if (!draft.location || !draft.current) return undefined;
  const events = [...(draft.previous ? [{ cropId: draft.previous, startYearMonth: `${year - 1}-01`, endYearMonth: `${year - 1}-12` }] : []), { cropId: draft.current, startYearMonth: `${year}-01`, endYearMonth: `${year}-12` }];
  const parsed = analysisInputSchema.safeParse({ location: { latitude: draft.location.latitude, longitude: draft.location.longitude }, ...(draft.soil ? { soilObservation: draft.soil } : {}), plantingMonth: month, history: events, priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown' });
  return parsed.success ? parsed.data : undefined;
}

export function helpText(locale: Locale): string {
  return pick(locale, 'Eu só cadastro a sua fazenda: cidade, o que planta, o que plantou antes e o solo.\nDiga "recomeçar" para começar de novo ou "mudar a cidade" para corrigir uma resposta.', 'I only register your farm: city, current crop, previous crop and soil.\nSay "restart" to start over, or "change the city" to fix an answer.');
}

const CHANGE_TARGETS: Array<[RegExp, Step]> = [[/\b(local|location|cidade|city|lugar)\b/, 'location'], [/\b(anterior|previous|before)\b/, 'previous'], [/\b(solo|soil|observacao|observation)\b/, 'soil'], [/\b(atual|current|agora|now|cultura|crop)\b/, 'current']];
function changeTarget(text: string): Step | undefined {
  const t = normalize(text);
  if (!/\b(mudar|trocar|alterar|corrigir|editar|change|edit|fix|update)\b/.test(t)) return undefined;
  return CHANGE_TARGETS.find(([pattern]) => pattern.test(t))?.[1];
}

function goTo(draft: ChatDraft, locale: Locale, lead?: Reply): Turn {
  const step = nextStep(draft);
  return { state: { step, draft }, replies: [...(lead ? [lead] : []), ...prompt(step, draft, locale)], effects: [] };
}

/** One conversational turn: reads the text for the current step and returns the next state, the bot's replies and UI effects. */
export function advance(state: ChatState, rawText: string, locale: Locale): Turn {
  const text = rawText.trim();
  const keep = (replies: Reply[], effects: Effect[] = []): Turn => ({ state, replies, effects });
  if (!text) return keep([]);
  const command = detectCommand(text);
  if (command === 'restart') return { state: initialState(), replies: [reply(pick(locale, 'Vamos recomeçar.', 'Let us start over.')), ...prompt('location', {}, locale)], effects: [{ type: 'restart' }] };
  if (command === 'help') return keep([reply(helpText(locale))]);

  if (state.step === 'confirm') {
    const target = changeTarget(text);
    if (target) { const draft = target === 'soil' ? { ...state.draft, soil: undefined, soilDone: false } : state.draft; return { state: { step: target, draft }, replies: prompt(target, draft, locale), effects: [] }; }
    if (parseYesNo(text) === 'yes') return { state, replies: [reply(pick(locale, 'Pronto! Abrindo a sua análise…', 'Done! Opening your analysis…'))], effects: [{ type: 'go' }] };
    if (/\b(mudar|change|algo|something|nao|no)\b/.test(normalize(text))) return keep([reply(pick(locale, 'O que você quer mudar?', 'What do you want to change?'), [pick(locale, 'Mudar a cidade', 'Change the city'), pick(locale, 'Mudar a cultura atual', 'Change the current crop'), pick(locale, 'Mudar a cultura anterior', 'Change the previous crop'), pick(locale, 'Mudar o solo', 'Change the soil')])]);
    const ok = [pick(locale, 'Ver minha análise', 'See my analysis'), pick(locale, 'Mudar algo', 'Change something')];
    if (/\b(plantar|adicionar|incluir|quero|want|plant|add)\b/.test(normalize(text))) return keep([reply(pick(locale, 'Por enquanto eu só registro o que você já plantou.\nNa análise você compara as opções de cultura.', 'For now I only register what you have already grown.\nIn the analysis you compare crop options.'), ok)]);
    return keep([reply(pick(locale, 'Não entendi.\nToque em "Ver minha análise" ou diga o que mudar.', 'I did not understand.\nTap "See my analysis" or tell me what to change.'), ok)]);
  }

  switch (state.step) {
    case 'location': {
      const known = parseLocation(text);
      if (known) return goTo({ ...state.draft, location: known }, locale, reply(pick(locale, `Anotado: ${known.label ?? `${known.latitude}, ${known.longitude}`}.`, `Noted: ${known.label ?? `${known.latitude}, ${known.longitude}`}.`)));
      if (/^[\d\s.,;+\-−–°nsewNSEW]+$/.test(text)) return keep([reply(pick(locale, 'Essas coordenadas não parecem válidas.\nExemplo: -17.798, -50.919. Ou digite a cidade.', 'Those coordinates do not look valid.\nExample: -17.798, -50.919. Or type the city.'))]);
      return keep([], [{ type: 'lookup', query: text }]);
    }
    case 'current': {
      const id = findCrop(text);
      if (!id) return keep([reply(pick(locale, 'Não reconheci essa cultura.\nEscolha uma da lista.', 'I did not recognize that crop.\nPick one from the list.'), cropChips(locale))]);
      return goTo({ ...state.draft, current: id }, locale, reply(pick(locale, `Anotado: ${crop(id, locale)}.`, `Noted: ${crop(id, locale)}.`)));
    }
    case 'previous': {
      const id = findCrop(text);
      if (id) return goTo({ ...state.draft, previous: id }, locale, reply(pick(locale, `Anotado: ${crop(id, locale)}.`, `Noted: ${crop(id, locale)}.`)));
      if (isSkip(text)) return goTo({ ...state.draft, previous: null }, locale, reply(pick(locale, 'Tudo bem, sigo sem essa.', 'Fine, I will go without it.')));
      return keep([reply(pick(locale, 'Não reconheci essa cultura.\nEscolha uma da lista ou toque em "pular".', 'I did not recognize that crop.\nPick one from the list or tap "skip".'), [...cropChips(locale), pick(locale, 'pular', 'skip')])]);
    }
    case 'soil': {
      if (state.draft.soil && isDone(text)) return goTo({ ...state.draft, soilDone: true }, locale);
      const answer = parseSoilAnswer(text);
      if (!answer) return keep([]);
      if (answer.kind === 'none') return state.draft.soil ? goTo({ ...state.draft, soilDone: true }, locale) : goTo({ ...state.draft, soil: null }, locale, reply(pick(locale, 'Ótimo, nada de estranho no solo.', 'Good, nothing unusual in the soil.')));
      return goTo({ ...state.draft, soil: mergeSoil(state.draft.soil, answer.observation), soilDone: false }, locale);
    }
  }
}

/** Several soil problems ticked at once: they are merged with what was reported before and the soil question is closed. */
export function chooseSoil(state: ChatState, labels: string[], locale: Locale): Turn {
  if (state.step !== 'soil') return { state, replies: [], effects: [] };
  let soil = state.draft.soil ?? undefined;
  for (const label of labels) { const answer = parseSoilAnswer(label); if (answer?.kind === 'observed') soil = mergeSoil(soil, answer.observation); }
  if (!soil) return advance(state, pick(locale, 'Nada de estranho', 'Nothing unusual'), locale);
  return goTo({ ...state.draft, soil, soilDone: true }, locale);
}

/** Result of the city lookup (done by the app through /api/places). */
export function provideLocation(state: ChatState, matches: PlaceMatch[], query: string, locale: Locale): Turn {
  if (state.step !== 'location') return { state, replies: [], effects: [] };
  const label = (item: PlaceMatch) => `${item.name} (${item.uf})`;
  if (matches.length === 0) return { state, replies: [reply(pick(locale, `Não encontrei "${query}".\nConfira a grafia ou digite cidade e estado, como Rio Verde, GO.`, `I could not find "${query}".\nCheck the spelling or type city and state, like Rio Verde, GO.`))], effects: [] };
  if (matches.length > 1) return { state, replies: [reply(pick(locale, 'Achei mais de uma. Qual é a sua?', 'I found more than one. Which is yours?'), matches.map(label))], effects: [] };
  const [place] = matches;
  return goTo({ ...state.draft, location: { latitude: place.latitude, longitude: place.longitude, label: label(place) } }, locale, reply(pick(locale, `Anotado: ${label(place)}.`, `Noted: ${label(place)}.`)));
}

export function lookupFailed(state: ChatState, locale: Locale): Turn {
  return { state, replies: [reply(pick(locale, 'Não consegui buscar agora. Tente de novo.', 'I could not look it up right now. Try again.'))], effects: [] };
}

/** A place picked on the explorer map (search, click or example) offered to the chat. */
export type MapPlace = { latitude: number; longitude: number; label?: string };
export const mapPlaceName = (place: MapPlace) => place.label ?? `${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`;
export const mapChoices = (locale: Locale) => ({ yes: pick(locale, 'Sim, é aqui', 'Yes, it is here'), no: pick(locale, 'Não, vou digitar a cidade', 'No, I will type the city'), change: pick(locale, 'Sim, trocar o local', 'Yes, change the location'), keep: pick(locale, 'Não, manter', 'No, keep it') });

/** João's single message when a map place arrives while the chat still waits for the city. */
export function suggestMapPlace(place: MapPlace, locale: Locale): Reply {
  const { yes, no } = mapChoices(locale);
  return reply(pick(locale, `Vi que você marcou **${mapPlaceName(place)}** no mapa. É aí a sua fazenda?`, `I saw you marked **${mapPlaceName(place)}** on the map. Is that where your farm is?`), [yes, no]);
}

/** After the location step: one small note, no reset; the buttons are shown apart from the current question's chips. */
export function suggestMapChange(place: MapPlace, locale: Locale): Reply {
  return reply(pick(locale, `Quer trocar o local para **${mapPlaceName(place)}**?`, `Do you want to change the location to **${mapPlaceName(place)}**?`));
}

/** Uses the map place as the farm location, exactly like an answer typed in the chat, and moves on to the next open question. */
export function acceptMapPlace(state: ChatState, place: MapPlace, locale: Locale): Turn {
  const location: PlaceResult = { latitude: place.latitude, longitude: place.longitude, ...(place.label ? { label: place.label } : {}) };
  return goTo({ ...state.draft, location }, locale, reply(pick(locale, `Anotado: ${mapPlaceName(place)}.`, `Noted: ${mapPlaceName(place)}.`)));
}
