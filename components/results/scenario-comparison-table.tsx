'use client';

import { useState } from 'react';
import type { AnalysisResult, IndicatorState, PriorityAlignment, QualitativeIndicator } from '@/lib/engine/types';
import { useLocale } from '@/components/locale-provider';
import { alignmentDisplay, indicatorDisplay, scenarioDisplayTitle } from '@/lib/presentation';
import { ScenarioComparisonShortcut } from '@/components/future-stories/scenario-comparison-shortcut';

const stateText: Record<IndicatorState, string> = { compatible: 'compatível', attention: 'atenção', unknown: 'desconhecido', yes: 'presente', no: 'não catalogado', observed: 'observação' };
const indicatorOrder = ['thermal_compatibility', 'historical_precipitation', 'rainfall_distribution', 'root_zone_wetness', 'window_water_balance', 'frost_risk', 'documented_water_response', 'cover_potential', 'functional_diversity', 'soil_context'] as const;

const levelStyle: Record<PriorityAlignment['level'], string> = { supports: 'text-lime-300', neutral: 'text-slate-200', conflicts: 'text-amber-300', unknown: 'text-slate-400' };
function Alignment({ items, locale }: { items: PriorityAlignment[] | undefined; locale: 'pt-BR' | 'en' }) {
  if (!items?.length) return <span>N/D</span>;
  return <ul className="grid gap-2">{items.map((item) => { const view = alignmentDisplay(item, locale); return <li key={item.priority}><b className={levelStyle[item.level]}><span aria-hidden="true">{view.icon}</span> {view.priority}: {view.level}</b><p className="mt-0.5 text-xs text-slate-300">{view.reason}</p></li>; })}</ul>;
}
/** Regional soil is shown as an origin, not as "unknown" or as a local result. */
function stateLabel(indicator: QualitativeIndicator, states: Record<IndicatorState, string>, en: boolean): string {
  if (indicator.id === 'soil_context' && indicator.origin === 'regional_estimate') return indicator.state === 'unknown' ? (en ? 'regional estimate' : 'estimativa regional') : `${states[indicator.state]} (${en ? 'regional estimate' : 'estimativa regional'})`;
  return states[indicator.state];
}

export function ScenarioComparisonTable({ data }: { data: AnalysisResult }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const states: Record<IndicatorState, string> = en ? { compatible: 'compatible', attention: 'attention', unknown: 'unknown', yes: 'present', no: 'not cataloged', observed: 'observation' } : stateText;
  const [active, setActive] = useState<'A' | 'B' | 'C'>('A');
  const selected = data.strategies.find((strategy) => strategy.id === active) ?? data.strategies[0];
  return <section className="mt-6 rounded-xl border border-slate-700 bg-slate-900 p-5" aria-labelledby="comparison-heading"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold" id="comparison-heading">{en ? 'Compare criteria' : 'Comparar critérios'}</h2><p className="mt-1 text-sm text-slate-300">{en ? 'Available indicators side by side.' : 'Indicadores disponíveis lado a lado.'}</p></div><ScenarioComparisonShortcut /></div>
    <div className="mt-5 grid grid-cols-3 gap-2 md:hidden" role="tablist" aria-label={en ? 'Choose scenario to compare' : 'Escolher cenário para comparar'}>{data.strategies.map((strategy) => <button aria-controls="mobile-scenario-comparison" aria-selected={active === strategy.id} className={active === strategy.id ? 'rounded-lg bg-lime-300 px-2 py-3 font-bold text-slate-950' : 'rounded-lg border border-slate-600 px-2 py-3 font-bold'} key={strategy.id} role="tab" type="button" onClick={() => setActive(strategy.id)}>{en ? 'Scenario' : 'Cenário'} {strategy.id}</button>)}</div>
    <article className="mt-4 md:hidden" id="mobile-scenario-comparison" role="tabpanel"><h3 className="font-bold">{selected.id}. {scenarioDisplayTitle(selected, locale)}</h3><dl className="mt-3 grid gap-2">{indicatorOrder.map((id) => { const indicator = selected.indicators.find((item) => item.id === id); const display = indicator ? indicatorDisplay(indicator, locale) : null; const emphasized = data.priorityHighlights.includes(id as typeof data.priorityHighlights[number]); return <div className={`rounded-lg border border-slate-700 p-3 ${emphasized ? 'bg-slate-800' : ''}`} key={id}><dt className="text-sm font-semibold">{display?.label ?? id}</dt><dd className="mt-1 font-bold text-lime-300">{indicator ? stateLabel(indicator, states, en) : 'N/D'}</dd>{display ? <dd className="mt-1 text-sm text-slate-300">{display.detail}</dd> : null}</div>; })}<div className="rounded-lg border border-slate-700 p-3"><dt className="text-sm font-semibold">{en ? 'Alignment with your priorities' : 'Alinhamento com suas prioridades'}</dt><dd className="mt-1"><Alignment items={selected.priorityAlignment} locale={locale} /></dd></div></dl><p className="mt-3 text-xs text-slate-300">{en ? 'Use the tabs to compare all three scenarios.' : 'Use as abas para comparar os três cenários.'}</p></article>
    <div className="mt-4 hidden overflow-x-auto md:block"><table className="min-w-[720px] w-full border-collapse text-left text-sm"><thead><tr className="border-b border-slate-700"><th className="p-3" scope="col">{en ? 'Criterion' : 'Critério'}</th>{data.strategies.map((strategy) => <th className="p-3" key={strategy.id} scope="col">{strategy.id}. {scenarioDisplayTitle(strategy, locale)}</th>)}</tr></thead><tbody>{indicatorOrder.map((id) => { const first = data.strategies.flatMap((strategy) => strategy.indicators).find((indicator) => indicator.id === id); return <tr className="border-b border-slate-800" key={id}><th className="p-3 align-top font-semibold" scope="row">{first ? indicatorDisplay(first, locale).label : id}</th>{data.strategies.map((strategy) => { const indicator = strategy.indicators.find((item) => item.id === id); const display = indicator ? indicatorDisplay(indicator, locale) : null; const emphasized = data.priorityHighlights.includes(id as typeof data.priorityHighlights[number]); return <td className={`p-3 align-top ${emphasized ? 'bg-slate-800/80' : ''}`} key={strategy.id}>{indicator && display ? <><b className="text-lime-300">{stateLabel(indicator, states, en)}</b><p className="mt-1 text-xs text-slate-300">{display.detail}</p></> : 'N/D'}</td>; })}</tr>; })}<tr className="border-b border-slate-800"><th className="p-3 align-top font-semibold" scope="row">{en ? 'Alignment with your priorities' : 'Alinhamento com suas prioridades'}</th>{data.strategies.map((strategy) => <td className="p-3 align-top" key={strategy.id}><Alignment items={strategy.priorityAlignment} locale={locale} /></td>)}</tr></tbody></table></div>
  </section>;
}
