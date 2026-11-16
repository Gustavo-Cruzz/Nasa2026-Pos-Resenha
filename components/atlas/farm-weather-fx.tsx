'use client';

/** PROTOTYPE (variante D): one subtle pixel weather effect clipped to the farm perimeter (drawn polygon, or a clearly-marked example). */
import { useEffect, useMemo, useState } from 'react';
import type * as Leaflet from 'leaflet';
import type { AtlasPolygon } from '@/lib/atlas';
import type { LiveState } from '@/components/atlas/use-live-weather';

type FxKind = 'rain' | 'wind' | 'heat' | 'cloud' | 'calm';
type FxSim = 'auto' | FxKind;
const SIM_PARAMS: Record<string, FxKind> = { chuva: 'rain', rain: 'rain', vento: 'wind', wind: 'wind', calor: 'heat', heat: 'heat', nuvens: 'cloud', cloud: 'cloud', calmo: 'calm', calm: 'calm' };
/** Hidden demo switch (?simular=vento): unknown values mean real weather. */
export const parseSim = (value: string | null): FxSim => (value && SIM_PARAMS[value]) || 'auto';
/** Documented thresholds, applied in priority order: rain now > strong wind > heat > clouds > calm. */
const FX_RAIN_MM = 0.2;
const FX_WIND_KMH = 20;
const FX_GUST_KMH = 35;
const FX_HEAT_C = 32;
const FX_CLOUD_PCT = 70;
const MAX_PARTICLES = 40;
const P = 3; // one "pixel" in screen px

type W = Extract<LiveState, { kind: 'ready' }>['weather'];
function pickEffect(w: W): FxKind {
  if ((w.precipitationMm ?? 0) > FX_RAIN_MM) return 'rain';
  if ((w.windKmh ?? 0) >= FX_WIND_KMH || (w.gustsKmh ?? 0) >= FX_GUST_KMH) return 'wind';
  if (w.temperatureC >= FX_HEAT_C) return 'heat';
  if ((w.cloudPct ?? 0) >= FX_CLOUD_PCT) return 'cloud';
  return 'calm';
}

const rng = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/** Irregular quadrilateral of roughly 1.5-2 km, deterministic from the point. */
function examplePerimeter(lat: number, lon: number): AtlasPolygon {
  const next = rng(Math.round(lat * 1e4) * 31 + Math.round(lon * 1e4));
  const mLat = 1 / 111320; const mLon = 1 / (111320 * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
  return [45, 135, 225, 315].map((deg) => {
    const a = (deg + (next() - 0.5) * 30) * Math.PI / 180; const r = 700 + next() * 350;
    return [Number((lon + Math.cos(a) * r * mLon).toFixed(6)), Number((lat + Math.sin(a) * r * mLat).toFixed(6))] as [number, number];
  });
}

const inside = (x: number, y: number, pts: [number, number][]) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i]; const [xj, yj] = pts[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const CARD_PT = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO']; const CARD_EN = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const cardinal = (deg: number, en: boolean) => (en ? CARD_EN : CARD_PT)[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

const FX_LABELS = (en: boolean) => ({ rain: en ? 'raining' : 'chovendo', wind: en ? 'windy' : 'ventando', heat: en ? 'hot' : 'calor', cloud: en ? 'cloudy' : 'nublado', calm: en ? 'calm' : 'tempo calmo' }) as const;

/** The "Now at the farm" line (text + source), or null while there is no weather and no simulation. */
export function describeNow(live: LiveState, sim: FxSim, en: boolean): { text: string; source: string } | null {
  const weather = live.kind === 'ready' ? live.weather : null;
  const kind: FxKind | null = sim !== 'auto' ? sim : weather ? pickEffect(weather) : null;
  if (!kind) return null;
  const num = (v: number | null | undefined, digits: number, unit: string) => v === null || v === undefined ? 'N/D' : `${en ? v.toFixed(digits) : v.toFixed(digits).replace('.', ',')} ${unit}`;
  const detail = kind === 'calm' ? '' : kind === 'rain' ? ` · ${num(weather?.precipitationMm, 1, 'mm')}` : kind === 'wind' ? ` · ${num(weather?.windKmh, 0, 'km/h')}${weather?.windDirectionDeg != null ? ` ${cardinal(weather.windDirectionDeg, en)}` : ''}` : kind === 'heat' ? ` · ${num(weather?.temperatureC, 0, '°C')}` : ` · ${num(weather?.cloudPct, 0, '%')}`;
  const text = `${sim !== 'auto' ? (en ? '[sim] ' : '[sim.] ') : ''}${en ? 'Now at the farm: ' : 'Agora na fazenda: '}${FX_LABELS(en)[kind]}${detail}`;
  const source = `${sim !== 'auto' ? (en ? 'Prototype simulation' : 'Simulação do protótipo') : 'Open-Meteo'} · ${en ? 'context only' : 'só contexto'}`;
  return { text, source };
}

export function FarmWeatherFx({ map, polygon, point, live, sim, drawing, onDraw, en, chip = true }: { map: Leaflet.Map | null; polygon: AtlasPolygon; point: { latitude: number; longitude: number } | null; live: LiveState; sim: FxSim; drawing: boolean; onDraw: () => void; en: boolean; /** Show the floating "now" card (default). The farm page shows it in its footer instead. */ chip?: boolean }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!map) return;
    const bump = () => setTick((t) => t + 1);
    map.on('move zoom viewreset resize zoomend moveend', bump); bump();
    return () => { map.off('move zoom viewreset resize zoomend moveend', bump); };
  }, [map]);

  const isExample = polygon.length < 3;
  const ring = useMemo(() => isExample ? (point ? examplePerimeter(point.latitude, point.longitude) : []) : polygon, [isExample, polygon, point]);
  if (!map || ring.length < 3 || drawing) return null;
  const size = map.getSize();
  const pts = ring.map(([lng, lat]) => { const p = map.latLngToContainerPoint([lat, lng]); return [p.x, p.y] as [number, number]; });
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const w = maxX - minX; const h = maxY - minY;
  const visible = Number.isFinite(w) && w >= 12 && h >= 12 && maxX >= 0 && minX <= size.x && maxY >= 0 && minY <= size.y;
  const weather = live.kind === 'ready' ? live.weather : null;
  const kind: FxKind | null = sim !== 'auto' ? sim : weather ? pickEffect(weather) : null;
  const area = w * h * 0.5;
  const count = Math.max(6, Math.min(MAX_PARTICLES, Math.round(area / 1400)));
  const cx = (minX + maxX) / 2; const cy = (minY + maxY) / 2;
  const windDir = weather?.windDirectionDeg ?? 45;
  const angle = windDir + 90; // meteorological "from" bearing -> screen angle of travel
  const d = pts.map((p) => p.join(',')).join(' ');
  const clipId = 'fx-clip';
  const scatter = (seed: number, n: number, margin = 0) => { const next = rng(seed); const out: { x: number; y: number; r: number }[] = []; for (let i = 0; i < n * 12 && out.length < n; i++) { const x = minX + next() * w; const y = minY + next() * h; if (inside(x, y, pts) && (!margin || inside(x + margin, y, pts))) out.push({ x: Math.round(x / P) * P, y: Math.round(y / P) * P, r: next() }); } return out; };

  const tuft = (t: { x: number; y: number; r: number }, i: number, fast: boolean) => <g className="fx-sway" key={`t${i}`} style={{ animationDuration: fast ? '.5s' : '2s', animationDelay: `${-t.r * 2}s`, ['--sway' as string]: fast ? `${Math.sign(Math.cos(angle * Math.PI / 180) || 1) * 2}px` : '1px' }}>
    <rect fill="#4d7c0f" height={P * 2} width={P} x={t.x} y={t.y} /><rect fill="#a3e635" height={P} width={P} x={t.x - P} y={t.y - P} /><rect fill="#a3e635" height={P} width={P} x={t.x + P} y={t.y - P} /><rect fill="#bef264" height={P} width={P} x={t.x} y={t.y - P} />
  </g>;

  let body: React.ReactNode = null;
  if (kind === 'rain') body = <g opacity=".9">{scatter(3, count).map((t, i) => <rect className="fx-drop" fill="#a5f3fc" height={P * 3} key={i} style={{ animationDelay: `${-t.r * 0.8}s` }} width={P} x={t.x} y={t.y - P * 2} />)}</g>;
  if (kind === 'wind') { const r = Math.hypot(w, h) / 2; const next = rng(7); body = <>
    <g transform={`rotate(${angle} ${cx} ${cy})`} opacity=".8">{Array.from({ length: Math.min(28, Math.max(12, count * 2)) }, (_, i) => <rect className="fx-streak" fill="#f1f5f9" height={P} key={i} style={{ animationDelay: `${-next() * 1.4}s` }} width={P * (4 + Math.round(next() * 4))} x={cx - r * 1.1 + next() * r * 0.8} y={cy - r + next() * 2 * r} />)}</g>
    <g>{scatter(5, Math.min(12, count)).map((t, i) => tuft(t, i, true))}</g></>; }
  if (kind === 'heat') { const next = rng(11); body = <><g opacity=".5">{Array.from({ length: Math.min(8, Math.max(3, Math.round(h / 28))) }, (_, i) => <rect className="fx-heat" fill="#fde68a" height={P - 1} key={i} style={{ animationDelay: `${-next()}s` }} width={P * 8} x={minX + next() * w * 0.7} y={minY + ((i + 0.5) / 8) * h * 1.0} />)}</g>
    <g>{scatter(13, 6).map((t, i) => <rect className="fx-glint" fill="#fffbeb" height={P} key={i} style={{ animationDelay: `${-t.r * 2}s` }} width={P} x={t.x} y={t.y} />)}</g></>; }
  if (kind === 'cloud') { const bw = Math.max(60, w * 0.8); body = <g className="fx-cloud" style={{ ['--run' as string]: `${w + bw}px` }}><g transform={`translate(${minX - bw} ${cy - bw * 0.3})`} fill="#020617" opacity=".26"><rect height={bw * 0.28} width={bw} y={bw * 0.18} rx="0" /><rect height={bw * 0.2} width={bw * 0.6} x={bw * 0.1} y={bw * 0.02} /><rect height={bw * 0.28} width={bw * 0.35} x={bw * 0.5} y={bw * 0.04} /></g></g>; }
  if (kind === 'calm') body = <><g>{scatter(17, Math.min(9, count)).map((t, i) => tuft(t, i, false))}</g><g>{scatter(19, 5).map((t, i) => <rect className="fx-glint" fill="#fef9c3" height={P} key={i} style={{ animationDelay: `${-t.r * 3}s` }} width={P} x={t.x} y={t.y} />)}</g></>;

  const now = describeNow(live, sim, en);
  return <div className="fx-root pointer-events-none absolute inset-0 z-[10] overflow-hidden font-mono">
    {visible ? <svg aria-hidden="true" className="hud-pixel absolute inset-0 h-full w-full" shapeRendering="crispEdges">
      <defs><clipPath id={clipId}><polygon points={d} /></clipPath></defs>
      {isExample ? <><polygon fill="rgb(163 230 53 / .08)" points={d} /><polygon fill="none" points={d} stroke="#020617" strokeWidth="5" /><polygon className="fx-march" fill="none" points={d} stroke="#d9ff87" strokeDasharray="9 6" strokeWidth="3" /></> : null}
      <g clipPath={`url(#${clipId})`}>{body}</g>
    </svg> : null}
    {chip && (kind || isExample) ? <div className="fx-chip hud-card hud-card-sm px-2 py-1.5 text-[10px] leading-snug text-slate-200">
      {now ? <p className="text-[11px] font-bold text-lime-300">{now.text}</p> : null}
      {now ? <p className="text-slate-400">{now.source}</p> : null}
      {isExample ? <p className="mt-0.5 text-amber-300">{en ? 'Example perimeter — draw yours' : 'Perímetro de exemplo — desenhe o seu'} <button className="hud-btn pointer-events-auto ml-1 px-1.5 py-0.5 text-[10px] font-bold" onClick={onDraw} type="button">{en ? 'Draw' : 'Desenhar'}</button></p> : null}
    </div> : null}
  </div>;
}
