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
  const divider = <span className="absolute inset-y-0 w-px bg-slate-700" style={{ left: 12 * CELL }} />;
  return <section aria-labelledby="rotation-summary-heading" className="mt-6 rounded-xl border border-slate-700 bg-slate-900/70 p-4 sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><h2 className="text-xl font-bold" id="rotation-summary-heading">{en ? '24-month rotation' : 'Rotação de 24 meses'}</h2><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{en ? 'Simple view · 3 paths' : 'Visão simples · 3 caminhos'}</p></div>
      <Button className="self-start" type="button" onClick={onAdvanced}>{en ? 'See month-by-month details →' : 'Ver detalhes mês a mês →'}</Button>
    </div>
    <div className="mt-3 flex items-center gap-3 rounded-lg bg-slate-800/60 px-3 py-2"><JoaoFace mood="happy" size={40} /><p className="text-sm text-slate-100">{en ? 'Here is the summary of the three paths. Want to see the why, month by month?' : 'Aqui está o resumo dos três caminhos. Quer ver o porquê, mês a mês?'}</p></div>
    <ul className="sr-only">{summary.lanes.map((lane) => <li key={lane.id}>{en ? 'Scenario' : 'Cenário'} {lane.id}: {lane.description || (en ? 'no crop informed' : 'N/D')}</li>)}</ul>
    <div className="mt-4 overflow-x-auto pb-2" tabIndex={0} role="group" aria-label={en ? '24-month rotation timeline, scrolls sideways' : 'Linha do tempo da rotação de 24 meses, rola para os lados'}>
      <div aria-hidden="true" className="flex min-w-max flex-col gap-3">
        <div className="flex items-end gap-3"><div className="w-28 shrink-0" />
          <div className="relative h-10 shrink-0" style={{ width }}>
            <span className="absolute left-2 top-0 text-xs font-semibold uppercase tracking-wide text-lime-300">{en ? 'Year 1' : 'Ano 1'}</span>
            <span className="absolute top-0 text-xs font-semibold uppercase tracking-wide text-lime-300" style={{ left: 12 * CELL + 8 }}>{en ? 'Year 2' : 'Ano 2'}</span>
            {summary.monthLabels.map((label, index) => <i className="absolute bottom-0 text-center text-xs font-semibold not-italic leading-5 text-slate-300" key={index} style={{ left: index * CELL, width: CELL }}>{label}</i>)}
            {divider}
          </div><div className="w-60 shrink-0" /></div>
        {summary.lanes.map((lane) => <div className="flex items-start gap-3" key={lane.id}>
          <div className="flex h-16 w-28 shrink-0 items-center gap-2"><i className={`grid size-7 shrink-0 place-items-center rounded-md text-sm font-bold not-italic ${BADGE[lane.id]}`}>{lane.id}</i><span className="line-clamp-2 min-w-0 text-sm font-semibold leading-tight text-slate-50">{lane.title}</span></div>
          <div className="relative h-[76px] shrink-0" style={{ width }}>
            {divider}
            {lane.blocks.map((block) => {
              const wide = block.months >= 4; const mid = block.months === 3;
              return <div className={`absolute top-0 flex h-16 items-center justify-center gap-2 overflow-hidden rounded-lg border bg-slate-800 px-1 ${wide ? 'flex-row' : 'flex-col gap-0.5'} ${lane.id !== 'A' && block.slotIndex % 2 === 1 ? 'border-lime-300' : 'border-slate-600'}`} key={block.slotIndex} title={block.cropName} style={{ left: block.startOffset * CELL + 2, width: block.months * CELL - 4 }}><CropSprite cropId={block.cropId} name="" size={28} />{wide || mid ? <b className={`min-w-0 truncate text-sm font-semibold leading-tight text-slate-50 ${mid ? 'max-w-full' : ''}`}>{block.cropName}</b> : null}</div>;
            })}
            {lane.bareRuns.map((run) => <div className="absolute top-[68px] h-1.5 rounded opacity-75" key={run.startOffset} style={{ left: run.startOffset * CELL + 2, width: run.months * CELL - 4, background: HATCH }} />)}
          </div>
          <div className={`flex h-16 w-60 shrink-0 flex-col justify-center gap-0.5 overflow-hidden rounded-lg border-l-4 bg-slate-800 px-3 ${lane.outcome.kind === 'reference' ? 'border-slate-600' : 'border-lime-300'}`}>
            {lane.outcome.kind === 'reference' ? <div className="text-sm font-semibold text-slate-400">{en ? 'reference' : 'referência'}</div> : <>
              {lane.outcome.waterDeltaMm === null
                ? <div className="line-clamp-2 text-sm font-semibold leading-tight text-slate-200">{lane.outcome.missingReason === 'base_missing' ? (en ? 'Path A has no second crop to compare' : 'A não tem 2ª safra para comparar') : (en ? 'No water data' : 'Sem dados de água')}</div>
                : <><div className="text-xl font-bold leading-none text-sky-300">{mm(lane.outcome.waterDeltaMm)}</div><div className="line-clamp-2 text-xs leading-tight text-slate-300">{en ? 'of water in the second crop vs A' : 'de água na segunda cultura vs A'}</div></>}
              {lane.outcome.tag ? <div className="line-clamp-2 text-xs leading-tight text-slate-300">{lane.outcome.tag.kind === 'no_zarc' ? (en ? `no ZARC window for ${lane.outcome.tag.cropName}` : `sem janela ZARC para ${lane.outcome.tag.cropName}`) : lane.outcome.tag.text}</div> : null}
            </>}
          </div>
        </div>)}
        <div className="flex items-center gap-2 text-xs text-slate-400"><span className="inline-block h-1.5 w-6 rounded opacity-75" style={{ background: HATCH }} />{en ? 'months of bare soil' : 'meses de solo descoberto'}{anyBareUnknown ? <span>{en ? ' (N/D for some scenarios)' : ' (N/D em alguns cenários)'}</span> : null}</div>
      </div>
    </div>
  </section>;
}
