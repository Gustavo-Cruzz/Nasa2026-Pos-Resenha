'use client';

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';
import type { Tone } from '@/components/results2/drawer';

export const MONTH_NAMES = { 'pt-BR': ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] } as const;
const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

// Project convention: cyan = observed / inside a documented range, amber = attention, slate = unknown. Never a green "approval" seal.
const TONE_BORDER: Record<Tone, string> = { ok: 'border-cyan-300/50', attention: 'border-amber-300/60', info: 'border-slate-600' };
const TONE_TEXT: Record<Tone, string> = { ok: 'text-cyan-200', attention: 'text-amber-200', info: 'text-slate-100' };
const TONE_FILL: Record<Tone, string> = { ok: 'bg-cyan-300', attention: 'bg-amber-300', info: 'bg-slate-400' };

/** Big number tile: icon, label, value, optional 0–1 fill meter and a small caption. */
export function KpiTile({ icon, label, value, unit, sub, tone = 'info', fill }: { icon?: ReactNode; label: string; value: string; unit?: string; sub?: string; tone?: Tone; fill?: number | null }) {
  const missing = value === 'N/D';
  return <div className={`min-w-0 rounded-xl border bg-slate-950/50 p-3 ${TONE_BORDER[missing ? 'info' : tone]}`}>
    <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-300"><span aria-hidden="true" className="shrink-0 text-lime-200">{icon}</span><span className="min-w-0 truncate">{label}</span></p>
    <p className={`mt-1.5 text-2xl font-extrabold leading-none sm:text-3xl ${missing ? 'text-slate-400' : TONE_TEXT[tone]}`}>{value}{unit && !missing ? <span className="ml-1 text-sm font-semibold text-slate-300">{unit}</span> : null}</p>
    {fill !== undefined && fill !== null ? <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${TONE_FILL[tone]}`} style={{ width: `${Math.max(0, Math.min(1, fill)) * 100}%` }} /></div> : null}
    {sub ? <p className="mt-1.5 text-xs text-slate-400">{sub}</p> : null}
  </div>;
}

export type Segment = { label: string; value: number; tone: 'cyan' | 'amber' | 'slate' | 'sand' | 'silt' | 'clay' };
const SEG_FILL: Record<Segment['tone'], string> = { cyan: 'bg-cyan-300', amber: 'bg-amber-300', slate: 'bg-slate-500', sand: 'bg-amber-200', silt: 'bg-slate-300', clay: 'bg-orange-400' };

/** Proportional stacked bar with a visible legend that doubles as the text alternative. */
export function StackedBar({ segments, ariaLabel, unit = '' }: { segments: Segment[]; ariaLabel: string; unit?: string }) {
  const shown = segments.filter((segment) => segment.value > 0);
  const total = shown.reduce((sum, segment) => sum + segment.value, 0);
  return <div>
    <div aria-label={`${ariaLabel}: ${segments.map((segment) => `${segment.label} ${segment.value}${unit}`).join(', ')}`} className="flex h-4 w-full overflow-hidden rounded-full bg-slate-800" role="img">
      {total > 0 ? shown.map((segment) => <span className={`h-full ${SEG_FILL[segment.tone]} motion-safe:transition-[width]`} key={segment.label} style={{ width: `${(segment.value / total) * 100}%` }} />) : null}
    </div>
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">{segments.map((segment) => <li key={segment.label}><i aria-hidden="true" className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle ${SEG_FILL[segment.tone]}`} />{segment.label}: <b className="text-slate-100">{segment.value}{unit}</b></li>)}</ul>
  </div>;
}

export type MonthCell = { state: 'on' | 'off' | 'nd' };
/** Twelve month cells (on = cyan, off = amber, nd = slate). `ring` marks the planting month. The legend is the text alternative. */
export function MonthStrip({ cells, ring, onLabel, offLabel, ndLabel, ariaLabel }: { cells: MonthCell[]; ring?: number; onLabel: string; offLabel: string; ndLabel: string; ariaLabel: string }) {
  const { locale } = useLocale();
  const names = MONTH_NAMES[locale];
  const fill = { on: 'bg-cyan-300/80 text-slate-950', off: 'bg-amber-300/85 text-slate-950', nd: 'bg-slate-700 text-slate-300' };
  const word = { on: onLabel, off: offLabel, nd: ndLabel };
  const summary = cells.map((cell, index) => `${names[index]}: ${word[cell.state]}`).join('; ');
  return <div>
    <div aria-label={`${ariaLabel}. ${summary}`} className="grid grid-cols-12 gap-1" role="img">
      {cells.map((cell, index) => <div className={`grid h-9 place-items-center rounded text-[11px] font-bold ${fill[cell.state]} ${ring === index + 1 ? 'ring-2 ring-lime-300 ring-offset-2 ring-offset-slate-900' : ''}`} key={index} title={`${names[index]}: ${word[cell.state]}`}>{MONTH_INITIALS[index]}</div>)}
    </div>
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
      <li><i aria-hidden="true" className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-cyan-300 align-middle" />{onLabel}</li>
      <li><i aria-hidden="true" className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-amber-300 align-middle" />{offLabel}</li>
      <li><i aria-hidden="true" className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-slate-600 align-middle" />{ndLabel}</li>
      {ring ? <li><i aria-hidden="true" className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm ring-2 ring-lime-300 align-middle" />{locale === 'en' ? 'Planting month' : 'Mês de plantio'}</li> : null}
    </ul>
  </div>;
}

/** Monthly rain minus reference ET0 (mm). Missing months stay empty and are labelled N/D; nothing is interpolated. */
export function WaterVisual({ balance }: { balance: Array<number | null> }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const names = MONTH_NAMES[locale];
  const known = balance.filter((value): value is number => value !== null);
  const W = 360; const H = 170; const left = 34; const top = 14; const bottom = 24; const plot = H - top - bottom; const slot = (W - left - 8) / 12;
  const step = Math.ceil(Math.max(...known.map(Math.abs), 50) / 50) * 50; const mid = top + plot / 2; const scale = (plot / 2) / step;
  return <div>
    <svg aria-label={en ? 'Monthly water indicator: rain minus reference evapotranspiration, in millimetres. The table below lists every value.' : 'Indicador mensal de água: chuva menos evapotranspiração de referência, em milímetros. A tabela abaixo lista cada valor.'} className="w-full" role="img" viewBox={`0 0 ${W} ${H}`}>
      {[-1, 0, 1].map((k) => <g key={k}><line stroke="#fdf6e3" strokeOpacity={k === 0 ? 0.5 : 0.12} x1={left} x2={W - 8} y1={mid - k * step * scale} y2={mid - k * step * scale} /><text fill="#9fb09a" fontSize="9" textAnchor="end" x={left - 5} y={mid - k * step * scale + 3}>{k * step}</text></g>)}
      <text fill="#9fb09a" fontSize="9" fontWeight="700" textAnchor="end" x={left - 5} y="9">mm</text>
      {balance.map((value, i) => { const h = value === null ? 0 : Math.abs(value) * scale; return <g key={i}>
        {value === null ? <text fill="#7c8a77" fontSize="8" textAnchor="middle" x={left + i * slot + slot / 2} y={mid - 3}>N/D</text> : <rect fill={value >= 0 ? '#67d6f0' : '#f0b84a'} height={h} opacity="0.88" rx="2" width={slot - 8} x={left + i * slot + 4} y={value >= 0 ? mid - h : mid}><title>{`${names[i]}: ${value > 0 ? '+' : ''}${value} mm`}</title></rect>}
        <text fill="#9fb09a" fontSize="10" textAnchor="middle" x={left + i * slot + slot / 2} y={H - 8}>{MONTH_INITIALS[i]}</text></g>; })}
    </svg>
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300"><li><i aria-hidden="true" className="mr-1.5 inline-block h-3 w-3 rounded-sm bg-cyan-300 align-middle" />{en ? 'Rain above the evaporation' : 'Chuva acima da evaporação'}</li><li><i aria-hidden="true" className="mr-1.5 inline-block h-3 w-3 rounded-sm bg-amber-300 align-middle" />{en ? 'Evaporation above the rain' : 'Evaporação acima da chuva'}</li></ul>
  </div>;
}

/** A documented range (min–max) with the observed value as a marker. Cyan marker inside the range, amber outside; no range = N/D. */
export function RangeGauge({ label, range, value, unit, sprite }: { label: string; range: { min: number; max: number } | null; value: number | null | undefined; unit: string; sprite?: ReactNode }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  if (!range) return <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-3 text-sm"><p className="flex items-center gap-2 font-semibold">{sprite}{label}</p><p className="mt-1 text-slate-400">N/D · {en ? 'no documented range' : 'sem faixa documentada'}</p></div>;
  const hasValue = value !== null && value !== undefined;
  const lo = Math.min(range.min, hasValue ? value : range.min) - 4; const hi = Math.max(range.max, hasValue ? value : range.max) + 4;
  const pct = (x: number) => ((x - lo) / (hi - lo)) * 100;
  const inside = hasValue && value >= range.min && value <= range.max;
  const text = hasValue ? (en ? `${value} ${unit}, ${inside ? 'inside' : 'outside'} the documented range ${range.min}–${range.max} ${unit}` : `${value} ${unit}, ${inside ? 'dentro da' : 'fora da'} faixa documentada ${range.min}–${range.max} ${unit}`) : (en ? `documented range ${range.min}–${range.max} ${unit}; no reading` : `faixa documentada ${range.min}–${range.max} ${unit}; sem leitura`);
  return <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
    <p className="flex items-center gap-2 text-sm font-semibold">{sprite}{label}</p>
    <div aria-label={`${label}: ${text}`} className="relative mt-3 h-6" role="img">
      <span aria-hidden="true" className="absolute inset-x-0 top-2.5 h-1 rounded-full bg-slate-700" />
      <span aria-hidden="true" className="absolute top-1.5 h-3 rounded bg-cyan-300/35 ring-1 ring-cyan-300/60" style={{ left: `${pct(range.min)}%`, width: `${pct(range.max) - pct(range.min)}%` }} />
      {hasValue ? <span aria-hidden="true" className={`absolute top-0 h-6 w-1.5 -translate-x-1/2 rounded ${inside ? 'bg-cyan-200' : 'bg-amber-300'}`} style={{ left: `${pct(value)}%` }} /> : null}
    </div>
    <p className="mt-1 flex justify-between text-[11px] text-slate-400"><span>{range.min} {unit}</span><span className={inside ? 'font-bold text-cyan-200' : hasValue ? 'font-bold text-amber-200' : ''}>{hasValue ? `${value} ${unit}` : 'N/D'}</span><span>{range.max} {unit}</span></p>
  </div>;
}

/** Horizontal scale with coloured zones and a marker. `domain` is the full scale; zones only describe the scale, they do not judge suitability. */
export function Meter({ label, value, display, domain, zones, ticks }: { label: string; value: number | null; display: string; domain: [number, number]; zones: Array<{ from: number; to: number; className: string; label: string }>; ticks?: number[] }) {
  const pct = (x: number) => Math.max(0, Math.min(100, ((x - domain[0]) / (domain[1] - domain[0])) * 100));
  const zone = value === null ? null : zones.find((item) => value >= item.from && value <= item.to);
  return <div>
    <div className="flex items-baseline justify-between gap-2"><p className="text-sm font-semibold">{label}</p><p className="text-lg font-extrabold">{display}</p></div>
    <div aria-label={`${label}: ${display}${zone ? `, ${zone.label}` : ''}`} className="relative mt-2 h-4 overflow-hidden rounded-full bg-slate-800" role="img">
      {zones.map((item) => <span aria-hidden="true" className={`absolute top-0 h-full ${item.className}`} key={item.label} style={{ left: `${pct(item.from)}%`, width: `${pct(item.to) - pct(item.from)}%` }} />)}
      {value !== null ? <span aria-hidden="true" className="absolute top-0 h-full w-1 -translate-x-1/2 bg-white shadow" style={{ left: `${pct(value)}%` }} /> : null}
    </div>
    <div className="mt-1 flex justify-between text-[11px] text-slate-400">{(ticks ?? domain).map((tick) => <span key={tick}>{tick}</span>)}</div>
    <ul className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-slate-400">{zones.map((item) => <li key={item.label}><i aria-hidden="true" className={`mr-1 inline-block h-2 w-2 rounded-sm align-middle ${item.className}`} />{item.label}</li>)}</ul>
  </div>;
}

/** A collapsible holder for dense technical detail inside a block. */
export function TechDetails({ title, hint, children, technical = true }: { title: string; hint?: string; children: ReactNode; technical?: boolean }) {
  return <details className="group mt-5 rounded-xl border border-slate-700 bg-slate-950/30" {...(technical ? { 'data-technical': '' } : {})}>
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 p-3 text-sm font-bold [&::-webkit-details-marker]:hidden"><ChevronDown aria-hidden="true" className="shrink-0 text-slate-400 motion-safe:transition-transform group-open:rotate-180" size={18} /><span>{title}</span>{hint ? <span className="ml-1 hidden text-xs font-normal text-slate-400 sm:inline">{hint}</span> : null}</summary>
    <div className="px-3 pb-3">{children}</div>
  </details>;
}
