'use client';

import { CropSprite } from '@/components/crops/crop-sprite';
import { JoaoFace } from '@/components/joao/joao-figure';
import { useLocale } from '@/components/locale-provider';
import { Button } from '@/components/ui/button';
import { buildRotationSummary, HORIZON_MONTHS, type RotationLane } from '@/lib/rotation-summary';
import type { AnalysisResult } from '@/lib/engine/types';

const CELL = 32;
const HATCH = 'repeating-linear-gradient(45deg,#e7bf62 0 3px,transparent 3px 6px)';
const BADGE: Record<RotationLane['id'], string> = { A: 'bg-slate-300 text-slate-950', B: 'bg-lime-300 text-slate-950', C: 'bg-sky-300 text-slate-950' };

export function RotationSummaryCard({ data, onAdvanced }: { data: AnalysisResult; onAdvanced: () => void }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const summary = buildRotationSummary(data, locale);
  const width = HORIZON_MONTHS * CELL;
  const mm = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(Math.round(value))} mm`;
  const anyBareUnknown = summary.lanes.some((lane) => !lane.bareKnown);
  return <section aria-labelledby="rotation-summary-heading" className="mt-6 rounded-xl border border-slate-700 bg-slate-900/70 p-5">
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div><h2 className="text-2xl font-bold" id="rotation-summary-heading">{en ? '24-month rotation' : 'Rotação de 24 meses'}</h2><p className="mt-0.5 font-mono text-xs uppercase tracking-wide text-slate-400">{en ? 'Simple view · 3 paths' : 'Visão simples · 3 caminhos'}</p></div>
      <div className="flex min-w-[16rem] flex-1 items-center gap-3"><JoaoFace mood="happy" size={52} /><p className="text-base text-slate-100">{en ? 'Here is the summary of the three paths. Want to see the why, month by month?' : 'Aqui está o resumo dos três caminhos. Quer ver o porquê, mês a mês?'}</p></div>
      <Button type="button" onClick={onAdvanced}>{en ? 'See month-by-month details →' : 'Ver detalhes mês a mês →'}</Button>
    </div>
    <ul className="sr-only">{summary.lanes.map((lane) => <li key={lane.id}>{en ? 'Scenario' : 'Cenário'} {lane.id}: {lane.description || (en ? 'no crop informed' : 'N/D')}</li>)}</ul>
    <div className="mt-4 overflow-x-auto pb-2" tabIndex={0} role="group" aria-label={en ? '24-month rotation timeline, scrolls sideways' : 'Linha do tempo da rotação de 24 meses, rola para os lados'}>
      <div aria-hidden="true" className="flex min-w-max flex-col gap-3">
        <div className="flex items-end gap-4"><div className="w-[140px] shrink-0" />
          <div className="relative h-10 shrink-0" style={{ width }}>
            <span className="absolute left-0 top-0 text-[11px] font-extrabold tracking-wider text-lime-300">{en ? 'YEAR 1' : 'ANO 1'}</span>
            <span className="absolute top-0 text-[11px] font-extrabold tracking-wider text-lime-300" style={{ left: 12 * CELL + 2 }}>{en ? 'YEAR 2' : 'ANO 2'}</span>
            {summary.monthLabels.map((label, index) => <i className="absolute top-5 text-center text-[11px] font-bold not-italic leading-5 text-slate-200" key={index} style={{ left: index * CELL, width: CELL }}>{label}</i>)}
            <span className="absolute inset-y-0 w-0.5 bg-slate-600" style={{ left: 12 * CELL - 1 }} />
          </div><div className="w-[284px] shrink-0" /></div>
        {summary.lanes.map((lane) => <div className="flex items-center gap-4" key={lane.id}>
          <div className="flex w-[140px] shrink-0 flex-col gap-1.5 text-base font-extrabold leading-tight text-slate-50"><i className={`grid size-8 place-items-center rounded-lg text-xl not-italic ${BADGE[lane.id]}`}>{lane.id}</i>{lane.title}</div>
          <div className="relative h-[120px] shrink-0" style={{ width }}>
            {lane.blocks.map((block) => <div className={`absolute top-0 flex h-[104px] flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 bg-slate-800 ${lane.id !== 'A' && block.slotIndex % 2 === 1 ? 'border-lime-300' : 'border-slate-700'}`} key={block.slotIndex} style={{ left: block.startOffset * CELL + 2, width: block.months * CELL - 4 }}><CropSprite cropId={block.cropId} name="" size={44} /><b className="max-w-full truncate px-1 text-[17px] leading-none text-slate-50">{block.cropName}</b></div>)}
            {lane.bareRuns.map((run) => <div className="absolute top-[110px] h-2 rounded opacity-75" key={run.startOffset} style={{ left: run.startOffset * CELL + 2, width: run.months * CELL - 4, background: HATCH }} />)}
          </div>
          <div className={`flex h-[120px] w-[284px] shrink-0 flex-col justify-center gap-1 overflow-hidden rounded-2xl border-l-4 bg-slate-800 px-4 py-3 ${lane.outcome.kind === 'reference' ? 'border-slate-600' : 'border-lime-300'}`}>
            {lane.outcome.kind === 'reference' ? <div className="text-2xl font-extrabold text-slate-50">{en ? 'reference' : 'referência'}</div> : <>
              <div className="text-3xl font-extrabold leading-none text-sky-300">{lane.outcome.waterDeltaMm === null ? 'N/D' : mm(lane.outcome.waterDeltaMm)}</div>
              <div className="text-[15px] font-bold leading-tight text-slate-50">{en ? 'of water in the second crop vs A' : 'de água na segunda cultura vs A'}{lane.outcome.tag ? ` · ${lane.outcome.tag.kind === 'no_zarc' ? (en ? `no ZARC window for ${lane.outcome.tag.cropName}` : `sem janela ZARC para ${lane.outcome.tag.cropName}`) : lane.outcome.tag.text}` : ''}</div>
            </>}
          </div>
        </div>)}
        <div className="flex items-center gap-2.5 text-[13px] text-slate-400"><span className="inline-block h-2 w-[26px] rounded opacity-75" style={{ background: HATCH }} />{en ? 'months of bare soil' : 'meses de solo descoberto'}{anyBareUnknown ? <span>{en ? ' (N/D for some scenarios)' : ' (N/D em alguns cenários)'}</span> : null}</div>
      </div>
    </div>
  </section>;
}
