'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { CalendarDays, CircleCheck, ClipboardList, Droplets, Layers, MapPin, Ruler, UserRound } from 'lucide-react';
import { CropSprite } from '@/components/crops/crop-sprite';
import { soilKindLabel } from '@/components/results/soil-observation-note';
import { useLocale } from '@/components/locale-provider';
import { analyzeBoundary } from '@/lib/engine/boundary-context';
import { cropDisplayName } from '@/lib/presentation';
import { formatYearMonth } from '@/lib/farm/rotation';
import { GAP_LABEL, registrationGaps, registrationProgress } from '@/lib/farm/summary';
import type { AnalysisInput } from '@/lib/schema';

const MONTHS = { 'pt-BR': ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] } as const;

function Item({ icon, label, children, wide }: { icon: ReactNode; label: string; children: ReactNode; wide?: boolean }) {
  return <div className={`flex gap-3 rounded-xl bg-slate-950/50 p-3.5 ${wide ? 'sm:col-span-2' : ''}`}>
    <span aria-hidden="true" className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-800 text-lime-200">{icon}</span>
    <div className="min-w-0"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-0.5 font-semibold text-slate-100">{children}</dd></div>
  </div>;
}

/**
 * The registration at a glance: the farm, where it is, what is growing and what grew before, the water, the soil report and the
 * area drawn, plus what is still missing. `preview` is shown before saving ("this is what I will keep"); `saved` on the farm panel.
 */
export function RegistrationSummary({ input, mode, name, placeLabel, username, createdAt, updatedAt }: { input: AnalysisInput; mode: 'preview' | 'saved'; name?: string; placeLabel?: string | null; username?: string; createdAt?: string; updatedAt?: string }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const history = input.history;
  const current = history[history.length - 1];
  const earlier = history.slice(0, -1).reverse();
  const cropName = (event: (typeof history)[number]) => cropDisplayName(event.cropId, event.otherLabel, locale);
  const area = input.fieldBoundary && input.fieldBoundary.length >= 3 ? analyzeBoundary(input.fieldBoundary).areaHa : null;
  const gaps = registrationGaps(input);
  const { filled, total } = registrationProgress(input);
  const date = (value?: string) => value ? new Date(value).toLocaleDateString(en ? 'en-US' : 'pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined;
  const coordinates = `${input.location.latitude.toFixed(4)}, ${input.location.longitude.toFixed(4)}`;
  const complete = gaps.length === 0;

  return <article aria-labelledby={`registration-${mode}`} className="rounded-2xl border-2 border-lime-300/50 bg-gradient-to-br from-lime-300/5 to-slate-900/70 p-5 sm:p-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold" id={`registration-${mode}`}><ClipboardList aria-hidden="true" className="text-lime-300" size={22} />{en ? 'Registration summary' : 'Resumo do cadastro'}</h2>
        <p className="mt-1 text-sm text-slate-300">{mode === 'preview'
          ? (en ? 'This is what I will keep for you.' : 'Isto é o que eu vou guardar para você.')
          : [createdAt ? `${en ? 'Registered on' : 'Cadastrada em'} ${date(createdAt)}` : null, updatedAt && updatedAt !== createdAt ? `${en ? 'updated on' : 'atualizada em'} ${date(updatedAt)}` : null].filter(Boolean).join(' · ')}</p>
      </div>
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${complete ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-200' : 'border-amber-300/60 bg-amber-300/10 text-amber-100'}`}>
        {complete ? <CircleCheck aria-hidden="true" size={14} /> : null}{complete ? (en ? 'Complete registration' : 'Cadastro completo') : `${filled}/${total} ${en ? 'filled in' : 'preenchidos'}`}
      </span>
    </header>

    <dl className={`mt-5 grid gap-3 ${mode === 'saved' ? 'sm:grid-cols-2' : ''}`}>
      {name ? <Item icon={<ClipboardList size={18} />} label={en ? 'Farm' : 'Fazenda'}>{name}</Item> : null}
      {username ? <Item icon={<UserRound size={18} />} label={en ? 'Account' : 'Conta'}>{username}</Item> : null}
      <Item icon={<MapPin size={18} />} label={en ? 'Place' : 'Lugar'}>{placeLabel ?? coordinates}{placeLabel ? <span className="block font-mono text-xs font-normal text-slate-400">{coordinates}</span> : null}</Item>
      <Item icon={<CalendarDays size={18} />} label={en ? 'Planting month' : 'Mês de plantio'}>{MONTHS[locale][input.plantingMonth - 1]}</Item>
      <Item icon={current.cropId ? <CropSprite cropId={current.cropId} name={cropName(current)} size={26} /> : <span>?</span>} label={en ? 'Growing now' : 'Plantando agora'}>{cropName(current)}<span className="block text-xs font-normal text-slate-400">{formatYearMonth(current.startYearMonth, locale)} → {formatYearMonth(current.endYearMonth, locale)}</span></Item>
      <Item icon={earlier[0]?.cropId ? <CropSprite cropId={earlier[0].cropId} name={cropName(earlier[0])} size={26} /> : <span>?</span>} label={en ? 'Before' : 'Antes'}>
        {earlier.length ? earlier.map((event, index) => <span className={index ? 'mt-1 block' : 'block'} key={`${event.startYearMonth}-${index}`}>{cropName(event)}<span className="text-xs font-normal text-slate-400"> · {formatYearMonth(event.startYearMonth, locale)} → {formatYearMonth(event.endYearMonth, locale)}</span></span>) : <span className="font-normal text-slate-400">{en ? 'Not informed' : 'Não informada'}</span>}
      </Item>
      <Item icon={<Droplets size={18} />} label={en ? 'Water' : 'Água'}>{input.irrigation === 'irrigated' ? (en ? 'Irrigated' : 'Irrigada') : input.irrigation === 'rainfed' ? (en ? 'Rain only' : 'Só chuva') : <span className="font-normal text-slate-400">{en ? 'Not informed' : 'Não informada'}</span>}</Item>
      <Item icon={<Ruler size={18} />} label={en ? 'Farm area' : 'Área da fazenda'}>{area !== null ? <>{area.toLocaleString(en ? 'en-US' : 'pt-BR', { maximumFractionDigits: area < 10 ? 1 : 0 })} ha<span className="text-xs font-normal text-slate-400"> · {en ? `about, ${input.fieldBoundary?.length} points` : `aproximados, ${input.fieldBoundary?.length} pontos`}</span></> : <span className="font-normal text-slate-400">{en ? 'Not drawn on the map' : 'Não desenhada no mapa'}</span>}</Item>
      <Item icon={<Layers size={18} />} label={en ? 'Soil you reported' : 'Solo que você relatou'} wide={mode === 'saved'}>
        {input.soilObservation ? <><span className="flex flex-wrap gap-2">{input.soilObservation.kinds.map((kind) => <span className="rounded-full border border-amber-300/50 bg-amber-300/10 px-2.5 py-1 text-sm font-medium text-amber-100" key={kind}>{soilKindLabel(kind, en)}</span>)}</span>{input.soilObservation.note ? <span className="mt-2 block text-sm font-normal text-slate-300">“{input.soilObservation.note}”</span> : null}</> : <span className="font-normal text-slate-300">{en ? 'Nothing unusual reported' : 'Nada estranho relatado'}</span>}
      </Item>
    </dl>

    {gaps.length ? <p className="mt-4 rounded-lg border border-amber-300/40 bg-amber-950/20 p-3 text-sm text-amber-100">
      <b>{en ? 'Still missing: ' : 'Ainda falta: '}</b>{gaps.map((gap) => GAP_LABEL[gap][locale]).join(', ')}. <Link className="underline underline-offset-4" href={gaps.includes('area') && gaps.length === 1 ? '/explore' : '/chat'}>{gaps.includes('area') && gaps.length === 1 ? (en ? 'Draw it on the map' : 'Desenhar no mapa') : en ? 'Complete it in the chat' : 'Completar na conversa'}</Link>
    </p> : null}
  </article>;
}
