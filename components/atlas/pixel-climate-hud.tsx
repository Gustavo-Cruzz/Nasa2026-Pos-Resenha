'use client';

/** PROTOTYPE (variante D): pixel-art climate HUD laid over the map. Uses only data already loaded by LocationExplorer; null is shown as N/D. */
import { AlertCircle, RefreshCw } from 'lucide-react';
import type { ClimateApiResponse } from '@/lib/atlas';

type Climate = Extract<ClimateApiResponse, { status: 'ok' }>;
type HudClimateState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; data: Climate } | { kind: 'error'; message: string };
type Month = { month: number; rainMm: number | null; tempC: number | null };

const WET_MM = 50;
const INITIALS = { 'pt-BR': ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], en: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] } as const;
const NAMES = { 'pt-BR': ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] } as const;

const SUN = ['..XXXXX..', '.XXXXXXX.', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..'];
const CLOUD = ['.....XXXX.........', '....XXXXXX..XXX....', '..XXXXXXXXXXXXXX...', '.XXXXXXXXXXXXXXXXX.', 'XXXXXXXXXXXXXXXXXXX', '.XXXXXXXXXXXXXXXXX.'];

function Sprite({ rows, x = 0, y = 0, fill }: { rows: string[]; x?: number; y?: number; fill: string }) {
  return <>{rows.flatMap((row, r) => Array.from(row).map((ch, c) => ch === 'X' ? <rect fill={fill} height="1" key={`${r}-${c}`} width="1" x={x + c} y={y + r} /> : null))}</>;
}

function SunScene() {
  const cardinal: [number, number][] = [[7, 0], [7, 1], [7, 13], [7, 14], [0, 7], [1, 7], [13, 7], [14, 7]];
  const diagonal: [number, number][] = [[2, 2], [12, 2], [2, 12], [12, 12]];
  return <svg aria-hidden="true" className="hud-pixel h-14 w-14" shapeRendering="crispEdges" viewBox="0 0 15 15">
    <g className="hud-rays-a" fill="#fde68a">{cardinal.map(([x, y]) => <rect height="1" key={`${x}${y}`} width="1" x={x} y={y} />)}</g>
    <g className="hud-rays-b" fill="#fbbf24">{diagonal.map(([x, y]) => <rect height="1" key={`${x}${y}`} width="1" x={x} y={y} />)}</g>
    <Sprite fill="#f59e0b" rows={SUN} x={3} y={3} />
  </svg>;
}

function RainScene() {
  const drops: [number, number, number][] = [[3, 8, 0], [7, 9, 1], [11, 8, 2], [15, 9, 3], [5, 11, 2], [13, 11, 0]];
  return <svg aria-hidden="true" className="hud-pixel h-14 w-14" shapeRendering="crispEdges" viewBox="0 0 20 16">
    {drops.map(([x, y, d]) => <rect className="hud-drop" fill="#67e8f9" height="2" key={`${x}${y}`} style={{ animationDelay: `${d * -0.25}s` }} width="1" x={x} y={y} />)}
    <g className="hud-cloud"><Sprite fill="#94a3b8" rows={CLOUD} x={0} y={1} /><Sprite fill="#cbd5e1" rows={['....XXXX', '...XXXXXX']} x={1} y={1} /></g>
  </svg>;
}

function Thermometer({ tempC }: { tempC: number | null }) {
  const lit = tempC === null ? 0 : Math.max(1, Math.min(10, Math.round(((tempC - 10) / 30) * 10)));
  const color = tempC === null ? '#475569' : tempC >= 28 ? '#f97316' : tempC >= 20 ? '#fbbf24' : '#67e8f9';
  return <svg aria-hidden="true" className="hud-pixel h-14 w-5" shapeRendering="crispEdges" viewBox="0 0 7 24">
    <rect fill="#e2e8f0" height="18" width="5" x="1" y="0" /><rect fill="#0f172a" height="16" width="3" x="2" y="1" />
    {Array.from({ length: 10 }, (_, i) => <rect fill={i < lit ? color : '#1e293b'} height="1.4" key={i} width="3" x="2" y={16.4 - i * 1.6} />)}
    <rect fill="#e2e8f0" height="5" width="7" x="0" y="18" /><rect fill={tempC === null ? '#475569' : color} height="3" width="5" x="1" y="19" />
  </svg>;
}

const fmt = (v: number | null, digits: number, en: boolean) => v === null ? 'N/D' : en ? v.toFixed(digits) : v.toFixed(digits).replace('.', ',');

export function PixelClimateHud({ state, en, onRetry }: { state: HudClimateState; en: boolean; onRetry: () => void }) {
  const names = NAMES[en ? 'en' : 'pt-BR'];
  const currentMonth = new Date().getMonth() + 1;
  let points: Month[] = [];
  let period = '';
  if (state.kind === 'ready') {
    const data = state.data;
    const rain = new Map(data.climateSummary.historicalPrecipitationByMonth.map((item) => [item.month, item.medianTotalMm]));
    points = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, rainMm: rain.get(i + 1) ?? null, tempC: data.climateSummary.monthly.find((m) => m.month === i + 1)?.tmeanMedianC ?? null }));
    period = `${data.provenance.period.start.slice(0, 4)}–${data.provenance.period.end.slice(0, 4)}`;
  }
  const now = points[currentMonth - 1];
  const maxRain = Math.max(1, ...points.map((p) => p.rainMm ?? 0));
  const temps = points.map((p) => p.tempC).filter((t): t is number => t !== null);
  const minT = Math.min(...temps); const maxT = Math.max(...temps);
  const SQUARES = 8;

  return <div className="hud-root pointer-events-none absolute inset-0 z-[11] font-mono">
    {state.kind === 'loading' || state.kind === 'idle' ? <div className="hud-card pointer-events-auto absolute bottom-6 left-3 right-3 flex items-center gap-3 px-3 py-2 text-xs text-lime-200 sm:right-auto" role="status">
      <span aria-hidden="true" className="hud-spinner" /><span className="hud-blink">{en ? 'Loading NASA data…' : 'Carregando dados da NASA…'}</span>
    </div> : null}
    {state.kind === 'error' ? <div className="hud-card hud-card-err pointer-events-auto absolute bottom-6 left-3 right-3 flex flex-wrap items-center gap-3 px-3 py-2 text-xs text-amber-100 sm:right-auto" role="alert">
      <AlertCircle aria-hidden="true" className="shrink-0" size={16} /><span className="min-w-0 flex-1">{state.message}</span>
      <button className="hud-btn inline-flex items-center gap-1.5 px-2 py-1 font-bold" onClick={onRetry} type="button"><RefreshCw aria-hidden="true" size={12} />{en ? 'Retry' : 'Tentar novamente'}</button>
    </div> : null}

    <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
      {now ? <div className="hud-card hud-month flex items-center gap-2 px-2.5 py-2" role="group" aria-label={en ? `Typical ${names[currentMonth - 1]}` : `Típico em ${names[currentMonth - 1]}`}>
        {now.rainMm !== null && now.rainMm >= WET_MM ? <RainScene /> : now.rainMm !== null ? <SunScene /> : <span aria-hidden="true" className="h-14 w-14" />}
        <Thermometer tempC={now.tempC} />
        <div className="text-[11px] leading-tight">
          <p className="font-bold uppercase text-lime-300">{names[currentMonth - 1]}</p>
          <p className="mt-1 text-base font-bold text-amber-300">{fmt(now.tempC, 1, en)}{now.tempC === null ? '' : ' °C'}</p>
          <p className="text-base font-bold text-cyan-300">{now.rainMm === null ? 'N/D' : `${Math.round(now.rainMm)} mm`}</p>
          <p className="text-[10px] text-slate-400">{en ? 'typical' : 'típico'}</p>
        </div>
      </div> : null}
    </div>

    {now ? <div className="absolute inset-x-3 bottom-6 sm:right-16">
      <div className="hud-card px-2 pb-1.5 pt-2 sm:px-3">
        <div className="flex items-end justify-between gap-[2px] sm:gap-1.5" role="list" aria-label={en ? 'Typical rain and temperature by month' : 'Chuva e temperatura típicas por mês'}>
          {points.map((p, i) => {
            const filled = p.rainMm === null ? 0 : p.rainMm <= 0 ? 0 : Math.max(1, Math.round((p.rainMm / maxRain) * SQUARES));
            const tFrac = p.tempC === null || maxT === minT ? 0.5 : (p.tempC - minT) / (maxT - minT);
            const label = `${names[i]}: ${p.rainMm === null ? 'N/D' : `${Math.round(p.rainMm)} mm`}, ${p.tempC === null ? 'N/D' : `${p.tempC.toFixed(1)} °C`}`;
            const current = p.month === currentMonth;
            return <div aria-label={label} className={`flex flex-1 flex-col items-center ${current ? 'hud-current' : ''}`} key={p.month} role="listitem" title={label}>
              <div className="hud-col relative flex w-full flex-col-reverse items-center gap-[1px]">
                {Array.from({ length: SQUARES }, (_, s) => <span className={`hud-sq ${s < filled ? (current ? 'hud-sq-on-cur' : 'hud-sq-on') : 'hud-sq-off'}`} key={s} />)}
                {p.tempC !== null ? <span aria-hidden="true" className="hud-dot" style={{ bottom: `calc(${(tFrac * 100).toFixed(1)}% - 2px)` }} /> : null}
              </div>
              <span className={`mt-1 text-[10px] font-bold leading-none ${current ? 'text-lime-300' : 'text-slate-400'}`}>{INITIALS[en ? 'en' : 'pt-BR'][i]}</span>
            </div>;
          })}
        </div>
        <p className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-[9px] leading-tight text-slate-400">
          <span><i aria-hidden="true" className="hud-key bg-cyan-300" /> {en ? 'rain' : 'chuva'} <i aria-hidden="true" className="hud-key ml-1.5 bg-amber-300" /> {en ? 'temp.' : 'temp.'}</span>
          <span>NASA POWER · {period} · {en ? 'median' : 'mediana'}</span>
        </p>
      </div>
    </div> : null}
  </div>;
}
