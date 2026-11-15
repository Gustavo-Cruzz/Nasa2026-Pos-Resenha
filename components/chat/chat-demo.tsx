'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, MapPin, RotateCcw, SendHorizontal } from 'lucide-react';
import { acceptMapPlace, advance, buildAnalysisInput, mapChoices, suggestMapChange, suggestMapPlace, type MapPlace, chooseSoil, greeting, initialState, startWithLocation, lookupFailed, provideLocation, type ChatState, type Effect, type Reply, type Turn } from '@/lib/chat/flow';
import type { PlaceMatch } from '@/lib/brazil/places';
import { saveDraft } from '@/lib/storage';
import type { AtlasPolygon } from '@/lib/atlas';
import { useLocale } from '@/components/locale-provider';
import { ASSISTANT_NAME, ChatAvatar } from '@/components/chat/chat-avatar';

type Message = { id: number; role: 'bot' | 'user'; text: string };
const DELAY_MS = 350;
const SUGGEST_DELAY_MS = 180;
const MAP_DEBOUNCE_MS = 600;
const pointKey = (place: MapPlace) => `${place.latitude.toFixed(5)},${place.longitude.toFixed(5)}`;
const COORDINATES = /^[\d\s.,;+\-−–°nsewNSEW]+$/;
let sequence = 0;
const nextId = () => { sequence += 1; return sequence; };
const asMessages = (replies: Reply[]): Message[] => replies.filter((reply) => reply.text).map((reply) => ({ id: nextId(), role: 'bot', text: reply.text }));
const placeLabel = (place: PlaceMatch) => `${place.name} (${place.uf})`;

/** Chat that only registers the farm (city, current crop, previous crop, soil) and then opens the results page. */
export function ChatDemo({ mapPoint = null, mapPolygon }: { mapPoint?: MapPlace | null; mapPolygon?: AtlasPolygon } = {}) {
  const { locale, copy } = useLocale();
  const en = locale === 'en';
  const router = useRouter();
  const logRef = useRef<HTMLDivElement>(null);
  // Opened from the explorer with ?lat&lon&label: the city is already known.
  const searchParams = useSearchParams();
  const [boot] = useState<Turn | undefined>(() => readPrefill(searchParams, locale));
  const [messages, setMessages] = useState<Message[]>(() => asMessages(boot ? boot.replies : greeting(locale)));
  const [chips, setChips] = useState<string[]>(() => (boot ? boot.replies : greeting(locale)).at(-1)?.chips ?? []);
  const [multi, setMulti] = useState<Reply['multi']>();
  const [picked, setPicked] = useState<string[]>([]);
  const [state, setState] = useState<ChatState>(() => boot?.state ?? initialState());
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [suggest, setSuggest] = useState<{ query: string; results: PlaceMatch[] }>();
  const [dismissed, setDismissed] = useState('');
  const [active, setActive] = useState<{ query: string; index: number }>();

  // A place picked on the map: offered once (after a short pause) as the farm location; `offer` is the place waiting for an answer.
  const [offer, setOffer] = useState<{ place: MapPlace; kind: 'location' | 'change' }>();
  const lastOffered = useRef('');
  const mapPolygonRef = useRef(mapPolygon);
  useEffect(() => { mapPolygonRef.current = mapPolygon; }, [mapPolygon]);

  const query = text.trim();
  const suggestions = state.step === 'location' && !busy && suggest?.query === query && dismissed !== query ? suggest.results : [];
  const activeIndex = active?.query === query && active.index < suggestions.length ? active.index : -1;

  useEffect(() => {
    const frame = requestAnimationFrame(() => { const log = logRef.current; if (log) log.scrollTo({ top: log.scrollHeight, behavior: document.documentElement.dataset.motion === 'reduced' ? 'auto' : 'smooth' }); });
    return () => cancelAnimationFrame(frame);
  }, [messages, busy, chips, suggestions.length]);

  // City suggestions appear as the user types (debounced); the list is only shown while it matches the current text.
  useEffect(() => {
    if (state.step !== 'location' || query.length < 2 || COORDINATES.test(query)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/places?q=${encodeURIComponent(query)}&limit=8`, { signal: controller.signal });
        const body = await response.json() as { status: string; results?: PlaceMatch[] };
        if (body.status === 'ok' && body.results) setSuggest({ query, results: body.results });
      } catch { /* typing continues; the list simply does not appear */ }
    }, SUGGEST_DELAY_MS);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, state.step]);

  useEffect(() => {
    if (!mapPoint || busy) return;
    const key = pointKey(mapPoint);
    if (key === lastOffered.current || (state.draft.location && pointKey(state.draft.location) === key)) return;
    const timer = window.setTimeout(() => {
      lastOffered.current = key;
      if (state.step === 'location') { const suggestion = suggestMapPlace(mapPoint, locale); setMessages((current) => [...current, ...asMessages([suggestion])]); setChips(suggestion.chips ?? []); setMulti(undefined); setPicked([]); setOffer({ place: mapPoint, kind: 'location' }); }
      else { setMessages((current) => [...current, ...asMessages([suggestMapChange(mapPoint, locale)])]); setOffer({ place: mapPoint, kind: 'change' }); }
    }, MAP_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [mapPoint, busy, state, locale]);

  const addBot = (replies: Reply[]) => { setMessages((current) => [...current, ...asMessages(replies)]); setChips(replies.at(-1)?.chips ?? []); setMulti(replies.at(-1)?.multi); setPicked([]); };

  const lookup = async (value: string, current: ChatState) => {
    try {
      const response = await fetch(`/api/places?q=${encodeURIComponent(value)}`);
      const body = await response.json() as { status: string; results?: PlaceMatch[] };
      if (!response.ok || body.status !== 'ok' || !body.results) throw new Error('lookup failed');
      const next = provideLocation(current, body.results, value, locale);
      setState(next.state);
      addBot(next.replies);
    } catch { addBot(lookupFailed(current, locale).replies); }
    finally { setBusy(false); }
  };

  const runEffects = (effects: Effect[], turn: Turn) => {
    const effect = effects[0];
    if (!effect) { setBusy(false); return; }
    if (effect.type === 'restart') { setMessages(asMessages(greeting(locale))); setChips(greeting(locale).at(-1)?.chips ?? []); setBusy(false); return; }
    if (effect.type === 'go') {
      const input = buildAnalysisInput(turn.state.draft);
      if (!input) { addBot([{ text: en ? 'Something is missing in my notes. Say "restart" to begin again.' : 'Faltou algo nas minhas anotações. Diga "recomeçar" para começar de novo.' }]); setBusy(false); return; }
      saveDraft(input);
      persistAtlas(turn.state.draft.location, mapPolygonRef.current);
      router.push('/results');
      return;
    }
    void lookup(effect.query, turn.state);
  };

  const respond = (turn: Turn) => {
    setBusy(true);
    setChips([]);
    setMulti(undefined);
    setPicked([]);
    setState(turn.state);
    window.setTimeout(() => { if (turn.replies.length) addBot(turn.replies); runEffects(turn.effects, turn); }, DELAY_MS);
  };

  const answerOffer = (yes: boolean) => {
    if (!offer || busy) return;
    const choices = mapChoices(locale);
    const { place, kind } = offer;
    setOffer(undefined);
    setMessages((current) => [...current, { id: nextId(), role: 'user', text: yes ? (kind === 'location' ? choices.yes : choices.change) : (kind === 'location' ? choices.no : choices.keep) }]);
    if (yes) { respond(acceptMapPlace(state, place, locale)); return; }
    if (kind === 'location') respond({ state, replies: [{ text: en ? 'Fine. Type your city, or send latitude and longitude.' : 'Tudo bem. Digite a cidade ou envie latitude e longitude.' }], effects: [] });
  };

  const send = (raw: string) => {
    const value = raw.trim();
    if (!value || busy) return;
    const choices = mapChoices(locale);
    if (offer?.kind === 'location' && (value === choices.yes || value === choices.no)) { answerOffer(value === choices.yes); return; }
    setOffer((current) => (current?.kind === 'location' ? undefined : current));
    setMessages((current) => [...current, { id: nextId(), role: 'user', text: value }]);
    setText('');
    respond(advance(state, value, locale));
  };

  const togglePick = (chip: string) => setPicked((current) => (current.includes(chip) ? current.filter((item) => item !== chip) : [...current, chip]));
  const finishPicks = () => {
    if (busy || !multi) return;
    if (!picked.length) { send(multi.finishLabel); return; }
    setMessages((current) => [...current, { id: nextId(), role: 'user', text: picked.join(', ') }]);
    respond(chooseSoil(state, picked, locale));
  };

  const choosePlace = (place: PlaceMatch) => {
    if (busy) return;
    setOffer(undefined);
    setMessages((current) => [...current, { id: nextId(), role: 'user', text: placeLabel(place) }]);
    setText('');
    respond(provideLocation(state, [place], placeLabel(place), locale));
  };

  const onSubmit = (event: FormEvent) => { event.preventDefault(); send(text); };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive({ query, index: (activeIndex + 1) % suggestions.length }); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive({ query, index: activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1 }); }
    else if (event.key === 'Enter' && activeIndex >= 0) { event.preventDefault(); choosePlace(suggestions[activeIndex]); }
    else if (event.key === 'Escape') { event.preventDefault(); setDismissed(query); }
  };

  return <section aria-label={en ? 'Register your farm' : 'Cadastro da fazenda'} className="mx-auto -mt-6 flex h-[calc(100dvh-7rem)] min-h-[30rem] max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/80 sm:mt-0 sm:h-[78vh]">
    <header className="flex items-center gap-3 border-b border-slate-700 bg-slate-900 px-4 py-3">
      <ChatAvatar size={44} />
      <div className="min-w-0 flex-1"><h1 className="truncate text-base font-bold leading-tight">{ASSISTANT_NAME}</h1><p className="truncate text-xs text-slate-400">{en ? 'Plantaê assistant' : 'Assistente do Plantaê'}</p></div>
      <button className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-600 px-3 text-sm font-semibold hover:border-lime-300" disabled={busy} type="button" onClick={() => send(en ? 'restart' : 'recomeçar')}><RotateCcw aria-hidden="true" size={15} /><span className="sr-only sm:not-sr-only">{en ? 'Restart' : 'Recomeçar'}</span></button>
    </header>
    <div aria-label={en ? 'Conversation' : 'Conversa'} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto px-4 py-4" ref={logRef} role="log">
      {messages.map((message) => <div className={`flex ${message.role === 'user' ? 'justify-end' : 'items-end gap-2'}`} key={message.id}>
        {message.role === 'bot' ? <span aria-hidden="true" className="shrink-0"><ChatAvatar size={32} /></span> : null}
        <p className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${message.role === 'user' ? 'rounded-br-sm bg-lime-300 text-slate-950' : 'rounded-bl-sm border border-slate-700 bg-slate-800 text-slate-100'}`}><BubbleText bot={message.role === 'bot'} text={message.text} /></p>
      </div>)}
      {busy ? <div className="flex items-end gap-2" role="status"><span aria-hidden="true" className="shrink-0"><ChatAvatar size={32} /></span><span className="chat-typing rounded-2xl rounded-bl-sm border border-slate-700 bg-slate-800 px-4 py-3"><span className="sr-only">{en ? 'Typing…' : 'Digitando…'}</span><i aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" /></span></div> : null}
    </div>
    {suggestions.length ? <ul aria-label={en ? 'City suggestions' : 'Sugestões de cidades'} className="max-h-56 overflow-y-auto border-t border-slate-700 bg-slate-900 py-1" id="place-suggestions" role="listbox">
      {suggestions.map((place, index) => <li aria-selected={index === activeIndex} id={`place-${place.code}`} key={place.code} role="option">
        <button className={`flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm ${index === activeIndex ? 'bg-lime-300/15' : 'hover:bg-slate-800'}`} tabIndex={-1} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choosePlace(place)}><MapPin aria-hidden="true" className="shrink-0 text-lime-300" size={16} /><span className="font-semibold">{place.name}</span><span className="text-slate-400">· {place.uf}</span></button>
      </li>)}
    </ul> : chips.length && !busy ? <div aria-label={multi ? (en ? 'Tick all that apply' : 'Marque todas que valem') : (en ? 'Quick replies' : 'Respostas rápidas')} className="border-t border-slate-800 px-4 pb-1 pt-3" role="group">
      <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">{chips.map((chip) => multi
        ? <button aria-pressed={picked.includes(chip)} className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold ${picked.includes(chip) ? 'border-lime-300 bg-lime-300 text-slate-950' : 'border-lime-300/60 text-lime-100 hover:bg-lime-300/10'}`} key={chip} type="button" onClick={() => togglePick(chip)}>{picked.includes(chip) ? <Check aria-hidden="true" size={14} /> : null}{chip}</button>
        : <button className="min-h-10 rounded-full border border-lime-300/60 px-4 text-sm font-semibold text-lime-100 hover:bg-lime-300/10" key={chip} type="button" onClick={() => send(chip)}>{chip}</button>)}</div>
      {multi ? <button className="mt-3 min-h-11 w-full rounded-lg bg-lime-300 px-4 text-sm font-bold text-slate-950 hover:bg-lime-200" type="button" onClick={finishPicks}>{picked.length ? `${en ? 'Continue' : 'Continuar'} (${picked.length})` : multi.finishLabel}</button> : null}
    </div> : null}
    {offer?.kind === 'change' && !busy ? <div aria-label={en ? 'Change location' : 'Trocar local'} className="flex flex-wrap gap-2 border-t border-slate-800 px-4 pb-1 pt-3" role="group">
      <button className="min-h-10 rounded-full border border-lime-300/60 px-4 text-sm font-semibold text-lime-100 hover:bg-lime-300/10" type="button" onClick={() => answerOffer(true)}>{mapChoices(locale).change}</button>
      <button className="min-h-10 rounded-full border border-slate-600 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-800" type="button" onClick={() => answerOffer(false)}>{mapChoices(locale).keep}</button>
    </div> : null}
    <form className="flex items-center gap-2 border-t border-slate-700 p-3" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor="chat-input">{en ? 'Your message' : 'Sua mensagem'}</label>
      <input aria-activedescendant={activeIndex >= 0 ? `place-${suggestions[activeIndex].code}` : undefined} aria-autocomplete={state.step === 'location' ? 'list' : undefined} aria-controls={suggestions.length ? 'place-suggestions' : undefined} aria-expanded={state.step === 'location' ? suggestions.length > 0 : undefined} autoComplete="off" className="min-h-11 flex-1 rounded-lg border border-slate-600 bg-slate-950 px-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/30" disabled={busy} id="chat-input" onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown} placeholder={state.step === 'location' ? (en ? 'Type your city…' : 'Digite sua cidade…') : (en ? 'Type your answer…' : 'Digite sua resposta…')} role={state.step === 'location' ? 'combobox' : undefined} value={text} />
      <button aria-label={en ? 'Send' : 'Enviar'} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-lime-300 text-slate-950 hover:bg-lime-200 disabled:opacity-50" disabled={busy || !text.trim()} type="submit"><SendHorizontal aria-hidden="true" size={18} /></button>
    </form>
  </section>;
}

/** Bot messages: the first line is the question, the rest is a softer hint. Summaries (bullet lists) stay uniform. */
function BubbleText({ text, bot }: { text: string; bot: boolean }) {
  const [head, ...rest] = text.split('\n');
  if (!bot || rest.length === 0 || text.includes('•')) return <>{bold(text)}</>;
  return <>{bold(head)}<span className="mt-1 block opacity-65">{rest.join('\n')}</span></>;
}

/** **word** becomes bold; everything else stays plain text. */
function bold(text: string) { return text.split(/\*\*(.+?)\*\*/g).map((part, index) => (index % 2 ? <strong key={index}>{part}</strong> : part)); }

/** Keeps the old explorer hand-off keys: the chosen point and, with at least 3 vertices, the drawn area (read by the farm page). */
function persistAtlas(location: MapPlace | undefined, polygon: AtlasPolygon | undefined) {
  try {
    if (location) window.localStorage.setItem('field-shift:atlas-point', JSON.stringify({ latitude: location.latitude, longitude: location.longitude, ...(location.label ? { label: location.label } : {}) }));
    if (polygon && polygon.length >= 3) window.localStorage.setItem('field-shift:atlas-polygon', JSON.stringify(polygon));
    else if (polygon) window.localStorage.removeItem('field-shift:atlas-polygon');
  } catch { /* storage unavailable: the analysis still opens */ }
}

function readPrefill(params: URLSearchParams, locale: 'pt-BR' | 'en'): Turn | undefined {
  const latitude = Number(params.get('lat'));
  const longitude = Number(params.get('lon'));
  if (!params.has('lat') || !params.has('lon') || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return undefined;
  const label = params.get('label')?.slice(0, 80) || undefined;
  return startWithLocation({ latitude, longitude, ...(label ? { label } : {}) }, locale);
}
