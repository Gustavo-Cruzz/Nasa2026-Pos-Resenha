'use client';

import Link from 'next/link';
import { CropSprite } from '@/components/crops/crop-sprite';
import type { Locale } from '@/lib/i18n';
import { AXIS_LABELS, orderAxes } from '@/lib/engine/tradeoffs';
import type { AnalysisResult } from '@/lib/engine/types';
import { alignmentDisplay, cropDisplayName, missingLabel, scenarioDisplayTitle } from '@/lib/presentation';
import { type LaneModel } from '@/lib/rotation-timeline/model';
import { MONTH_SHORT } from '@/lib/rotation-timeline/text';
import { Term } from '@/components/rotation-timeline/glossary-term';

const BADGE = { A: 'bg-[#FBF8F0]', B: 'bg-[#8DC8CF]', C: 'bg-[#B6DC63]' } as const;

export function ScenarioTab({ data, lane, locale }: { data: AnalysisResult; lane: LaneModel | null; locale: Locale }) {
  const en = locale === 'en';
  if (!lane) return <p className="text-sm text-slate-300">{en ? 'Click a crop bar in the timeline to open that scenario card.' : 'Clique numa barra de cultura da linha do tempo para abrir o cartão do cenário.'}</p>;
  const rotation = lane.rotation; const tradeoffs = rotation.tradeoffs; const summary = tradeoffs?.summary;
  const gains = summary ? (en ? summary.gainsEn : summary.gains) : []; const losses = summary ? (en ? summary.lossesEn : summary.losses) : []; const unknowns = summary ? (en ? summary.unknownsEn : summary.unknowns) : [];
  const missing = [...new Set([...rotation.missingData, ...(rotation.bareSoil?.missing ?? [])])].map((id) => missingLabel(id, locale));
  const zarcUnknown = [...new Set(lane.zarc.filter((cell) => cell?.sowing && cell.status === 'unknown').map((cell) => en ? cell!.noteEn : cell!.note))];
  const axes = orderAxes(data.input.priorities);
  const slotLabel = (slot: { year: number; season: 'A' | 'B' }) => `${en ? 'Year' : 'Ano'} ${slot.year} · ${slot.season === 'A' ? (en ? 'main crop' : 'safra') : 'safrinha'}`;
  const column = (title: string, tone: string, items: string[], empty: string) => <div className={`my-1.5 rounded-r-lg border-l-[3px] bg-slate-900/80 px-2.5 py-1.5 text-[13px] ${tone}`}><h5 className="m-0 text-xs font-bold uppercase tracking-wide">{title}</h5>{items.length ? <ul className="m-0 list-disc pl-4">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="m-0 text-slate-300">{empty}</p>}</div>;
  return <article aria-label={`${en ? 'Scenario' : 'Cenário'} ${lane.id}`}>
    <header className="flex items-center gap-2"><span className={`grid h-7 w-7 flex-none place-items-center rounded-lg text-sm font-extrabold text-[#142018] ${BADGE[lane.id]}`}>{lane.id}</span><h3 className="m-0 text-base font-bold leading-tight">{scenarioDisplayTitle(rotation, locale)}</h3></header>
    {rotation.baselineAssumed ? <p className="mt-2 rounded-lg border border-[#E7BF62] bg-[#3a3015] px-2.5 py-1.5 text-xs text-[#F1D58A]">{en ? 'Assumed continuity: confirm or edit this plan.' : 'Continuidade presumida: confirme ou edite este plano.'}</p> : null}
    <section className="mt-3" aria-label={en ? 'Crops by slot' : 'Culturas por slot'}>
      <h4 className="mb-1 text-sm font-bold">{en ? 'Sequence over 24 months' : 'Sequência em 24 meses'}</h4>
      <ul className="m-0 list-none p-0 text-[13px]">
        {(rotation.slots ?? []).map((slot, index) => { const segment = lane.segments.find((item) => item.slotIndex === index); return <li className="flex flex-wrap items-center gap-x-2 py-0.5" key={index}><span className="text-slate-400">{slotLabel(slot)}</span>{slot.cropId ? <span className="inline-flex items-center gap-1 font-bold"><CropSprite cropId={slot.cropId} name="" size={16} />{cropDisplayName(slot.cropId, slot.cropName, locale)}</span> : <span>N/D</span>}{segment ? <span className="text-xs text-slate-300">{MONTH_SHORT[locale][segment.months[0]! - 1]}–{MONTH_SHORT[locale][segment.months.at(-1)! - 1]} · {segment.simulationWarning ? `simulação exploratória: ${segment.simulationWarning}` : segment.simulationWarning ? segment.simulationWarning : segment.source === 'documented_cycle' ? (en ? `documented cycle up to ${segment.cycleDays} d` : `ciclo documentado até ${segment.cycleDays} d`) : (en ? 'assumed window length (cycle not documented)' : 'duração presumida (ciclo não documentado)')}</span> : <span className="text-xs text-amber-200">{en ? 'N/D: no window' : 'N/D: sem janela'}</span>}</li>; })}
        {!rotation.slots?.length ? <li className="text-amber-200">N/D</li> : null}
      </ul>
    </section>
    <section className="mt-2" aria-label={en ? 'Gains, losses and unknowns' : 'Ganha, perde e não sabemos'}>
      {lane.id === 'A' || !summary ? <p className="m-0 rounded-lg border border-slate-600 px-2.5 py-1.5 text-[13px] text-slate-300">{lane.id === 'A' ? (en ? 'Reference scenario: B and C are compared against it.' : 'Cenário de referência: B e C são comparados com ele.') : (en ? 'N/D: no trade-off comparison is available for this scenario.' : 'N/D: não há comparação de ganhos e perdas para este cenário.')}</p> : <>
        {column(en ? 'Gains' : 'Ganha', 'border-cyan-300 [&_h5]:text-cyan-200', gains, en ? 'No documented gain.' : 'Nenhum ganho documentado.')}
        {column(en ? 'Loses' : 'Perde', 'border-[#E7BF62] [&_h5]:text-[#E7BF62]', losses, en ? 'No documented loss.' : 'Nenhuma perda documentada.')}
        {column(en ? 'We do not know' : 'Não sabemos', 'border-slate-400 [&_h5]:text-slate-200', unknowns, en ? 'Nothing flagged.' : 'Nada sinalizado.')}
        <details className="mt-1 rounded-lg border border-slate-700 px-2.5 py-1"><summary className="cursor-pointer text-[13px] font-bold">{en ? 'Six axes against A' : 'Seis eixos contra o A'}</summary><ul className="m-0 mt-1 list-none p-0 text-xs text-slate-300">{axes.map((axis) => { const cell = tradeoffs?.cells.find((item) => item.axis === axis); return <li className="py-0.5" key={axis}><b>{AXIS_LABELS[axis][en ? 'en' : 'pt']}:</b> {cell ? (en ? cell.summaryEn : cell.summary) : 'N/D'}</li>; })}</ul></details>
      </>}
    </section>
    {rotation.bareSoil ? <p className="mt-2 text-xs text-slate-300"><b><Term k="bare">{en ? 'Bare soil' : 'Solo descoberto'}</Term>:</b> {en ? rotation.bareSoil.detailEn : rotation.bareSoil.detail}</p> : null}
    {zarcUnknown.length ? <div className="mt-2 rounded-lg border border-amber-300/40 p-2 text-xs"><b>ZARC · N/D</b><ul className="mt-1 list-disc pl-4">{zarcUnknown.map((reason) => <li key={reason}>{reason}</li>)}</ul><p className="mt-1 text-lime-200">{en ? 'Check municipality, crop year, crop and soil/cycle group in the official table; no record does not mean unsuitable.' : 'Confira município, safra, cultura e tipo de solo/grupo de ciclo na tabela oficial; ausência de registro não significa inaptidão.'}</p></div> : null}
    <section className="mt-2" aria-label={en ? 'To validate' : 'O que validar'}>
      <h4 className="mb-1 text-sm font-bold">{en ? 'What to validate' : 'O que validar'}</h4>
      {missing.length ? <ul className="m-0 list-disc pl-5 text-[13px]">{missing.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="m-0 text-[13px] text-slate-300">{en ? 'No critical cataloged gap.' : 'Nenhuma lacuna crítica catalogada.'}</p>}
    </section>
    <section className="mt-2" aria-label={en ? 'Alignment with your priorities' : 'Alinhamento com suas prioridades'}>
      <h4 className="mb-1 text-sm font-bold">{en ? 'Your priorities' : 'Suas prioridades'}</h4>
      {rotation.priorityAlignment?.length ? <ul className="m-0 list-none p-0 text-[13px]">{rotation.priorityAlignment.map((alignment) => { const view = alignmentDisplay(alignment, locale); return <li className="py-0.5" key={alignment.priority}><b>{view.icon} {view.priority}: {view.level}.</b> <span className="text-slate-300">{view.reason}</span></li>; })}</ul> : <p className="m-0 text-[13px] text-slate-300">N/D</p>}
    </section>
    <div className="mt-3 flex flex-wrap gap-2"><Link className="inline-flex min-h-10 items-center rounded-lg bg-lime-300 px-3 text-sm font-semibold text-slate-950 hover:bg-lime-200" href="/lab">{en ? 'Change crop' : 'Trocar cultura'}</Link>{rotation.baseline ? <Link className="inline-flex min-h-10 items-center rounded-lg border border-slate-600 px-3 text-sm font-semibold hover:border-lime-300" href="/farm/historico?edit=baseline">{en ? 'Edit baseline' : 'Editar linha de base'}</Link> : null}</div>
  </article>;
}
