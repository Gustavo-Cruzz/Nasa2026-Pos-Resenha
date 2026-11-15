'use client';

import { useId, useState, type CSSProperties } from 'react';
import type { Level } from '@/components/methodology/content';
import styles from '@/components/methodology/methodology.module.css';
import { HOTSPOT_MIN_SLOPE_PCT, MAX_GRID_POINTS, MIN_GRID_SPACING_M, RELIEF_CLASSES, reliefClass, reliefLabel } from '@/lib/terrain/terrain';

/** Display scale only: the last Embrapa class (≥ 45%) has no upper bound, so the bar stops at 60%. */
const SCALE_MAX = 60;
const COLORS = ['#bef264', '#d9f99d', '#fde68a', '#fcd34d', '#fb923c', '#fb7185'];
const RUN = 280;
const FOOT = { x: 40, y: 176 };

/** Interactive slope explainer with the exact Embrapa relief thresholds and the 8% attention marker used by the code. */
export function SlopeExplainer({ level, en }: { level: Level; en: boolean }) {
  const [slope, setSlope] = useState(5);
  const inputId = useId();
  const locale = en ? 'en' : 'pt-BR';
  const classId = reliefClass(slope);
  const label = reliefLabel(classId, locale);
  const hotspot = slope >= HOTSPOT_MIN_SLOPE_PCT;
  const degrees = Math.atan(slope / 100) * (180 / Math.PI);
  const rise = Math.min(slope, SCALE_MAX) / 100 * RUN;
  const top = { x: FOOT.x + RUN, y: FOOT.y - rise };
  const speed = `${Math.max(1.1, 4.5 - slope * 0.06).toFixed(2)}s`;
  const valueText = `${slope}% (${degrees.toFixed(1)}°) — ${label}${hotspot ? (en ? ', attention point' : ', ponto de atenção') : ''}`;

  return <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
    <figure className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3">
      <svg aria-hidden="true" className="h-auto w-full" viewBox="0 0 360 200">
        {[0, 1, 2, 3, 4].map((index) => <line className={styles.rain} key={`r-${index}`} stroke="rgb(103 232 249 / .7)" strokeLinecap="round" strokeWidth="2" style={{ '--i': index } as CSSProperties} x1={90 + index * 50} x2={86 + index * 50} y1={18} y2={30} />)}
        <polygon fill="rgb(120 53 15 / .55)" points={`${FOOT.x},${FOOT.y} ${top.x},${top.y} ${top.x},196 ${FOOT.x},196`} />
        <line stroke={hotspot ? '#fcd34d' : '#bef264'} strokeLinecap="round" strokeWidth="4" x1={FOOT.x} x2={top.x} y1={FOOT.y} y2={top.y} />
        <line stroke="rgb(148 163 184 / .5)" strokeDasharray="4 4" x1={FOOT.x} x2={top.x} y1={FOOT.y} y2={FOOT.y} />
        <line stroke="rgb(148 163 184 / .5)" strokeDasharray="4 4" x1={top.x} x2={top.x} y1={FOOT.y} y2={top.y} />
        <text fill="#cbd5e1" fontSize="11" textAnchor="middle" x={FOOT.x + RUN / 2} y={FOOT.y + 16}>{en ? '100 m across' : '100 m na horizontal'}</text>
        {rise > 14 ? <text fill="#cbd5e1" fontSize="11" x={top.x + 6} y={FOOT.y - rise / 2}>{slope} m</text> : null}
        {[0, 1, 2, 3].map((index) => <circle className={styles.drop} cx={top.x - 4} cy={top.y - 6} fill="rgb(103 232 249)" key={`d-${index}`} r="4" style={{ '--i': index, '--dx': `${-RUN + 8}px`, '--dy': `${rise}px`, '--speed': speed } as CSSProperties} />)}
      </svg>
      <div className="mt-3 px-1">
        <label className="block text-sm font-semibold text-slate-100" htmlFor={inputId}>{en ? 'Move to change the slope' : 'Arraste para mudar a declividade'}</label>
        <input aria-valuetext={valueText} className="mt-2 w-full accent-lime-300" id={inputId} max={SCALE_MAX} min={0} onChange={(event) => setSlope(Number(event.target.value))} step={1} type="range" value={slope} />
        <output aria-live="polite" className="mt-2 block text-sm" htmlFor={inputId}>
          <b className="text-lg text-slate-50">{slope}%</b> <span className="text-slate-400">≈ {degrees.toFixed(1)}°</span> · <b className={hotspot ? 'text-amber-200' : 'text-lime-200'}>{label}</b>
          {hotspot ? <span className="ml-2 rounded-full bg-amber-300/15 px-2 py-0.5 text-xs font-bold text-amber-200">{en ? `attention point (≥ ${HOTSPOT_MIN_SLOPE_PCT}%)` : `ponto de atenção (≥ ${HOTSPOT_MIN_SLOPE_PCT}%)`}</span> : null}
        </output>
      </div>
    </figure>
    <div className="grid content-start gap-4">
      <div aria-hidden="true" className="relative">
        <div className="flex h-4 overflow-hidden rounded-full">{RELIEF_CLASSES.map((item, index) => <span key={item.id} style={{ width: `${(((item.maxPct ?? SCALE_MAX) - item.minPct) / SCALE_MAX) * 100}%`, background: COLORS[index] }} />)}</div>
        <span className="absolute -top-1 h-6 w-1 rounded bg-white shadow transition-[left] duration-300" style={{ left: `calc(${(slope / SCALE_MAX) * 100}% - 2px)` }} />
        <span className="absolute top-5 text-xs text-amber-200" style={{ left: `${(HOTSPOT_MIN_SLOPE_PCT / SCALE_MAX) * 100}%` }}>▲ {HOTSPOT_MIN_SLOPE_PCT}%</span>
      </div>
      <dl className="mt-4 grid gap-1 text-sm">
        {RELIEF_CLASSES.map((item, index) => <div className={`flex items-center gap-2 rounded-md px-2 py-1 ${item.id === classId ? 'bg-slate-800 ring-1 ring-lime-300/60' : ''}`} key={item.id}>
          <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm" style={{ background: COLORS[index] }} />
          <dt className="w-24 shrink-0 font-mono text-slate-300">{item.maxPct === null ? `≥ ${item.minPct}%` : `${item.minPct}–${item.maxPct}%`}</dt>
          <dd className="text-slate-100">{reliefLabel(item.id, locale)}</dd>
        </div>)}
      </dl>
      <p className="text-sm leading-6 text-slate-300">{level === 'technical'
        ? (en ? `Relief classes from Embrapa (Table 5.3). Slope % = 100·√((dz/dx)² + (dz/dy)²) by central differences on an SRTM grid (spacing ≥ ${MIN_GRID_SPACING_M} m, ≤ ${MAX_GRID_POINTS} points; without a drawn field, 3×3 at 90 m). Cells ≥ ${HOTSPOT_MIN_SLOPE_PCT}% are relief hotspots; a mean slope ≥ ${HOTSPOT_MIN_SLOPE_PCT}% plus bare months in erosive-rain months raises a bare-soil attention note. RUSLE soil loss stays N/D (no K, C, P or slope length).`
          : `Classes de relevo da Embrapa (Tabela 5.3). Declividade % = 100·√((dz/dx)² + (dz/dy)²) por diferenças centrais numa grade SRTM (espaçamento ≥ ${MIN_GRID_SPACING_M} m, ≤ ${MAX_GRID_POINTS} pontos; sem talhão desenhado, 3×3 a 90 m). Células ≥ ${HOTSPOT_MIN_SLOPE_PCT}% são pontos de atenção de relevo; declive médio ≥ ${HOTSPOT_MIN_SLOPE_PCT}% somado a meses de solo descoberto em meses de chuva erosiva gera aviso de solo exposto. A perda de solo (RUSLE) fica N/D (faltam K, C, P e comprimento de rampa).`)
        : (en ? `The steeper the ground, the faster rain runs off and carries soil. From ${HOTSPOT_MIN_SLOPE_PCT}% on, we mark the spot so you can plan cover for the rainy months.`
          : `Quanto mais inclinado, mais rápido a água escorre e leva o solo. A partir de ${HOTSPOT_MIN_SLOPE_PCT}%, marcamos o ponto para você planejar cobertura nos meses de chuva.`)}</p>
    </div>
  </div>;
}
