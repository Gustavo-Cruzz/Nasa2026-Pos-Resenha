'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { futureFarmCopy } from '@/lib/future-farm/copy';
import { composeFarmScene, FARM_BASE } from '@/lib/future-farm/composer';
import type { DemoScene } from '@/lib/future-farm/demo';
import { MONTH_ABBR } from '@/lib/engine/slot-season';
import type { CycleWeather, FarmCycleView, ScenarioId } from '@/lib/future-farm/types';

const query = '(prefers-reduced-motion: reduce)';
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', callback);
  window.addEventListener('field-shift:prefs', callback);
  return () => { media.removeEventListener('change', callback); window.removeEventListener('field-shift:prefs', callback); };
}
/** System `prefers-reduced-motion` or the app's own "reduced animations" setting. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeMotion, () => window.matchMedia(query).matches || document.documentElement.dataset.motion === 'reduced', () => true);
}

export function sceneAlt(cycle: FarmCycleView, scenarioId: ScenarioId, en: boolean): string {
  const names = cycle.crops.map((crop) => crop.label);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} ${en ? 'and' : 'e'} ${names.at(-1)}` : names[0] ?? (en ? 'no crop' : 'nenhuma cultura');
  const layout = names.length > 1 ? (en ? ' in schematic alternating rows' : ' em linhas alternadas esquemáticas') : '';
  return en
    ? `Illustration of farm scenario ${scenarioId}, cycle ${cycle.index + 1}, with ${list}${layout}. Illustrative only; no predictive meaning.`
    : `Ilustração da fazenda do cenário ${scenarioId}, ciclo ${cycle.index + 1}, com ${list}${layout}. Apenas ilustrativa; sem significado preditivo.`;
}

interface FarmSceneProps { cycle: FarmCycleView; scenarioId: ScenarioId; reducedMotion: boolean; paused: boolean; en: boolean; demoScene?: DemoScene }

/**
 * Real scenarios are composed live from the base landscape and crop sprites,
 * so an edited crop or intercrop appears immediately. The pre-rendered
 * GIF/WebP is used only in explicit demo mode and only for its own crop.
 */
const MONTH_ABBR_EN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;
const MONTH_ADVANCE_MS = 2500;

/** Remounts per cycle so the selected month and auto-play reset when the cycle changes. */
export function FarmScene(props: FarmSceneProps) {
  return <FarmSceneInner key={props.cycle.id} {...props} />;
}

function FarmSceneInner({ cycle, scenarioId, reducedMotion, paused, en, demoScene }: FarmSceneProps) {
  const animate = !reducedMotion && !paused;
  const alt = sceneAlt(cycle, scenarioId, en);
  const layout = useMemo(() => composeFarmScene(cycle.crops), [cycle.crops]);
  const copy = futureFarmCopy(en ? 'en' : 'pt-BR');
  const months = useMemo(() => cycle.climate?.months ?? [], [cycle.climate]);
  const [selected, setSelected] = useState(0);
  const [manual, setManual] = useState(false);
  useEffect(() => {
    if (!animate || manual || months.length < 2) return undefined;
    const timer = window.setInterval(() => setSelected((value) => (value + 1) % months.length), MONTH_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [animate, manual, months.length]);
  const current = months.length ? months[Math.min(selected, months.length - 1)] : null;
  const weather: CycleWeather = current?.weather ?? cycle.climate?.weather ?? 'unknown';
  const caption = cycle.climate ? copy.weatherCaption[weather] : null;
  const monthNames = en ? MONTH_ABBR_EN : MONTH_ABBR;
  const demoMatches = Boolean(demoScene && cycle.crops.length === 1 && cycle.crops[0].cropId === demoScene.cropId);
  return <figure className="m-0">
    <div className="ffs-scene" data-animate={animate} data-scene-kind={demoMatches ? 'demo' : 'composed'} data-testid="farm-scene" role="img" aria-label={alt}>
      <Image alt="" aria-hidden="true" className="object-cover" fill priority sizes="(min-width: 1024px) 66vw, 100vw" src={FARM_BASE} />
      {demoMatches && demoScene ? <DemoPicture animate={animate} key={demoScene.png} scene={demoScene} /> : layout.plants.map((plant) => <span aria-hidden="true" className="ffs-plant" data-crop={plant.cropId} key={plant.key} style={{ left: `${plant.leftPct}%`, top: `${plant.topPct}%`, width: `${plant.widthPct}%`, height: `${plant.heightPct}%`, backgroundImage: `url(${plant.src})`, animationDelay: `-${plant.delayMs}ms` }} />)}
      {weather !== 'unknown' ? <div aria-hidden="true" className="ffs-weather" data-month={current?.month} data-testid="farm-weather" data-weather={weather}>
        <span className="ffs-w-ground" /><span className="ffs-w-shimmer" /><span className="ffs-w-sun" />
        <span className="ffs-w-cloud" /><span className="ffs-w-cloud c2" /><span className="ffs-w-cloud c3" />
        <span className="ffs-w-precip" /><span className="ffs-w-sparkle" /><span className="ffs-w-flash" />
      </div> : null}
    </div>
    {months.length ? <div aria-label={en ? 'Scene weather by month (historical medians)' : 'Clima da cena por mês (medianas históricas)'} className="ffs-strip" data-testid="farm-month-strip" role="group">
      {months.map((item, index) => {
        const detail = copy.monthWeatherDetail(item);
        const name = copy.weatherName[item.weather];
        return <button aria-pressed={index === Math.min(selected, months.length - 1)} className="ffs-month" data-testid="farm-month" data-weather={item.weather} key={`${item.month}-${index}`} onClick={() => { setManual(true); setSelected(index); }} title={detail} type="button">
          <span aria-hidden="true" className="ffs-glyph" data-weather={item.weather} />
          <b>{monthNames[item.month - 1]}</b>
          <span className="text-slate-300">{name}</span>
          <span className="sr-only">{detail}</span>
        </button>;
      })}
    </div> : null}
    {caption ? <p className="mt-2 text-sm text-slate-200" data-testid="farm-weather-caption">{current ? `${copy.monthWeatherDetail(current)}. ` : ''}{demoScene ? '' : caption}{cycle.climate?.waterBalanceMm != null ? ` ${en ? 'Window' : 'Janela'} P−ET0: ${Number(cycle.climate.waterBalanceMm.toFixed(0))} mm.` : ''}</p> : null}
    {demoScene && cycle.climate?.waterDetail ? <p className="mt-1 text-xs text-amber-200" data-testid="farm-weather-demo-note">{cycle.climate.waterDetail}</p> : null}
    <figcaption className="mt-2 flex flex-wrap gap-2" aria-label={en ? 'Crops shown in the scene' : 'Culturas exibidas na cena'}>
      {layout.legend.map((item) => <span className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-sm" data-testid="scene-legend-item" key={item.cropId}>
        <span aria-hidden="true" className="inline-block h-7 w-7 bg-contain bg-center bg-no-repeat [image-rendering:pixelated]" style={{ backgroundImage: `url(${item.src})` }} />
        <b>{item.label}</b>
        <span className="text-xs text-slate-300">{item.role === 'intercrop' ? (en ? 'intercrop' : 'consórcio') : (en ? 'main crop' : 'cultura principal')}{layout.legend.length > 1 ? ` · ${en ? 'rows' : 'linhas'} ${item.rows.map((row) => row + 1).join(', ')}` : ''}{item.generic ? ` · ${en ? 'generic sprite' : 'sprite genérico'}` : ''}</span>
      </span>)}
    </figcaption>
  </figure>;
}

function DemoPicture({ scene, animate }: { scene: DemoScene; animate: boolean }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  /* eslint-disable @next/next/no-img-element -- animated WebP/GIF must bypass the optimizer; only the active demo cycle is mounted. */
  if (!animate || status === 'failed') return <img alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" data-testid="demo-static" decoding="async" height={540} src={scene.png} width={960} />;
  return <picture>
    <source srcSet={scene.webp} type="image/webp" />
    <img alt="" aria-hidden="true" className="ffs-demo-anim absolute inset-0 h-full w-full object-cover" data-loaded={status === 'loaded'} data-testid="demo-animated" decoding="async" height={540} onError={() => setStatus('failed')} onLoad={() => setStatus('loaded')} src={scene.gif} width={960} />
  </picture>;
  /* eslint-enable @next/next/no-img-element */
}
