'use client';

import { useState } from 'react';
import { ArrowDown, ExternalLink } from 'lucide-react';
import type { NasaInsight, NasaInsightEffect } from '@/lib/engine/types';
import { useLocale } from '@/components/locale-provider';
import { EvidenceIcon } from '@/components/pixel/evidence-icon';
import { cropDisplayName } from '@/lib/presentation';

const monthNames = {
  'pt-BR': ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
} as const;

const tone: Record<NasaInsightEffect['state'], string> = {
  compatible: 'border-cyan-300/60 bg-cyan-500/10 text-cyan-100',
  attention: 'border-amber-300/60 bg-amber-950/40 text-amber-100',
  observed: 'border-cyan-300/60 bg-cyan-500/10 text-cyan-100',
  unknown: 'border-slate-600 bg-slate-950/40 text-slate-300',
};

export function NasaInsightPanel({ insights = [], initialMonth }: { insights?: NasaInsight[]; initialMonth: number }) {
  const { copy, locale } = useLocale();
  const [month, setMonth] = useState(initialMonth);
  const insight = insights.find((item) => item.month === month) ?? insights[initialMonth - 1];
  if (!insight) return null;
  const headline = insight.status === 'contrast' ? copy.nasaInsightContrast : insight.status === 'shared_signal' ? copy.nasaInsightShared : insight.status === 'observational' ? copy.nasaInsightObserved : copy.nasaInsightUnknown;
  const stateLabel = (state: NasaInsightEffect['state']) => state === 'compatible' ? copy.nasaInsightCompatible : state === 'attention' ? copy.nasaInsightAttention : state === 'observed' ? copy.nasaInsightObservedState : copy.nasaInsightUnknownState;
  const ruleLabel = (effect: NasaInsightEffect) => effect.ruleId === 'DOCUMENTED_THERMAL_RANGE' ? copy.nasaInsightThermalRule : effect.ruleId === 'HISTORICAL_PRECIPITATION_ONLY' ? copy.nasaInsightPrecipRule : copy.nasaInsightMissingRule;

  return <section className="mt-6 overflow-hidden rounded-xl border border-cyan-300/60 bg-slate-900" aria-labelledby="nasa-insight-heading">
    <div className="border-b border-cyan-300/20 bg-cyan-500/10 p-5 sm:flex sm:items-start sm:justify-between sm:gap-5">
      <div><h2 className="flex items-center gap-2 text-xl font-bold" id="nasa-insight-heading"><EvidenceIcon kind="nasa" />{copy.nasaInsightTitle}</h2></div>
      <label className="mt-4 block text-sm font-semibold sm:mt-0">{copy.nasaInsightMonth}<select className="mt-1 block min-h-11 rounded-lg border border-cyan-300/50 bg-slate-950 px-3" value={month} onChange={(event) => setMonth(Number(event.target.value))}>{monthNames[locale].map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label>
    </div>
    <div className="p-5" aria-live="polite">
      <div className="grid gap-3 text-center sm:grid-cols-[1fr_auto_1.3fr] sm:items-center sm:text-left">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">NASA POWER · {monthNames[locale][month - 1]}</p><p className="mt-1 text-3xl font-bold">{insight.observedValue === null ? 'N/D' : `${insight.observedValue} ${insight.unit}`}</p>{insight.period ? <p className="mt-1 text-xs text-slate-400">{insight.period.start}–{insight.period.end} · {insight.coveragePct ?? 'N/D'}%</p> : null}</div>
        <ArrowDown className="mx-auto text-cyan-300 sm:-rotate-90" aria-hidden="true" />
        <div><p className="font-bold">{headline}</p></div>
      </div>
      <p className="mt-4 text-xs text-slate-400">{locale === 'en' ? 'Changing the month here does not alter crops, priorities, or the saved plan.' : 'Trocar o mês aqui não altera culturas, prioridades nem o plano salvo.'}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">{insight.effects.map((effect) => <article className={`rounded-lg border p-3 ${tone[effect.state]}`} key={effect.scenarioId}><p className="text-xs font-semibold uppercase">{locale === 'en' ? 'Scenario' : 'Cenário'} {effect.scenarioId}</p><p className="mt-1 font-bold">{cropDisplayName(effect.cropId, effect.cropName, locale)} · {stateLabel(effect.state)}</p><p className="mt-2 text-xs"><b>{copy.nasaInsightRule}:</b> {ruleLabel(effect)}</p>{effect.documentedRangeC ? <p className="mt-1 text-xs">{effect.documentedRangeC.min}–{effect.documentedRangeC.max} °C</p> : null}</article>)}</div>
      {insight.sourceUrl ? <a className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline" href={insight.sourceUrl} rel="noreferrer" target="_blank">{copy.nasaInsightSource}<ExternalLink size={15} aria-hidden="true" /></a> : null}
    </div>
  </section>;
}
