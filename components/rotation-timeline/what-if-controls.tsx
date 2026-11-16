'use client';

import { useId } from 'react';
import { useLocale } from '@/components/locale-provider';
import { Term } from '@/components/rotation-timeline/glossary-term';
import { formatNumber } from '@/lib/rotation-timeline/text';
import { NO_WHAT_IF, WHAT_IF_LIMITS, isHypothetical, normalizeWhatIf, type WhatIf } from '@/lib/rotation-timeline/what-if';

export type TimelineView = 'abc' | 'ab';

export function WhatIfControls({ whatIf, onWhatIf, view, onView }: { whatIf: WhatIf; onWhatIf: (next: WhatIf) => void; view: TimelineView; onView: (view: TimelineView) => void }) {
  const { locale } = useLocale(); const en = locale === 'en'; const id = useId();
  const views: Array<{ id: TimelineView; label: string }> = [{ id: 'abc', label: en ? 'A, B and C' : 'A, B e C' }, { id: 'ab', label: en ? 'A vs B only' : 'Só A vs B' }];
  return <section aria-label={en ? 'What-if controls' : 'Controles'} className="flex flex-wrap items-end gap-x-6 gap-y-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
    <div className="min-w-[10rem] flex-1 sm:flex-none">
      <label className="mb-0.5 block text-xs text-slate-300" htmlFor={`${id}-t`}>{en ? 'What if? Temperature' : 'E se? Temperatura'} <Term k="hip">({en ? 'hypothetical' : 'hipotético'})</Term></label>
      <input className="w-full accent-lime-300 sm:w-44" id={`${id}-t`} max={WHAT_IF_LIMITS.temp.max} min={WHAT_IF_LIMITS.temp.min} step={WHAT_IF_LIMITS.temp.step} type="range" value={whatIf.tempC} onChange={(event) => onWhatIf(normalizeWhatIf({ ...whatIf, tempC: Number(event.target.value) }))} />
      <output className="block font-mono text-[13px]" htmlFor={`${id}-t`}>{formatNumber(whatIf.tempC, 1, locale, { sign: true })} °C</output>
    </div>
    <div className="min-w-[10rem] flex-1 sm:flex-none">
      <label className="mb-0.5 block text-xs text-slate-300" htmlFor={`${id}-r`}>{en ? 'What if? Rain' : 'E se? Chuva'}</label>
      <input className="w-full accent-lime-300 sm:w-44" id={`${id}-r`} max={WHAT_IF_LIMITS.rain.max} min={WHAT_IF_LIMITS.rain.min} step={WHAT_IF_LIMITS.rain.step} type="range" value={whatIf.rainPct} onChange={(event) => onWhatIf(normalizeWhatIf({ ...whatIf, rainPct: Number(event.target.value) }))} />
      <output className="block font-mono text-[13px]" htmlFor={`${id}-r`}>{formatNumber(whatIf.rainPct, 0, locale, { sign: true })} %</output>
    </div>
    <div><span className="mb-0.5 block text-xs text-slate-300" id={`${id}-v`}>{en ? 'Lanes' : 'Raias'}</span><div aria-labelledby={`${id}-v`} className="inline-flex overflow-hidden rounded-[10px] border border-[#405840]" role="group">{views.map((item) => <button aria-pressed={view === item.id} className={`min-h-9 px-3 text-[13px] font-semibold ${view === item.id ? 'bg-lime-300 text-slate-950' : 'text-slate-200'}`} key={item.id} type="button" onClick={() => onView(item.id)}>{item.label}</button>)}</div></div>
    <button className="min-h-9 rounded-[10px] border border-[#405840] px-3 text-[13px] font-semibold hover:border-lime-300 disabled:opacity-50" disabled={!isHypothetical(whatIf)} type="button" onClick={() => onWhatIf(NO_WHAT_IF)}>{en ? 'Reset what-if' : 'Zerar E se?'}</button>
    <p aria-live="polite" className={`m-0 rounded-full border border-dashed border-[#E7BF62] bg-[#3a3015] px-2.5 py-0.5 text-xs font-bold text-[#E7BF62] ${isHypothetical(whatIf) ? '' : 'hidden'}`} role="status">{en ? 'hypothetical: not a forecast; ET₀ is not recalculated' : 'hipotético: não é previsão; ET₀ não é recalculada'}</p>
    <p className="m-0 w-full text-[11px] text-slate-400">{en ? 'The sliders only shift the displayed rain and mean temperature (the original stays dashed). They never change crops, windows or ET₀.' : 'Os controles só deslocam a chuva e a temperatura média exibidas (o original fica tracejado). Não mudam culturas, janelas nem a ET₀.'}</p>
  </section>;
}
