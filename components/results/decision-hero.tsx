'use client';

import { useMemo } from 'react';
import { CheckCircle2, CircleHelp, TriangleAlert, ExternalLink } from 'lucide-react';
import type { AnalysisResult } from '@/lib/engine/types';
import { deriveDecisionHero, type HeroState, type NextCheck } from '@/lib/engine/decision-hero';
import { buildSourceHealth, sourceStateLabel, sourceTitle, summarizeSourceStates, type SourceState } from '@/lib/source-health';
import { StatusCharacter } from '@/components/pixel/status-character';
import { useLocale } from '@/components/locale-provider';
import { cropDisplayName } from '@/lib/presentation';
import { deriveRotationCalendar, deriveSeasonInsights, describeSeasonInsight } from '@/lib/engine/season';

const months = { 'pt-BR': ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] } as const;
const tone: Record<HeroState, string> = { attention: 'border-amber-300 bg-amber-950/40', compatible: 'border-lime-300/70 bg-lime-300/10', unknown: 'border-slate-500 bg-slate-900' };
const chipTone: Record<SourceState, string> = { available: 'border-lime-300/60', cache_verified: 'border-cyan-300/60', partial: 'border-amber-300/60', nd: 'border-slate-500' };
const chipMark: Record<SourceState, string> = { available: '●', cache_verified: '◆', partial: '◐', nd: '○' };

export function DecisionHero({ data }: { data: AnalysisResult }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const hero = useMemo(() => deriveDecisionHero(data), [data]);
  const health = useMemo(() => buildSourceHealth(data), [data]);
  const highlights = useMemo(() => deriveSeasonInsights(deriveRotationCalendar(data.nasaInsightByMonth), data.climate.waterBalanceByMonth ?? [], data.input.plantingMonth).filter((insight) => insight.kind !== 'no_reading'), [data]);
  const month = months[locale][hero.month - 1];
  const name = (item: (typeof hero.items)[number]) => cropDisplayName(item.cropId, item.cropName, locale) || 'N/D';
  const state = { attention: en ? 'Attention' : 'Atenção', compatible: en ? 'Compatible' : 'Compatível', unknown: 'N/D' }[hero.state];
  const Icon = hero.state === 'attention' ? TriangleAlert : hero.state === 'compatible' ? CheckCircle2 : CircleHelp;
  const headline = hero.state === 'attention'
    ? en ? `${month}: ${hero.items.map((item) => `${name(item)} (scenario ${item.scenarioId})`).join(' · ')} ${hero.items.length > 1 ? 'need' : 'needs'} attention` : `${month}: ${hero.items.map((item) => `${name(item)} (cenário ${item.scenarioId})`).join(' · ')} ${hero.items.length > 1 ? 'ficam' : 'fica'} sob atenção`
    : hero.state === 'compatible'
      ? en ? `${month}: the NASA signal is inside the documented range of every hypothesis` : `${month}: o sinal NASA está dentro da faixa documentada de todas as hipóteses`
      : en ? `${month}: no reading to compare` : `${month}: sem leitura para comparar`;
  const unreadNote = hero.state !== 'unknown' && hero.unreadScenarioIds.length ? (en ? `Scenario ${hero.unreadScenarioIds.join('/')}: N/D — no documented range, so it is not counted as compatible.` : `Cenário ${hero.unreadScenarioIds.join('/')}: N/D — sem faixa documentada, não conta como compatível.`) : null;
  const unknownWhy = hero.state === 'unknown' ? (data.climate.status !== 'available' ? (en ? 'NASA historical climate is unavailable for this point.' : 'O clima histórico NASA está indisponível para este ponto.') : en ? 'No documented thermal range for the hypotheses, so rainfall alone is not turned into a decision.' : 'Sem faixa térmica documentada para as hipóteses; só a chuva não vira decisão.') : null;
  const next: Record<NextCheck, string> = en
    ? { confirm_baseline: 'Confirm the baseline, then ask a local agronomist or technician whether the documented range applies to your field.', review_with_technician: 'Ask a local agronomist or technician whether the documented range applies to your field.', provide_data: 'Add the missing data or try again later; nothing was assumed to be fine.' }
    : { confirm_baseline: 'Confirme a linha de base e pergunte a um agrônomo ou técnico local se a faixa documentada vale para o seu talhão.', review_with_technician: 'Pergunte a um agrônomo ou técnico local se a faixa documentada vale para o seu talhão.', provide_data: 'Informe o dado que falta ou tente de novo depois; nada foi assumido como ok.' };
  const rule = en ? 'NASA POWER median temperature vs. the crop’s documented thermal range' : 'Temperatura mediana NASA POWER × faixa térmica documentada da cultura';
  return <section aria-labelledby="decision-hero-heading" className={`mt-5 rounded-xl border-2 p-5 ${tone[hero.state]}`} data-hero-state={hero.state}>
    <div className="flex items-start gap-4">
      <StatusCharacter locale={locale} state={hero.state} />
      <div className="min-w-0 flex-1">
        <p className="inline-flex items-center gap-2 rounded-full border border-current px-3 py-1 text-sm font-bold"><Icon aria-hidden="true" size={16} />{state}</p>
        <h2 className="mt-2 text-xl font-bold sm:text-2xl" id="decision-hero-heading">{headline}</h2>
      </div>
    </div>
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{en ? 'NASA signal' : 'Sinal NASA'} · {month}</dt><dd className="mt-1 text-2xl font-bold">{hero.observedValue === null ? 'N/D' : `${hero.observedValue} ${hero.unit}`}</dd>{hero.period ? <dd className="text-xs text-slate-400">{hero.period.start}–{hero.period.end}</dd> : null}</div>
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{en ? 'Documented range' : 'Faixa documentada'}</dt>{hero.items.length ? hero.items.map((item) => <dd className="mt-1" key={item.scenarioId}><b>{name(item)}</b> · {item.rangeC ? `${item.rangeC.min}–${item.rangeC.max} °C` : 'N/D'}</dd>) : <dd className="mt-1">N/D</dd>}</div>
    </dl>
    {unknownWhy ? <p className="mt-3 text-sm">{unknownWhy}</p> : null}
    {unreadNote ? <p className="mt-3 text-sm text-slate-300">{unreadNote}</p> : null}
    {highlights.length ? <ul aria-label={en ? 'Highlights' : 'Em destaque'} className="mt-4 grid gap-2">{highlights.map((insight, index) => { const text = describeSeasonInsight(insight, locale); return <li className="rounded-lg border border-slate-600 bg-slate-950/40 p-3 text-sm" key={`${insight.kind}-${index}`}><b>{text.title}</b><span className="mt-1 block text-slate-300">{text.detail}</span></li>; })}</ul> : null}
    <p className="mt-3 text-xs text-slate-300"><b>{en ? 'Rule' : 'Regra'}:</b> {rule}{hero.sourceUrl ? <> · <a className="inline-flex items-center gap-1 underline" href={hero.sourceUrl} rel="noreferrer" target="_blank">{en ? 'Source' : 'Fonte'}<ExternalLink aria-hidden="true" size={12} /></a></> : null}</p>
    <p className="mt-3 rounded-lg bg-slate-950/50 p-3 text-sm"><b>{en ? 'Next human check' : 'Próxima verificação humana'}:</b> {next[hero.nextCheck]}</p>
    <ul aria-label={en ? 'Data states' : 'Estados dos dados'} className="mt-4 flex flex-wrap gap-2 text-xs">{summarizeSourceStates(health).map((group) => <li className={`rounded-full border px-3 py-1 ${chipTone[group.state]}`} key={group.state}><span aria-hidden="true">{chipMark[group.state]} </span><b>{sourceStateLabel(group.state, locale)}</b>: {group.sources.map(sourceTitle).join(', ')}</li>)}</ul>
  </section>;
}
