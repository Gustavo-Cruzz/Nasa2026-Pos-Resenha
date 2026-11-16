'use client';

import { useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import { SoilTerrainTab } from '@/components/rotation-timeline/soil-terrain-tab';
import { SourcesTab } from '@/components/rotation-timeline/sources-tab';
import { TechnicianTab } from '@/components/rotation-timeline/technician-tab';
import type { AnalysisResult } from '@/lib/engine/types';

const TAB_IDS = ['soil', 'sources', 'technician'] as const;
type TabId = (typeof TAB_IDS)[number];

/** Non-monthly data: soil and relief, sources and quality, hand-off to a technician. */
export function BottomTabs({ data }: { data: AnalysisResult }) {
  const { locale } = useLocale(); const en = locale === 'en';
  const [tab, setTab] = useState<TabId>('soil');
  const labels: Record<TabId, string> = { soil: en ? 'Soil and relief' : 'Solo e relevo', sources: en ? 'Sources and quality' : 'Fontes e qualidade', technician: en ? 'Take to a technician' : 'Leve ao técnico' };
  const move = (delta: number) => { const next = TAB_IDS[(TAB_IDS.indexOf(tab) + delta + TAB_IDS.length) % TAB_IDS.length]!; setTab(next); window.setTimeout(() => document.getElementById(`rt-btab-${next}`)?.focus()); };
  return <section aria-label={en ? 'Data that is not monthly' : 'Dados que não são mensais'} className="mt-5">
    <div aria-label={en ? 'Data that is not monthly' : 'Dados que não são mensais'} className="flex gap-1 overflow-x-auto border-b border-[#405840]" role="tablist" onKeyDown={(event) => { if (event.key === 'ArrowRight') { event.preventDefault(); move(1); } else if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); } }}>
      {TAB_IDS.map((id) => <button aria-controls={`rt-btab-panel-${id}`} aria-selected={tab === id} className={`whitespace-nowrap border-b-[3px] px-4 py-2.5 text-sm font-bold ${tab === id ? 'border-lime-300 text-slate-50' : 'border-transparent text-slate-400 hover:text-slate-200'}`} id={`rt-btab-${id}`} key={id} role="tab" tabIndex={tab === id ? 0 : -1} type="button" onClick={() => setTab(id)}>{labels[id]}</button>)}
    </div>
    <div aria-labelledby={`rt-btab-${tab}`} className="py-4" id={`rt-btab-panel-${tab}`} role="tabpanel">
      {tab === 'soil' ? <SoilTerrainTab data={data} /> : tab === 'sources' ? <SourcesTab data={data} /> : <TechnicianTab data={data} />}
    </div>
  </section>;
}
