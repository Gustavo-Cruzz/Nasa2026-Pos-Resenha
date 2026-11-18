'use client';

import Link from 'next/link';
import { ArrowRight, CalendarRange, CloudRain, ExternalLink, Globe2, LogOut, MapPin, Megaphone, Mountain, Pencil } from 'lucide-react';
import { useExtras } from '@/components/atlas/explore-extras';
import type { ReactNode } from 'react';
import { ChatAvatar } from '@/components/chat/chat-avatar';
import { CropSprite } from '@/components/crops/crop-sprite';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/locale-provider';
import { JoaoReaderButton } from '@/components/joao/joao-reader-button';
import { useFarmInsights } from '@/components/farm/layouts/use-farm-insights';
import type { FarmInsight, FarmLayoutProps, InsightTone } from '@/components/farm/layouts/types';

const toneStyle: Record<InsightTone, { card: string; badge: string; stroke: string }> = {
  good: { card: 'border-lime-300/70 bg-lime-300/10', badge: 'bg-lime-300 text-slate-950', stroke: '#bef264' },
  attention: { card: 'border-amber-300/70 bg-amber-300/10', badge: 'bg-amber-300 text-slate-950', stroke: '#fcd34d' },
  info: { card: 'border-sky-300/70 bg-sky-300/10', badge: 'bg-sky-300 text-slate-950', stroke: '#7dd3fc' },
  unknown: { card: 'border-slate-600 bg-slate-900/70', badge: 'bg-slate-600 text-slate-100', stroke: '#94a3b8' },
};

/** Tiny inline sparkline; null points break the line. Decorative (the value is written beside it). */
function Sparkline({ series, stroke }: { series: Array<number | null>; stroke: string }) {
  const values = series.filter((v): v is number => v !== null);
  if (series.length < 2 || values.length < 2) return null;
  const max = Math.max(...values, 0.0001);
  const w = 120; const h = 36;
  const x = (i: number) => (i / (series.length - 1)) * w;
  const y = (v: number) => h - 3 - (v / max) * (h - 6);
  let d = ''; let pen = false;
  series.forEach((v, i) => { if (v === null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `; pen = true; });
  return <svg aria-hidden="true" className="h-9 w-full max-w-[9rem]" preserveAspectRatio="none" viewBox={`0 0 ${w} ${h}`}><path d={d} fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg>;
}

function InsightCard({ id, icon, insight, secondary, spark, noData }: { id: string; icon: ReactNode; insight: FarmInsight; secondary?: ReactNode; spark?: boolean; noData: string }) {
  const style = toneStyle[insight.tone];
  const unknown = !insight.loading && insight.value === null;
  return <article aria-labelledby={id} aria-busy={insight.loading} data-readable className={`flex min-h-56 flex-col gap-3 rounded-2xl border-2 p-5 ${unknown ? toneStyle.unknown.card : style.card}`}>
    <h3 className="flex items-center gap-2 text-base font-bold text-slate-100" id={id}><span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${unknown ? toneStyle.unknown.badge : style.badge}`}>{icon}</span>{insight.title}</h3>
    {insight.loading ? <div aria-hidden="true" className="grid animate-pulse gap-3"><div className="h-9 w-2/3 rounded bg-slate-700" /><div className="h-4 w-full rounded bg-slate-800" /><div className="h-4 w-4/5 rounded bg-slate-800" /></div> : <>
      <p className={`text-4xl font-bold leading-tight ${unknown ? 'text-slate-300' : 'text-white'}`}>{insight.value ?? noData}</p>
      {spark && insight.series ? <Sparkline series={insight.series} stroke={style.stroke} /> : null}
      {insight.detail ? <p className="text-sm text-slate-200">{insight.detail}</p> : null}
      {secondary}
      <p className="mt-auto border-t border-slate-700/70 pt-3 text-sm leading-relaxed text-slate-100">{insight.joao}</p>
    </>}
  </article>;
}

function MiniLine({ insight, noData }: { insight: FarmInsight; noData: string }) {
  if (insight.loading) return <div aria-hidden="true" className="h-4 w-1/2 animate-pulse rounded bg-slate-800" />;
  return <p className="text-sm text-slate-200"><span className="font-semibold">{insight.title}:</span> {insight.value ?? noData}{insight.detail ? <span className="text-slate-300"> · {insight.detail}</span> : null}</p>;
}

const isGuestUsername = (username: string) => username.startsWith('guest-');

export function LayoutA(props: FarmLayoutProps) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const { farm, point, climate, map, onOpenComparison, onSignOut } = props;
  const insights = useFarmInsights({ farm, point, climate });
  const noData = en ? 'No data' : 'Sem dado';
  const place = farm.placeLabel ?? `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`;
  const { timeline, enso } = insights;
  // Important news: an active El Niño or La Niña (NOAA RONI) is shown as a highlighted notice with its source; neutral stays a footnote.
  const ensoState = useExtras().enso;
  const ensoActive = ensoState.kind === 'ready' && ensoState.data.phase !== 'neutral' ? ensoState.data : null;

  return <div className="grid gap-5" id="farm-page">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-lime-200">{en ? 'My farm' : 'Minha fazenda'}</p>
        <h1 className="page-title break-words font-bold">{farm.name}</h1>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1.5 text-sm"><MapPin aria-hidden="true" className="text-lime-300" size={14} />{place}</p>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Link className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 font-semibold text-slate-200 underline underline-offset-4 hover:text-lime-200" href="/farm/historico"><Pencil aria-hidden="true" size={14} />{en ? 'Edit history' : 'Editar histórico'}</Link>
        {isGuestUsername(props.username) || props.username === 'guest' ? null : <Button className="min-h-11 px-3 text-sm" onClick={onSignOut} type="button" variant="secondary"><LogOut aria-hidden="true" className="mr-1.5" size={14} />{en ? 'Sign out' : 'Sair'}</Button>}
      </div>
    </header>

    <section aria-label={en ? 'João, your guide' : 'João, seu guia'} className="flex items-start gap-3">
      <ChatAvatar size={56} />
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border-2 border-lime-300/60 bg-slate-900/80 p-4 sm:p-5">
        <div data-readable>
          <p className="text-lg font-semibold leading-snug text-slate-50">{en
            ? "This is your farm overview. The map shows weather context and a perimeter you can explore or adjust; it does not verify your property boundary. The cards below summarize available rain, planting-season and soil information, including gaps."
            : "Esta é a visão geral da sua fazenda. O mapa mostra o contexto do clima e um perímetro que você pode explorar ou ajustar; ele não confirma os limites da propriedade. Os cartões abaixo resumem as informações disponíveis sobre chuva, época de plantio e solo, incluindo lacunas."}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">{en ? 'Today' : 'Hoje'}: {insights.headline}</p>
          <p className="mt-3 text-base font-semibold text-lime-100">{en ? 'Compare scenarios and inspect their evidence in the analysis.' : 'Compare os cenários e consulte as evidências na análise.'}</p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button className="min-h-12 bg-lime-300 px-5 text-base font-bold text-slate-950 hover:bg-lime-200" onClick={onOpenComparison} type="button">{en ? 'See detailed analysis' : 'Ver análise detalhada'}<ArrowRight aria-hidden="true" className="ml-2" size={18} /></Button>
          <JoaoReaderButton targetId="farm-page" />
        </div>
      </div>
    </section>

    <div className="w-full">{map}</div>

    {ensoActive ? <section aria-labelledby="la-news" data-readable className="rounded-2xl border-2 border-amber-300/70 bg-amber-300/10 p-4 sm:p-5" role="note">
      <p className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-950"><Megaphone aria-hidden="true" size={14} />{en ? 'Important news' : 'Notícia importante'}</p>
      <h2 className="mt-2 text-xl font-bold" id="la-news">{ensoActive.phase === 'el_nino' ? (en ? 'El Niño is active now' : 'O El Niño está ativo agora') : (en ? 'La Niña is active now' : 'A La Niña está ativa agora')}{enso.value ? <span className="font-semibold text-amber-100"> · {enso.value}</span> : null}</h2>
      <p className="mt-2 text-slate-100">{enso.joao}</p>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-300"><span>{en ? 'Evidence' : 'Evidência'}: {enso.detail}</span><a className="inline-flex items-center gap-1 font-semibold text-amber-100 underline underline-offset-4" href={ensoActive.sourceUrl} rel="noreferrer" target="_blank">{en ? 'NOAA source' : 'Fonte NOAA'}<ExternalLink aria-hidden="true" size={13} /></a></p>
      <p className="mt-2 text-xs text-slate-400">{en ? 'A global ocean signal: it shifts the odds of rain in some regions, it does not decide the weather on your farm.' : 'É um sinal global do oceano: muda as chances de chuva em algumas regiões, não decide o tempo na sua fazenda.'}</p>
    </section> : null}

    <section aria-labelledby="layout-a-cards" className="grid gap-4">
      <h2 className="sr-only" id="layout-a-cards">{en ? 'The essentials of your farm' : 'O essencial da sua fazenda'}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <InsightCard icon={<CloudRain size={20} />} id="la-rain" insight={insights.rain7} noData={noData} secondary={<MiniLine insight={insights.now} noData={noData} />} spark />
        <InsightCard icon={<CalendarRange size={20} />} id="la-season" insight={insights.season} noData={noData} secondary={<MiniLine insight={insights.dryspell} noData={noData} />} />
        <InsightCard icon={<Mountain size={20} />} id="la-soil" insight={insights.rotation} noData={noData} secondary={<MiniLine insight={insights.soil} noData={noData} />} />
      </div>
    </section>

    {timeline.length ? <section aria-labelledby="la-timeline" data-readable className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
      <h2 className="text-base font-bold" id="la-timeline">{en ? 'Crops on this farm' : 'Culturas desta fazenda'}</h2>
      <ol className="mt-3 flex items-stretch gap-2 overflow-x-auto pb-1">
        {timeline.map((step, index) => <li className="flex shrink-0 items-center gap-2" key={`${step.cropId ?? 'x'}-${step.period}-${index}`}>
          {index > 0 ? <ArrowRight aria-hidden="true" className="text-slate-400" size={18} /> : null}
          <div className={`flex min-w-28 flex-col items-center gap-1 rounded-xl border p-3 text-center ${step.current ? 'border-lime-300/70 bg-lime-300/10' : 'border-slate-700 bg-slate-950/40'}`}>
            {step.cropId ? <CropSprite cropId={step.cropId} name={step.name} size={40} /> : <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-lg bg-slate-800 text-slate-300">?</span>}
            <span className="text-sm font-bold">{step.name}</span>
            <span className="text-xs text-slate-300">{step.period}</span>
            {step.current ? <span className="rounded-full bg-lime-300 px-2 py-0.5 text-xs font-bold text-slate-950">{en ? 'Now' : 'Agora'}</span> : null}
          </div>
        </li>)}
      </ol>
    </section> : null}

    {ensoActive ? null : <p className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 self-start text-sm text-slate-200"><Globe2 aria-hidden="true" className="shrink-0 text-sky-300" size={16} />{enso.loading ? <span aria-hidden="true" className="inline-block h-4 w-40 animate-pulse rounded bg-slate-800" /> : <span className="rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1"><span className="font-semibold">{enso.title}:</span> {enso.value ?? noData}{enso.detail ? ` · ${enso.detail}` : ''}</span>}</p>}

    <p className="text-sm text-slate-200">{en ? 'Want more detail?' : 'Quer mais detalhe?'} <button className="min-h-11 font-semibold text-lime-200 underline underline-offset-4 hover:text-lime-100" onClick={onOpenComparison} type="button">{en ? 'Open the detailed analysis in Compare' : 'Abrir a análise detalhada no Comparar'}</button></p>

    <p className="text-sm text-slate-300" data-readable>{en ? 'NASA climate for the place, not a measurement of your field.' : 'Clima da NASA para o lugar, não medição do seu talhão.'}</p>
  </div>;
}
