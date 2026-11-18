'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { CropSprite } from '@/components/crops/crop-sprite';
import { useLocale } from '@/components/locale-provider';
import { Term } from '@/components/rotation-timeline/glossary-term';
import { BAND_COMPONENTS, BAND_IDS, BandDefs, LANE_COLOR, bandInfo, type BandId } from '@/components/rotation-timeline/timeline-bands';
import type { GlossaryKey } from '@/lib/rotation-timeline/glossary';
import { HORIZON, type LaneModel, type ScenarioId, type TimelineModel } from '@/lib/rotation-timeline/model';
import { MONTH_LONG, MONTH_SHORT } from '@/lib/rotation-timeline/text';
import type { WhatIf } from '@/lib/rotation-timeline/what-if';
import { cropDisplayName, scenarioDisplayTitle } from '@/lib/presentation';

const LANE_BAR: Record<ScenarioId, string> = { A: 'border-[#7a9a78] bg-[#34503a]', B: 'border-[#8DC8CF] bg-[#264d55]', C: 'border-[#B6DC63] bg-[#4b5f25]' };
const LANE_BADGE: Record<ScenarioId, string> = { A: 'bg-[#FBF8F0]', B: 'bg-[#8DC8CF]', C: 'bg-[#B6DC63]' };
const BAND_TERMS: Partial<Record<BandId, { key: GlossaryKey; text: string }>> = { balance: { key: 'PET0', text: 'P−ET₀' }, zarc: { key: 'ZARC', text: 'ZARC' }, wetness: { key: 'GWETROOT', text: 'GWETROOT' }, ndvi: { key: 'NDVI', text: 'NDVI' } };
const SHORT: Record<'pt-BR' | 'en', Record<BandId, string>> = { 'pt-BR': { rain: 'Chuva', balance: 'P−ET₀', temp: 'Temperatura', zarc: 'ZARC', erosivity: 'Erosividade', wetness: 'Raiz', ndvi: 'NDVI' }, en: { rain: 'Rain', balance: 'P−ET₀', temp: 'Temperature', zarc: 'ZARC', erosivity: 'Erosivity', wetness: 'Root zone', ndvi: 'NDVI' } };

export type TimelineCardProps = {
  model: TimelineModel; whatIf: WhatIf; lanes: LaneModel[]; cursor: number; pin: number; hover: number | null;
  onHover: (offset: number | null) => void; onPin: (offset: number) => void;
  selected: ScenarioId | null; onSelectScenario: (id: ScenarioId) => void;
  openBands: Record<BandId, boolean>; onOpenBands: (next: Record<BandId, boolean>) => void;
  thermalSc: ScenarioId; onThermalSc: (id: ScenarioId) => void;
};

function Row({ label, labelHeight, children, width, labelWidth, mw, className = '', grid = false, topBorder = false, id }: { label: ReactNode; labelHeight: number; children: ReactNode; width: number; labelWidth: number; mw: number; className?: string; grid?: boolean; topBorder?: boolean; id?: string }) {
  const gridStyle: CSSProperties = grid ? { backgroundImage: 'linear-gradient(90deg, transparent calc(100% - 1px), #2A3D2B 0)', backgroundSize: `${mw}px 100%` } : {};
  return <div className={`flex ${className}`} id={id}>
    <div className={`sticky left-0 z-[4] flex flex-none items-center gap-1.5 border-r border-[#405840] bg-slate-900 px-1.5 text-xs sm:px-2 ${topBorder ? 'border-t border-t-[#2A3D2B]' : ''}`} style={{ width: labelWidth, minHeight: labelHeight }}>{label}</div>
    <div className={`relative flex-none ${topBorder ? 'border-t border-[#2A3D2B]' : ''}`} style={{ width, ...gridStyle }}>{children}</div>
  </div>;
}

export function TimelineCard({ model, whatIf, lanes, cursor, pin, hover, onHover, onPin, selected, onSelectScenario, openBands, onOpenBands, thermalSc, onThermalSc }: TimelineCardProps) {
  const { locale } = useLocale(); const en = locale === 'en'; const lang = locale;
  const scrollerRef = useRef<HTMLDivElement>(null); const gridRef = useRef<HTMLDivElement>(null);
  const [scrollerWidth, setScrollerWidth] = useState(0);
  useEffect(() => {
    const element = scrollerRef.current; if (!element) return;
    const observer = new ResizeObserver(() => setScrollerWidth(element.clientWidth));
    observer.observe(element); return () => observer.disconnect();
  }, []);
  const labelWidth = scrollerWidth > 0 && scrollerWidth <= 560 ? 84 : 132;
  const mw = Math.max(36, Math.floor((scrollerWidth - labelWidth) / HORIZON));
  const width = mw * HORIZON;
  const offsetFromEvent = useCallback((clientX: number): number | null => {
    const grid = gridRef.current; if (!grid) return null;
    const x = clientX - grid.getBoundingClientRect().left - labelWidth; if (x < 0 || x >= width) return null;
    return Math.floor(x / mw);
  }, [labelWidth, mw, width]);
  const onMove = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType !== 'mouse') return; onHover(offsetFromEvent(event.clientX)); };
  const onClick = (event: MouseEvent<HTMLDivElement>) => { const offset = offsetFromEvent(event.clientX); if (offset !== null) onPin(offset); };
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step) { event.preventDefault(); onHover(null); onPin(Math.min(HORIZON - 1, Math.max(0, pin + step))); }
    else if (event.key === 'Home') { event.preventDefault(); onHover(null); onPin(0); }
    else if (event.key === 'End') { event.preventDefault(); onHover(null); onPin(HORIZON - 1); }
  };
  const setAll = (value: boolean) => onOpenBands(Object.fromEntries(BAND_IDS.map((id) => [id, value])) as Record<BandId, boolean>);
  const cursorMonth = model.months[cursor]!;
  const startName = MONTH_SHORT[lang][model.startMonth - 1]; const endName = MONTH_SHORT[lang][(model.startMonth + 10) % 12];
  const laneHeight = 62;

  return <section aria-labelledby="rt-timeline-title" className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900/70 py-3">
    <BandDefs />
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2 sm:px-4">
      <h2 className="text-lg font-bold" id="rt-timeline-title">{en ? `Timeline · sowing in ${startName}` : `Linha do tempo · plantio em ${startName}`}</h2>
      <div className="flex gap-2"><button className="min-h-9 rounded-lg border border-slate-600 px-3 text-xs font-semibold hover:border-lime-300" type="button" onClick={() => setAll(true)}>{en ? 'Expand bands' : 'Expandir faixas'}</button><button className="min-h-9 rounded-lg border border-slate-600 px-3 text-xs font-semibold hover:border-lime-300" type="button" onClick={() => setAll(false)}>{en ? 'Collapse bands' : 'Recolher faixas'}</button></div>
    </div>
    <ul className="flex flex-wrap gap-x-4 gap-y-1 px-3 pb-2 text-xs text-slate-300 sm:px-4">
      {lanes.map((lane) => <li key={lane.id}><i aria-hidden="true" className={`mr-1 inline-block h-3 w-3 rounded-[3px] border align-[-2px] ${LANE_BAR[lane.id]}`} />{lane.id} · {laneName(lane, locale)}</li>)}
      <li><i aria-hidden="true" className="mr-1 inline-block h-3 w-3 rounded-[3px] border border-dashed border-[#E7BF62]" style={{ background: 'repeating-linear-gradient(135deg,#6b5a2a 0 3px,transparent 3px 6px)' }} />{en ? 'bare soil' : 'solo descoberto'} <span className="text-slate-400">(<Term k="bare">?</Term>)</span></li>
    </ul>
    <div className="overflow-x-auto" ref={scrollerRef}>
      <div
        aria-label={en ? 'Timeline: use the left and right arrow keys to change the month' : 'Linha do tempo: use as setas do teclado para mudar o mês'}
        className="relative outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300"
        onClick={onClick}
        onKeyDown={onKey}
        onPointerLeave={() => onHover(null)}
        onPointerMove={onMove}
        ref={gridRef}
        role="group"
        style={{ width: labelWidth + width }}
        tabIndex={0}
      >
        <Row label={null} labelHeight={24} labelWidth={labelWidth} mw={mw} width={width}>
          <div className="relative h-6">
            {[1, 2].map((year) => <div className={`absolute top-[3px] h-[18px] overflow-hidden whitespace-nowrap rounded-md pl-2 text-xs font-bold leading-[18px] text-[#FBF8F0] ${year === 1 ? 'bg-[#264d55]' : 'bg-[#34503a]'}`} key={year} style={{ left: (year - 1) * 12 * mw + 2, width: 12 * mw - 4 }}>{en ? `Crop year ${year}` : `Ano agrícola ${year}`} · {startName}–{endName}</div>)}
          </div>
        </Row>
        <Row label={<span className="text-slate-300">{en ? 'Month' : 'Mês'}</span>} labelHeight={26} labelWidth={labelWidth} mw={mw} width={width} grid>
          <div className="relative h-[26px]">
            {model.months.map((item) => <div className={`absolute top-0 h-[26px] cursor-pointer text-center text-xs leading-[26px] ${cursor === item.offset ? 'font-bold text-lime-200' : 'text-slate-200'}`} key={item.offset} style={{ left: item.offset * mw, width: mw }} title={`${MONTH_LONG[lang][item.month - 1]} · ${en ? 'year' : 'ano'} ${item.year}`}>{MONTH_SHORT[lang][item.month - 1]}</div>)}
            <div className="pointer-events-none absolute bottom-0 top-0 w-0.5 bg-[#405840]" style={{ left: 12 * mw - 1 }} />
          </div>
        </Row>
        {lanes.map((lane) => {
          const unplaced = lane.unplaced.length; const rowHeight = lane.rows > 1 ? Math.floor(50 / lane.rows) : 46; const top = (row: number) => lane.rows > 1 ? 4 + row * (rowHeight + 2) : 8;
          return <Row key={lane.id} label={<><span className={`inline-grid h-6 w-6 flex-none place-items-center rounded-[7px] text-[13px] font-extrabold text-[#142018] ${LANE_BADGE[lane.id]}`}>{lane.id}</span><span className="min-w-0 font-bold leading-tight text-[#FBF8F0]">{laneName(lane, locale)}</span></>} labelHeight={laneHeight} labelWidth={labelWidth} mw={mw} width={width} grid>
            <div className="relative" style={{ height: laneHeight }}>
              {lane.segments.map((segment) => {
                const name = cropDisplayName(segment.cropId, null, locale); const first = model.months[segment.startOffset]!.month; const last = model.months[segment.startOffset + segment.length - 1]!.month;
                const season = segment.season === 'A' ? (en ? 'main crop' : 'safra') : 'safrinha';
                const label = `${en ? 'Scenario' : 'Cenário'} ${lane.id}: ${name}, ${season}, ${MONTH_SHORT[lang][first - 1]}–${MONTH_SHORT[lang][last - 1]}${segment.simulationWarning ? `, simulação exploratória: ${segment.simulationWarning}` : segment.simulationWarning ? `, ${segment.simulationWarning}` : segment.source === 'assumed_default' ? (en ? ', assumed window length' : ', duração da janela presumida') : ''}. ${en ? 'Open the scenario card.' : 'Abrir o cartão do cenário.'}`;
                return <button aria-label={label} className={`absolute z-[2] flex items-center gap-1 overflow-hidden whitespace-nowrap rounded-[10px] border-[1.5px] px-1.5 text-left text-xs font-bold text-[#FBF8F0] hover:ring-2 hover:ring-lime-300 ${LANE_BAR[lane.id]} ${selected === lane.id ? 'ring-2 ring-lime-300' : ''} ${segment.source === 'assumed_default' ? 'border-dashed' : ''}`} key={segment.slotIndex} style={{ left: segment.startOffset * mw, width: segment.length * mw - 2, top: top(segment.row), height: rowHeight }} title={label} type="button" onClick={(event) => { event.stopPropagation(); onSelectScenario(lane.id); }}>
                  <CropSprite cropId={segment.cropId} name="" size={rowHeight > 30 ? 24 : 16} /><span className="min-w-0"><span className="block truncate">{name}</span>{rowHeight > 30 ? <small className="block truncate text-[10px] font-normal opacity-90">{season}</small> : null}</span>
                </button>;
              })}
              {lane.bare.map((segment) => <div aria-label={`${en ? 'Bare soil' : 'Solo descoberto'}: ${MONTH_SHORT[lang][model.months[segment.startOffset]!.month - 1]}–${MONTH_SHORT[lang][model.months[segment.startOffset + segment.length - 1]!.month - 1]}${segment.highErosivityMonths ? `, ${segment.highErosivityMonths} ${en ? 'in erosive-rain months' : 'em meses de chuva erosiva'}` : ''}`} className="absolute z-[1] rounded-[5px] border border-dashed border-[#E7BF62]" key={segment.startOffset} role="img" style={{ left: segment.startOffset * mw, width: segment.length * mw - 2, top: lane.rows > 1 ? 54 : 26, height: lane.rows > 1 ? 6 : 10, background: 'repeating-linear-gradient(135deg,#6b5a2a 0 3px,transparent 3px 6px)' }} />)}
              {unplaced || !lane.bareKnown || !lane.segments.length ? <p className="absolute bottom-0.5 left-2 z-[3] m-0 rounded bg-slate-900/90 px-1 text-[10px] text-amber-200">{!lane.segments.length ? (en ? 'N/D — no crop slots configured for this scenario' : 'N/D — nenhum slot de cultura configurado neste cenário') : en ? `N/D — ${unplaced} slot(s) without crop or start month; bare soil not computed` : `N/D — ${unplaced} slot(s) sem cultura ou mês de início; solo descoberto não calculado`}</p> : null}
            </div>
          </Row>;
        })}
        {BAND_IDS.map((id) => {
          const info = bandInfo(id, model, lanes.length, locale); const Band = BAND_COMPONENTS[id]; const open = openBands[id]; const term = BAND_TERMS[id];
          return <div key={id}>
            <Row className="cursor-pointer" label={<button aria-controls={`rt-band-${id}`} aria-expanded={open} className="flex min-h-[30px] items-center gap-1 text-left text-xs font-bold text-[#FBF8F0]" type="button" onClick={(event) => { event.stopPropagation(); onOpenBands({ ...openBands, [id]: !open }); }}><ChevronDown aria-hidden="true" className={`flex-none transition-transform ${open ? '' : '-rotate-90'}`} size={14} />{SHORT[lang][id]}</button>} labelHeight={30} labelWidth={labelWidth} mw={mw} topBorder width={width}>
              <span className="inline-block whitespace-nowrap pt-1.5 text-xs text-slate-300" style={{ position: 'sticky', left: labelWidth + 8 }}>{term ? <><Term k={term.key}>{term.text}</Term>{' · '}</> : null}{info.title}{!info.available ? <b className="ml-2 text-amber-200">N/D</b> : null} <span className="text-slate-400">· {info.subtitle}</span></span>
            </Row>
            {open ? <Row id={`rt-band-${id}`} label={<span className="text-[11px] leading-tight text-slate-300">{info.subtitle}</span>} labelHeight={info.available ? info.height : 44} labelWidth={labelWidth} mw={mw} width={width} grid={info.available}>
              {info.available ? <div className="relative" style={{ height: info.height }}><Band lanes={lanes} locale={locale} model={model} mw={mw} thermalSc={thermalSc} whatIf={whatIf} width={width} />
                {id === 'temp' ? <div className="absolute right-6 top-0.5 z-[3] flex gap-1">{lanes.map((lane) => <button aria-pressed={thermalSc === lane.id} className={`rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${thermalSc === lane.id ? 'border-lime-300 bg-lime-300 text-slate-950' : 'border-slate-600 bg-slate-900'}`} key={lane.id} type="button" onClick={(event) => { event.stopPropagation(); onThermalSc(lane.id); }}>{lane.id}</button>)}</div> : null}
              </div> : <p className="sticky m-0 flex min-h-[44px] items-center px-2 text-xs italic text-amber-200" role="status" style={{ left: labelWidth }}>{info.missing}</p>}
            </Row> : null}
          </div>;
        })}
        <div className="pointer-events-none absolute bottom-0 top-0 z-[2] border-x-[1.5px] border-lime-300 bg-lime-300/10" style={{ left: labelWidth + cursor * mw, width: mw }} />
        {hover !== null && hover !== pin ? <div className="pointer-events-none absolute bottom-0 top-0 z-[2] border-x-[1.5px] border-cyan-300/60 bg-cyan-300/10" style={{ left: labelWidth + pin * mw, width: mw }} /> : null}
      </div>
    </div>
    <p aria-live="polite" className="sr-only" role="status">{MONTH_LONG[lang][cursorMonth.month - 1]}, {en ? 'year' : 'ano'} {cursorMonth.year}</p>
    <p className="px-3 pt-2 text-[11px] text-slate-400 sm:px-4">{en ? 'Hover or tap a month to read it in the side panel. Click a bar to open the scenario card. Arrow keys move the cursor.' : 'Passe o mouse ou toque num mês para ler tudo dele ao lado. Clique numa barra para abrir o cartão do cenário. Setas do teclado movem o cursor.'}</p>
  </section>;
}

function laneName(lane: LaneModel, locale: 'pt-BR' | 'en') { return scenarioDisplayTitle(lane.rotation, locale).replace(/^Cenário [ABC] — /, ''); }
