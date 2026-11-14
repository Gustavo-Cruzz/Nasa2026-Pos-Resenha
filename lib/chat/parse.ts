import { coordinatesSchema, type SoilObservation } from '@/lib/schema';
import { ATLAS_EXAMPLES } from '@/lib/atlas';

/** Lowercase, accent-free, with the unicode minus folded to "-": parsers only ever see this form. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[−–]/g, '-').toLowerCase().replace(/\s+/g, ' ').trim();
}

const num = (value: string) => Number(value.replace(',', '.'));
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- location ----------
// Brazilian cities go through the IBGE city lookup (/api/places); only the two foreign examples are matched by name here.
const PLACES: Array<{ aliases: string[]; point: (typeof ATLAS_EXAMPLES)[number] }> = [
  { aliases: ['acra', 'accra'], point: ATLAS_EXAMPLES[1] },
  { aliases: ['nova delhi', 'new delhi', 'nova deli', 'delhi', 'deli'], point: ATLAS_EXAMPLES[2] },
];

export type PlaceResult = { latitude: number; longitude: number; label?: string };

/** Coordinates ("-17.798, -50.919", "-17,798 -50,919", "17.798 S, 50.919 W") or one of the known example places. */
export function parseLocation(text: string): PlaceResult | undefined {
  const t = normalize(text);
  const hemisphere = /(-?\d{1,3}(?:[.,]\d+)?)\s*(?:°)?\s*([nsew])\b[\s,;]*(-?\d{1,3}(?:[.,]\d+)?)\s*(?:°)?\s*([nsew])\b/.exec(t);
  let pair: [number, number] | undefined;
  if (hemisphere) {
    const first = num(hemisphere[1]); const second = num(hemisphere[3]);
    const a = hemisphere[2]; const b = hemisphere[4];
    const lat = ['n', 's'].includes(a) ? first * (a === 's' ? -1 : 1) : ['n', 's'].includes(b) ? second * (b === 's' ? -1 : 1) : undefined;
    const lon = ['e', 'w'].includes(a) ? first * (a === 'w' ? -1 : 1) : ['e', 'w'].includes(b) ? second * (b === 'w' ? -1 : 1) : undefined;
    if (lat !== undefined && lon !== undefined) pair = [lat, lon];
  }
  if (!pair) {
    const dot = /(-?\d{1,2}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)/.exec(t);
    const comma = /(-?\d{1,2},\d+)\s*[;\s]\s*(-?\d{1,3},\d+)/.exec(t);
    const ints = /(-?\d{1,2})\s*[,;]\s*(-?\d{1,3})\b/.exec(t);
    const m = dot ?? comma ?? ints;
    if (m) pair = [num(m[1]), num(m[2])];
  }
  if (pair) { const parsed = coordinatesSchema.safeParse({ latitude: pair[0], longitude: pair[1] }); if (parsed.success) return parsed.data; }
  const place = PLACES.find((item) => item.aliases.some((alias) => new RegExp(`\\b${escape(alias)}\\b`).test(t)));
  return place ? { latitude: place.point.latitude, longitude: place.point.longitude, label: place.point.label } : undefined;
}

// ---------- crops ----------
export const CHAT_CROPS: Array<{ id: string; aliases: string[] }> = [
  { id: 'cowpea', aliases: ['feijao-caupi', 'feijao caupi', 'feijao de corda', 'caupi', 'cowpea', 'black-eyed pea'] },
  { id: 'common_bean', aliases: ['feijao comum', 'feijao-comum', 'common bean', 'feijao', 'beans', 'bean'] },
  { id: 'upland_rice', aliases: ['arroz de terras altas', 'upland rice', 'arroz', 'rice'] },
  { id: 'ruziziensis', aliases: ['braquiaria', 'brachiaria', 'ruziziensis', 'urochloa', 'capim'] },
  { id: 'soybean', aliases: ['soja', 'soybeans', 'soybean', 'soy'] },
  { id: 'maize', aliases: ['milho', 'maize', 'corn'] },
  { id: 'sorghum', aliases: ['sorgo', 'sorghum'] },
  { id: 'sunflower', aliases: ['girassol', 'sunflower'] },
];
const ALIASES = CHAT_CROPS.flatMap((crop) => crop.aliases.map((alias) => ({ id: crop.id, alias }))).sort((a, b) => b.alias.length - a.alias.length);

/** First crop mentioned in a text (longest alias wins, so "feijão-caupi" is never read as "feijão"). */
export function findCrop(text: string): string | undefined {
  const t = normalize(text);
  return ALIASES.find(({ alias }) => new RegExp(`(?<![a-z-])${escape(alias)}(?![a-z])`).test(t))?.id;
}

// ---------- small answers ----------
export function parseYesNo(text: string): 'yes' | 'no' | undefined {
  const t = normalize(text);
  if (/\b(sim|s|ok|claro|pode|confirmo|confirmar|vamos|analisar|ver minha analise|yes|y|sure|go|confirm|analyze|see my analysis)\b/.test(t)) return 'yes';
  if (/\b(nao|n|no|nope|cancelar|cancel)\b/.test(t)) return 'no';
  return undefined;
}

/** "pular", "não sei", "primeira vez", "skip"... */
export function isSkip(text: string): boolean {
  return /\b(pular|pula|skip|nao sei|nao lembro|nao tenho|primeira vez|first time|nenhum|nenhuma|none|nothing|nope|sem)\b/.test(normalize(text));
}

export type Command = 'restart' | 'help';
export function detectCommand(text: string): Command | undefined {
  const t = normalize(text);
  if (/\b(recomec\w*|reinici\w*|restart|reset|start over|nova analise|new analysis)\b/.test(t)) return 'restart';
  if (/\b(ajuda|help|comandos|commands)\b/.test(t)) return 'help';
  return undefined;
}

// ---------- soil observation ----------
const SOIL_PATTERNS: Array<[SoilObservation['kinds'][number], RegExp]> = [
  ['waterlogging', /\b(encharc\w*|empoc\w*|alag\w*|agua parada|waterlog\w*|ponding|flood\w*|standing water)\b/],
  ['compaction', /\b(compact\w*|duro|dura|endurec\w*|hard|hardpan)\b/],
  ['erosion', /\b(erosao|erosion|ravina\w*|voc[oa]roca\w*|sulcos?|enxurrad\w*|gully|gullies|washed|runoff)\b/],
  ['dry_cracked', /\b(rachad\w*|rachadura\w*|trinca\w*|muito seco|ressec\w*|cracked|cracks?|very dry|dried)\b/],
  ['salt_crust', /\b(sal|salino|salina|salinizacao|esbranquic\w*|crosta branca|salt|salty|white crust)\b/],
  ['discoloration', /\b(mancha\w*|cor estranha|amarel\w*|avermelh\w*|descolor\w*|stain\w*|discolor\w*|yellow\w*|odd color)\b/],
];
/** "só isso", "nada mais", "pronto", "that's all": the producer has no more soil problems to add. */
export function isDone(text: string): boolean {
  // The whole answer must be the closing phrase: "no" is also Portuguese ("no meio do talhão"), so it never counts inside a sentence.
  return /^(so isso|somente isso|e isso|e so|e so isso|pronto|ja disse|nada mais|mais nada|nenhum outro|nenhuma outra|nao|nao obrigad[oa]|nope|no|no thanks|done|that'?s all|that is all|nothing else|continuar|continue|seguir|proximo|next)( mesmo| obrigad[oa]| thanks| thank you)?$/.test(normalize(text).replace(/[.!,]+/g, ' ').replace(/\s+/g, ' ').trim());
}

/** Labels of the soil suggestions; an answer that is exactly one of them adds no free-text note. */
export const SOIL_CHIP_LABELS = { waterlogging: { 'pt-BR': 'Água empoçada', en: 'Standing water' }, compaction: { 'pt-BR': 'Solo duro', en: 'Hard soil' }, erosion: { 'pt-BR': 'Erosão', en: 'Erosion' }, dry_cracked: { 'pt-BR': 'Solo rachado', en: 'Cracked soil' }, salt_crust: { 'pt-BR': 'Crosta branca', en: 'White crust' }, discoloration: { 'pt-BR': 'Manchas', en: 'Stains' } } as const;
const CHIP_TEXTS = new Set(Object.values(SOIL_CHIP_LABELS).flatMap((label) => [normalize(label['pt-BR']), normalize(label.en)]));

export type SoilAnswer = { kind: 'none' } | { kind: 'observed'; observation: SoilObservation };

/**
 * "Água empoçada e solo duro" → waterlogging + compaction. Anything else the producer writes is kept as an "other" note (up to 200
 * characters) instead of being discarded or interpreted. "Nada", "normal", "não", "pular" mean nothing unusual.
 */
export function parseSoilAnswer(text: string): SoilAnswer | undefined {
  const t = normalize(text);
  if (!t) return undefined;
  if (/^(nada|nenhum|nenhuma|nao|no|none|nothing|normal|tudo bem|tudo normal|pular|skip|sem nada|nothing unusual)\b/.test(t)) return { kind: 'none' };
  const kinds = SOIL_PATTERNS.filter(([, pattern]) => pattern.test(t)).map(([kind]) => kind);
  const note = CHIP_TEXTS.has(t) ? undefined : text.trim().slice(0, 200);
  return { kind: 'observed', observation: { kinds: kinds.length ? kinds : ['other'], ...(note ? { note } : {}) } };
}
