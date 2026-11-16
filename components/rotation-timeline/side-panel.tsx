'use client';

import { useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';
import { MonthTab } from '@/components/rotation-timeline/month-tab';
import { ScenarioTab } from '@/components/rotation-timeline/scenario-tab';
import type { AnalysisResult } from '@/lib/engine/types';
import type { LaneModel, ScenarioId, TimelineModel } from '@/lib/rotation-timeline/model';
import { MONTH_LONG } from '@/lib/rotation-timeline/text';
import type { WhatIf } from '@/lib/rotation-timeline/what-if';

export type PanelTab = 'month' | 'scenario';
const query = '(min-width: 1024px)';
const subscribe = (callback: () => void) => { const media = window.matchMedia(query); media.addEventListener('change', callback); return () => media.removeEventListener('change', callback); };
const useIsDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => true);

type Props = { data: AnalysisResult; model: TimelineModel; lanes: LaneModel[]; offset: number; whatIf: WhatIf; tab: PanelTab; onTab: (tab: PanelTab) => void; scenario: ScenarioId | null; onNav: (delta: number) => void; sheetOpen: boolean; onSheetOpen: (open: boolean) => void };

/** Side panel on desktop; a bottom sheet with a grip on small screens. */
export function SidePanel({ data, model, lanes, offset, whatIf, tab, onTab, scenario, onNav, sheetOpen, onSheetOpen }: Props) {
  const { locale } = useLocale(); const en = locale === 'en'; const desktop = useIsDesktop();
  const lane = lanes.find((item) => item.id === scenario) ?? model.lanes.find((item) => item.id === scenario) ?? null;
  const collapsed = !desktop && !sheetOpen;
  const title = tab === 'month' ? MONTH_LONG[locale][model.months[offset]!.month - 1] : lane ? `${en ? 'Scenario' : 'Cenário'} ${lane.id}` : (en ? 'Scenario' : 'Cenário');
  const tabs: Array<{ id: PanelTab; label: string }> = [{ id: 'month', label: en ? 'Month' : 'Mês' }, { id: 'scenario', label: en ? 'Scenario' : 'Cenário' }];
  return <aside aria-label={en ? 'Month and scenario panel' : 'Painel do mês e do cenário'} className={`rounded-2xl border border-slate-700 bg-slate-900 p-3 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:max-h-[72vh] max-lg:overflow-auto max-lg:rounded-b-none max-lg:border-[#405840] max-lg:shadow-[0_-8px_24px_rgba(0,0,0,0.65)] max-lg:transition-transform max-lg:duration-200 motion-reduce:transition-none lg:sticky lg:top-3 lg:max-h-[calc(100vh-1.5rem)] lg:overflow-auto ${sheetOpen ? 'max-lg:translate-y-0' : 'max-lg:translate-y-[calc(100%-64px)]'}`}>
    <button aria-expanded={sheetOpen} className="relative -mt-1 mb-1 flex h-11 w-full items-center justify-between gap-2 text-left lg:hidden" type="button" onClick={() => onSheetOpen(!sheetOpen)}>
      <i aria-hidden="true" className="absolute left-1/2 top-0.5 h-1.5 w-11 -translate-x-1/2 rounded-full bg-[#405840]" />
      <span className="mt-3 font-bold">{title}</span><span className="mt-3 rounded-full border border-[#405840] px-2 py-0.5 text-[11px]">{sheetOpen ? (en ? 'tap to close' : 'toque para fechar') : (en ? 'tap to open' : 'toque para abrir')}</span>
    </button>
    <div aria-hidden={collapsed ? true : undefined} inert={collapsed}>
      <div className="mb-3 flex items-center gap-2">
        <div aria-label={en ? 'Panel view' : 'Visão do painel'} className="flex flex-1 overflow-hidden rounded-[10px] border border-[#405840]" role="tablist">
          {tabs.map((item) => <button aria-controls="rt-panel-body" aria-selected={tab === item.id} className={`flex-1 px-3 py-2 text-[13px] font-semibold ${tab === item.id ? 'bg-lime-300 text-slate-950' : 'text-slate-200'}`} id={`rt-ptab-${item.id}`} key={item.id} role="tab" tabIndex={tab === item.id ? 0 : -1} type="button" onClick={() => onTab(item.id)} onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); const next = tab === 'month' ? 'scenario' : 'month'; onTab(next); window.setTimeout(() => document.getElementById(`rt-ptab-${next}`)?.focus()); } }}>{item.label}</button>)}
        </div>
        <button aria-label={en ? 'Close panel' : 'Fechar painel'} className="grid h-8 w-8 place-items-center rounded-lg border border-[#405840] lg:hidden" type="button" onClick={() => onSheetOpen(false)}><X aria-hidden="true" size={16} /></button>
      </div>
      <div aria-labelledby={`rt-ptab-${tab}`} id="rt-panel-body" role="tabpanel">
        {tab === 'month' ? <MonthTab data={data} lanes={lanes} locale={locale} model={model} offset={offset} whatIf={whatIf} onNav={onNav} /> : <ScenarioTab data={data} lane={lane} locale={locale} />}
      </div>
    </div>
  </aside>;
}
