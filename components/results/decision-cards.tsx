'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, CircleHelp, MessageCircleQuestion, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { AnalysisResult } from '@/lib/engine/types';
import { buildScenarioCards, type CardDeltaItem, type ScenarioCard } from '@/lib/engine/decision-cards';
import { CropSprite } from '@/components/crops/crop-sprite';
import { Chip } from '@/components/results2/drawer';
import { useLocale } from '@/components/locale-provider';
import { alignmentDisplay, cropDisplayName, scenarioDisplayTitle } from '@/lib/presentation';

type Locale = 'pt-BR' | 'en';
const seasonLabel = (season: 'A' | 'B', en: boolean) => season === 'A' ? (en ? '1st season' : '1ª safra') : (en ? '2nd season' : '2ª safra');

/** Decision-first block (audit 3.1): three scenario cards with sequence, benefits, risks, gaps and honesty strip, fed by the real engine output. */
export function DecisionCards({ data }: { data: AnalysisResult }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const cards = useMemo(() => buildScenarioCards(data, locale), [data, locale]);
  return <section aria-labelledby="decision-cards-heading" className="mt-6">
    <h2 className="text-2xl font-bold sm:text-3xl" id="decision-cards-heading">{en ? 'Which rotation for the next 2 years on your field?' : 'Qual rotação para os próximos 2 anos no seu talhão?'}</h2>
    <p className="mt-1 text-sm text-slate-300">{en ? 'Three exploratory scenarios compared with what you grow today. They are hypotheses to discuss, not a recommendation.' : 'Três cenários exploratórios comparados com o que você cultiva hoje. São hipóteses para conversar, não uma recomendação.'}</p>
    <div className="mt-4 grid gap-4 lg:grid-cols-3">{cards.map((card) => <ScenarioCardView card={card} data={data} en={en} key={card.id} locale={locale} />)}</div>
  </section>;
}

function ScenarioCardView({ card, data, en, locale }: { card: ScenarioCard; data: AnalysisResult; en: boolean; locale: Locale }) {
  const strategy = data.strategies.find((item) => item.id === card.id)!;
  const hasTradeoffs = Boolean(strategy.tradeoffs);
  return <article className={`flex flex-col gap-4 rounded-2xl border-2 p-4 ${card.baseline ? 'border-slate-600 bg-slate-900/70' : 'border-cyan-300/40 bg-slate-900'}`} data-scenario={card.id}>
    <header>
      <p className="text-sm font-semibold text-lime-300">{en ? 'Scenario' : 'Cenário'} {card.id}{card.baseline ? <> · <Chip tone="info">{en ? 'what you do today' : 'o que você faz hoje'}</Chip></> : null}</p>
      <h3 className="mt-1 text-lg font-bold leading-tight">{scenarioDisplayTitle(strategy, locale)}</h3>
      {strategy.baseline ? <Link className="mt-2 inline-block min-h-6 text-sm underline" href="/farm?edit=baseline">{en ? 'Edit baseline' : 'Editar linha de base'}</Link> : null}
    </header>
    <Sequence card={card} en={en} locale={locale} />
    {card.delta.length ? <Delta card={card} en={en} locale={locale} /> : null}
    {hasTradeoffs ? <>
      <List icon={<ThumbsUp aria-hidden="true" size={14} />} items={card.benefits} title={en ? 'Gains vs. A' : 'Ganha em (vs. A)'} tone="text-lime-300" />
      <List icon={<ThumbsDown aria-hidden="true" size={14} />} items={card.risks} title={en ? 'Loses vs. A' : 'Perde em (vs. A)'} tone="text-amber-300" />
      <List icon={<CircleHelp aria-hidden="true" size={14} />} items={card.gaps} title={en ? 'We do not know' : 'Não sabemos'} tone="text-slate-300" />
    </> : <p className="text-sm text-slate-300">{card.baseline ? (en ? 'Reference for the comparison: the other scenarios are measured against it.' : 'Referência da comparação: os outros cenários são medidos contra ela.') : 'N/D'}</p>}
    {card.alignment.length ? <div>
      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-300">{en ? 'Your priorities' : 'Suas prioridades'}</h4>
      <ul className="mt-1 grid gap-1 text-xs">{card.alignment.map((item) => { const view = alignmentDisplay(item, locale); return <li key={item.priority}><span aria-hidden="true">{view.icon}</span> <b>{view.priority}</b>: {view.level}</li>; })}</ul>
    </div> : null}
    <HonestyStrip card={card} en={en} />
    <p className="mt-auto flex items-start gap-2 rounded-lg bg-slate-950/50 p-3 text-xs"><MessageCircleQuestion aria-hidden="true" className="mt-0.5 shrink-0 text-lime-300" size={16} /><span><b>{en ? 'Ask your agronomist' : 'Pergunte ao técnico'}:</b> {en ? `does scenario ${card.id} fit my soil, my machinery and my local calendar?` : `o cenário ${card.id} serve para o meu solo, minhas máquinas e meu calendário local?`}</span></p>
  </article>;
}

function Sequence({ card, en, locale }: { card: ScenarioCard; en: boolean; locale: Locale }) {
  if (!card.sequence.length) return <p className="text-sm text-slate-300">N/D</p>;
  return <ol aria-label={en ? '2-year sequence' : 'Sequência de 2 anos'} className="grid grid-cols-4 gap-1.5">{card.sequence.map((slot) => {
    const name = cropDisplayName(slot.cropId, slot.cropName, locale);
    return <li className="flex min-w-0 flex-col items-center rounded-lg border border-slate-700 bg-slate-950/40 p-1.5 text-center" key={slot.slotIndex}>
      <span className="text-[10px] font-bold uppercase text-slate-400">{en ? 'Y' : 'A'}{slot.year} · {seasonLabel(slot.season, en)}</span>
      {slot.cropId ? <CropSprite cropId={slot.cropId} name={name} size={36} /> : <span aria-hidden="true" className="grid h-9 w-9 place-items-center text-slate-500">–</span>}
      <span className="mt-0.5 w-full truncate text-[11px] font-semibold">{slot.cropId ? name : 'N/D'}</span>
    </li>;
  })}</ol>;
}

function Delta({ card, en, locale }: { card: ScenarioCard; en: boolean; locale: Locale }) {
  const nm = (id: string | null, name: string | null) => id || name ? cropDisplayName(id, name, locale) : 'N/D';
  const sprite = (id: string | null, name: string | null) => id ? <CropSprite cropId={id} name={nm(id, name)} size={22} /> : null;
  return <div aria-label={en ? `A to ${card.id}` : `A para ${card.id}`} className="rounded-lg border border-cyan-300/40 bg-cyan-500/10 p-3 text-sm">
    <p className="text-xs font-bold uppercase text-cyan-200">A → {card.id}</p>
    <ul className="mt-1 grid gap-1.5">{card.delta.map((item: CardDeltaItem) => <li className="flex flex-wrap items-center gap-1.5" key={item.slotIndex}>
      <span className="text-xs text-slate-300">{en ? 'Y' : 'A'}{item.year} {seasonLabel(item.season, en)}:</span>
      {sprite(item.fromId, item.fromName)}<s className="text-slate-400">{nm(item.fromId, item.fromName)}</s><ArrowRight aria-hidden="true" size={14} />{sprite(item.toId, item.toName)}<b>{nm(item.toId, item.toName)}</b>
      <span className="sr-only">{en ? `${card.id} trades ${nm(item.fromId, item.fromName)} for ${nm(item.toId, item.toName)}` : `${card.id} troca ${nm(item.fromId, item.fromName)} por ${nm(item.toId, item.toName)}`}</span>
    </li>)}</ul>
  </div>;
}

function List({ title, items, icon, tone }: { title: string; items: string[]; icon: React.ReactNode; tone: string }) {
  return <div><h4 className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${tone}`}>{icon}{title}</h4>{items.length ? <ul className="mt-1 grid gap-1 text-xs text-slate-200">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-1 text-xs text-slate-400">N/D</p>}</div>;
}

/** Honesty strip (audit 3.7): what we know, what is missing, what to validate. */
function HonestyStrip({ card, en }: { card: ScenarioCard; en: boolean }) {
  const { know, missing, validate } = card.honesty;
  const col = (title: string, items: string[]) => <div><h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-300">{title}</h4>{items.length ? <ul className="mt-1 grid gap-0.5 text-[11px] text-slate-200">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-1 text-[11px] text-slate-400">N/D</p>}</div>;
  return <div aria-label={en ? 'Honesty strip' : 'Faixa de honestidade'} className="grid gap-3 rounded-lg border border-slate-700 p-3">
    {col(en ? 'What we know' : 'O que sabemos', know)}
    {col(en ? 'What is missing' : 'O que falta', missing)}
    {col(en ? 'What to validate' : 'O que validar', validate)}
  </div>;
}
