'use client';

import { useMemo, useState } from 'react';
import { BottomTabs } from '@/components/rotation-timeline/bottom-tabs';
import { SidePanel, type PanelTab } from '@/components/rotation-timeline/side-panel';
import { SummaryHeader } from '@/components/rotation-timeline/summary-header';
import { TimelineCard } from '@/components/rotation-timeline/timeline-card';
import { BAND_IDS, type BandId } from '@/components/rotation-timeline/timeline-bands';
import { WhatIfControls, type TimelineView } from '@/components/rotation-timeline/what-if-controls';
import { useLocale } from '@/components/locale-provider';
import type { AnalysisResult } from '@/lib/engine/types';
import { HORIZON, buildTimelineModel, type ScenarioId } from '@/lib/rotation-timeline/model';
import { NO_WHAT_IF, type WhatIf } from '@/lib/rotation-timeline/what-if';

const ALL_OPEN = Object.fromEntries(BAND_IDS.map((id) => [id, true])) as Record<BandId, boolean>;

/** "Rotation timeline" screen: 24-month lanes, evidence bands on the same month ruler, month/scenario side panel and non-monthly tabs. */
export function RotationTimelineView({ data }: { data: AnalysisResult }) {
  const { locale } = useLocale(); const en = locale === 'en';
  const model = useMemo(() => buildTimelineModel(data), [data]);
  const [whatIf, setWhatIf] = useState<WhatIf>(NO_WHAT_IF);
  const [view, setView] = useState<TimelineView>('abc');
  const [pin, setPin] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [tab, setTab] = useState<PanelTab>('month');
  const [scenario, setScenario] = useState<ScenarioId | null>(null);
  const [openBands, setOpenBands] = useState<Record<BandId, boolean>>(ALL_OPEN);
  const [thermalSc, setThermalSc] = useState<ScenarioId>('A');
  const [sheetOpen, setSheetOpen] = useState(false);
  const lanes = useMemo(() => view === 'ab' ? model.lanes.filter((lane) => lane.id !== 'C') : model.lanes, [model, view]);
  const cursor = hover ?? pin;
  const nav = (delta: number) => { setHover(null); setPin((value) => Math.min(HORIZON - 1, Math.max(0, value + delta))); };
  const selectScenario = (id: ScenarioId) => { setScenario(id); setTab('scenario'); setSheetOpen(true); };
  if (!model.lanes.length) return <p className="mt-6 rounded-xl border border-slate-700 p-4 text-sm" role="status">{en ? 'N/D: no scenario was produced for this analysis, so there is no timeline to draw.' : 'N/D: nenhum cenário foi produzido nesta análise, então não há linha do tempo para desenhar.'}</p>;
  return <div className="pb-16 lg:pb-0">
    <SummaryHeader data={data} model={model} whatIf={whatIf} />
    <div className="mt-3"><WhatIfControls view={view} whatIf={whatIf} onView={setView} onWhatIf={setWhatIf} /></div>
    <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <TimelineCard cursor={cursor} hover={hover} lanes={lanes} model={model} openBands={openBands} pin={pin} selected={scenario} thermalSc={lanes.some((lane) => lane.id === thermalSc) ? thermalSc : 'A'} whatIf={whatIf} onHover={setHover} onOpenBands={setOpenBands} onPin={(offset) => { setHover(null); setPin(offset); }} onSelectScenario={selectScenario} onThermalSc={setThermalSc} />
      <SidePanel data={data} lanes={lanes} model={model} offset={cursor} scenario={scenario} sheetOpen={sheetOpen} tab={tab} whatIf={whatIf} onNav={nav} onSheetOpen={setSheetOpen} onTab={setTab} />
    </div>
    <BottomTabs data={data} />
  </div>;
}
