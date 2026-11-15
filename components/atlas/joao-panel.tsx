'use client';

import { useMemo } from 'react';
import type { AtlasPoint, ClimateApiResponse } from '@/lib/atlas';
import { explainPlace, type JoaoExplanation, type JoaoLine, type JoaoSectionId, type JoaoTone } from '@/lib/explain/joao';
import { ASSISTANT_NAME, ChatAvatar } from '@/components/chat/chat-avatar';
import { useExtras } from '@/components/atlas/explore-extras';
import { buildJoaoData } from '@/components/atlas/joao-data';
import { useLocale } from '@/components/locale-provider';

type Climate = Extract<ClimateApiResponse, { status: 'ok' }>;

/** The number cards that back each of João's sections; "see the numbers" opens them. */
const CARDS: Record<JoaoSectionId, string[]> = { rain: ['forecast', 'rainy-season'], soil: ['root-zone', 'dry-spells'], heat: ['temperature'], world: ['enso', 'crops'] };

function Header({ en }: { en: boolean }) {
  return <header className="flex items-center gap-3">
    <ChatAvatar size={56} />
    <div><p className="text-base font-bold">{ASSISTANT_NAME}</p><p className="text-xs text-slate-400">{en ? 'Fictional character' : 'Personagem fictício'}</p></div>
  </header>;
}

const BUBBLE = 'mt-3 rounded-2xl rounded-tl-sm border border-slate-700 bg-slate-900/80 p-3.5 text-[1.0625rem] leading-7';

/** Shown while the climate history is still loading, so the panel already has a face and does not jump. */
export function JoaoThinking({ en }: { en: boolean }) {
  return <section aria-label={en ? 'João is looking at the data' : 'O João está olhando os dados'} className="mt-5 rounded-xl border border-lime-300/30 bg-slate-950/60 p-4">
    <Header en={en} />
    <div className={BUBBLE}><span className="chat-typing mr-2 align-middle" aria-hidden="true"><i /><i /><i /></span>{en ? 'I am looking at the data for this place…' : 'Estou olhando os dados deste lugar…'}</div>
  </section>;
}

const TONE_LABEL = { attention: { pt: 'Chama atenção', en: 'Worth noticing' }, unknown: { pt: 'Sem dado', en: 'No data' } } as const;

function Line({ line, en }: { line: JoaoLine; en: boolean }) {
  const style: Record<JoaoTone, string> = { info: 'text-slate-100', attention: 'border-l-4 border-amber-300 pl-3 text-slate-100', unknown: 'text-slate-400' };
  return <p className={`text-base leading-7 ${style[line.tone]}`}>
    {line.tone === 'info' ? null : <span className={`mr-2 inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${line.tone === 'attention' ? 'bg-amber-300/20 text-amber-100' : 'bg-slate-800 text-slate-300'}`}>{en ? TONE_LABEL[line.tone].en : TONE_LABEL[line.tone].pt}</span>}
    {line.text}
  </p>;
}

export function JoaoPanel({ explanation, en }: { explanation: JoaoExplanation; en: boolean }) {
  const { showNumbers } = useExtras();
  return <section aria-label={en ? 'João explains this place' : 'O João explica este lugar'} className="mt-5 rounded-xl border border-lime-300/30 bg-slate-950/60 p-4">
    <Header en={en} />
    <div className={BUBBLE}>
      <p className="font-semibold">{explanation.intro}</p>
      {explanation.summary.length ? <p className="mt-2">{explanation.summary.join(' ')}</p> : <p className="mt-2 text-slate-300">{en ? 'I could not gather enough data for this place yet.' : 'Ainda não consegui reunir dados suficientes deste lugar.'}</p>}
    </div>
    {explanation.sections.map((section) => {
      const hints = section.lines.flatMap((line) => line.hint ? [line.hint] : []);
      return <section aria-labelledby={`joao-${section.id}`} className="mt-5" key={section.id}>
        <h3 className="text-sm font-bold text-lime-200" id={`joao-${section.id}`}>{section.title}</h3>
        <div className="mt-2 grid gap-3">{section.lines.map((line) => <Line en={en} key={line.id} line={line} />)}</div>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
          <button className="inline-flex min-h-11 items-center text-sm font-semibold text-lime-200 underline underline-offset-4 hover:text-lime-100" onClick={() => showNumbers(CARDS[section.id])} type="button">{en ? 'See the numbers' : 'Ver os números'}</button>
          {hints.length ? <details className="text-xs text-slate-400"><summary className="min-h-6 cursor-pointer underline underline-offset-2">{en ? 'How I worked this out' : 'Como eu calculei'}</summary><ul className="mt-1 list-disc space-y-1 pl-4">{hints.map((hint) => <li key={hint}>{hint}</li>)}</ul></details> : null}
        </div>
      </section>;
    })}
    <p className="mt-5 border-t border-slate-800 pt-3 text-xs text-slate-400">{explanation.footer}</p>
  </section>;
}

/** João for the selected place: builds his words from the climate the panel already loaded and the shared extra readings. */
export function JoaoExplains({ point, climate }: { point: AtlasPoint; climate: Climate }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const { forecast, enso, regional } = useExtras();
  const explanation = useMemo(
    () => explainPlace(buildJoaoData({ placeName: point.label ?? null, month: new Date().getMonth() + 1, climate, forecast, enso, regional }), en ? 'en' : 'pt-BR'),
    [point.label, climate, forecast, enso, regional, en],
  );
  return <JoaoPanel en={en} explanation={explanation} />;
}
