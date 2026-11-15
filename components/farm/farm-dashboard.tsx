'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type * as Leaflet from 'leaflet';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Droplets, LogOut, MapPin, MessageCircle, Sprout, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CropSprite } from '@/components/crops/crop-sprite';
import { WorldMap } from '@/components/atlas/world-map';
import { ExploreExtrasProvider } from '@/components/atlas/explore-extras';
import { JoaoLinesProvider } from '@/components/atlas/joao-panel';
import { PlantingPanels } from '@/components/atlas/planting-panels';
import { ClimateView, PanelSkeleton, requestClimate, type Climate } from '@/components/atlas/location-explorer';
import { JoaoNote, type JoaoNoteTone } from '@/components/joao/joao-note';
import { RotationVisual } from '@/components/results2/visuals';
import { RegistrationSummary } from '@/components/farm/registration-summary';
import { RegionalSoilPanel } from '@/components/results/regional-soil-panel';
import { TerrainPanel } from '@/components/results/terrain-panel';
import { soilKindLabel } from '@/components/results/soil-observation-note';
import { ClientOnly } from '@/components/client-only';
import { useLocale } from '@/components/locale-provider';
import type { AtlasPoint, MapLayers } from '@/lib/atlas';
import type { AnalysisResult } from '@/lib/engine/types';
import type { FarmRecord } from '@/lib/db/farms';
import { cropById } from '@/lib/catalog';
import { cropDisplayName } from '@/lib/presentation';
import { familyLabel, formatYearMonth, rotationRead } from '@/lib/farm/rotation';

const NO_LAYERS: MapLayers = { smap: false, rain: false, modis: false };
const noop = () => undefined;

function Section({ id, icon, title, children }: { id: string; icon: ReactNode; title: string; children: ReactNode }) {
  return <section aria-labelledby={id} className="mt-10">
    <h2 className="flex items-center gap-3 text-2xl font-bold" id={id}><span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-lime-200">{icon}</span>{title}</h2>
    <div className="mt-4 grid gap-4">{children}</div>
  </section>;
}

/** The registered farm's panel: summary and map, water and climate of the place, crop history and rotation, soil and relief. */
export function FarmDashboard({ farm, username, ephemeral }: { farm: FarmRecord | null; username: string; ephemeral: boolean }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const router = useRouter();

  const signOut = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/'); router.refresh(); };

  if (!farm) return <section className="mx-auto max-w-xl rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
    <p className="text-sm text-slate-400">{en ? 'Signed in as' : 'Você entrou como'} {username}</p>
    <h1 className="mt-1 text-2xl font-bold">{en ? 'No farm registered yet' : 'Nenhuma fazenda cadastrada ainda'}</h1>
    <p className="mt-2 text-slate-300">{en ? 'Tell João about your farm and register it to see your panel.' : 'Conte a sua fazenda para o João e cadastre para ver o seu painel.'}</p>
    <div className="mt-4 flex flex-wrap gap-3"><Button asChild><Link href="/chat"><MessageCircle aria-hidden="true" className="mr-2" size={18} />{en ? 'Talk to João' : 'Conversar com o João'}</Link></Button><Button onClick={() => void signOut()} type="button" variant="secondary"><LogOut aria-hidden="true" className="mr-2" size={16} />{en ? 'Sign out' : 'Sair'}</Button></div>
  </section>;

  return <FarmPanel ephemeral={ephemeral} farm={farm} onSignOut={() => void signOut()} username={username} />;
}

function FarmPanel({ farm, username, ephemeral, onSignOut }: { farm: FarmRecord; username: string; ephemeral: boolean; onSignOut: () => void }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const { input } = farm;
  const point = useMemo<AtlasPoint>(() => ({ latitude: input.location.latitude, longitude: input.location.longitude, ...(farm.placeLabel ? { label: farm.placeLabel } : {}) }), [input.location.latitude, input.location.longitude, farm.placeLabel]);

  // Once the map is ready, frame the drawn perimeter so the farm fills the view.
  const [map, setMap] = useState<Leaflet.Map | null>(null);
  useEffect(() => {
    const polygon = input.fieldBoundary;
    if (!map || !polygon || polygon.length < 3) return;
    const timer = window.setTimeout(() => map.fitBounds(polygon.map(([lng, lat]) => [lat, lng] as [number, number]), { maxZoom: 16, padding: [24, 24], animate: false }), 400);
    return () => window.clearTimeout(timer);
  }, [map, input.fieldBoundary]);

  const [climate, setClimate] = useState<{ kind: 'loading' } | { kind: 'ready'; data: Climate } | { kind: 'error'; message: string }>({ kind: 'loading' });
  const [analysis, setAnalysis] = useState<{ kind: 'loading' } | { kind: 'ready'; data: AnalysisResult } | { kind: 'error' }>({ kind: 'loading' });
  useEffect(() => {
    let cancelled = false;
    requestClimate(point, en).then((data) => { if (!cancelled) setClimate({ kind: 'ready', data }); }, (error: unknown) => { if (!cancelled) setClimate({ kind: 'error', message: error instanceof Error ? error.message : en ? 'Could not load the climate.' : 'Não foi possível carregar o clima.' }); });
    fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) })
      .then((response) => response.json() as Promise<AnalysisResult | { status: 'error' }>)
      .then((body) => { if (!cancelled) setAnalysis('strategies' in body ? { kind: 'ready', data: body } : { kind: 'error' }); })
      .catch(() => { if (!cancelled) setAnalysis({ kind: 'error' }); });
    return () => { cancelled = true; };
  }, [point, input, en]);

  const history = input.history;
  const name = (event: (typeof history)[number]) => cropDisplayName(event.cropId, event.otherLabel, locale);
  const families = history.map((event) => (event.cropId ? cropById.get(event.cropId as never)?.family : undefined));
  const rotation = rotationRead(families);
  const steps = history.flatMap((event, index) => event.cropId ? [{ when: index === history.length - 1 ? (en ? 'Now' : 'Agora') : (en ? 'Before' : 'Antes'), cropId: event.cropId, name: name(event), family: familyLabel(families[index], locale), highlight: index === history.length - 1 }] : []);
  const soilKinds = input.soilObservation?.kinds ?? [];

  const rotationTone: JoaoNoteTone = rotation === 'alternates' ? 'good' : rotation === 'repeats' ? 'attention' : 'info';
  const rotationText = rotation === 'alternates'
    ? en ? 'You have been alternating plant families on this farm. That is the pattern I look for.' : 'Você vem alternando as famílias de plantas nesta fazenda. É esse o padrão que eu procuro.'
    : rotation === 'repeats'
      ? en ? 'Two crops in a row share the same family. That is a point to talk over with a technician.' : 'Duas culturas seguidas são da mesma família. Esse é um ponto para conversar com um técnico.'
      : en ? 'With the crops you registered I cannot read a rotation pattern yet.' : 'Com as culturas que você cadastrou, ainda não consigo ler um padrão de rotação.';

  return <section className="mx-auto max-w-6xl">
    {ephemeral ? <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300/40 bg-amber-950/20 p-3 text-sm text-amber-100"><TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={18} /><span>{en ? 'Demo environment: the saved data can be erased at any time.' : 'Ambiente de demonstração: os dados guardados podem ser apagados a qualquer momento.'}</span></p> : null}

    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-lime-200">{en ? 'Farm panel' : 'Painel da fazenda'}</p>
        <h1 className="page-title font-bold">{farm.name}</h1>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          <li className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1.5"><MapPin aria-hidden="true" className="text-lime-300" size={14} />{farm.placeLabel ?? `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`}</li>
        </ul>
      </div>
      <div className="flex items-center gap-3 text-sm"><span className="text-slate-300">{username}</span><Button onClick={onSignOut} type="button" variant="secondary"><LogOut aria-hidden="true" className="mr-2" size={16} />{en ? 'Sign out' : 'Sair'}</Button></div>
    </header>

    <div className="mt-6"><RegistrationSummary createdAt={farm.createdAt} input={input} mode="saved" name={farm.name} placeLabel={farm.placeLabel} updatedAt={farm.updatedAt} username={username} /></div>

    <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="overflow-hidden rounded-2xl border border-slate-700">
        <ClientOnly fallback={<div className="h-[22rem] bg-slate-900" />}><div className="h-[22rem] lg:h-[26rem] [&_.atlas-map]:h-full [&_.atlas-map-frame]:h-full"><WorldMap drawingPolygon={false} layers={NO_LAYERS} onMapReady={setMap} onPointChange={noop} onPolygonChange={noop} point={point} pointZoom={14} polygon={input.fieldBoundary ?? []} /></div></ClientOnly>
      </div>
      <div className="grid content-start gap-4">
        <JoaoNote happening={en ? `This is your farm in ${farm.placeLabel ?? 'the place you chose'}. Below you follow the climate of the place, your crop history and the soil.` : `Esta é a sua fazenda em ${farm.placeLabel ?? 'o lugar que você escolheu'}. Abaixo você acompanha o clima do lugar, o histórico das culturas e o solo.`} limit={en ? 'The climate comes from NASA data for the place, not from your field. It is not a forecast for your crop.' : 'O clima vem de dados da NASA para o lugar, não do seu talhão. Não é previsão para a sua lavoura.'} />
      </div>
    </div>

    <Section icon={<Droplets size={22} />} id="farm-climate" title={en ? 'Climate and water of the place' : 'Clima e água do local'}>
      <ExploreExtrasProvider point={point}>
        <div className="atlas-panel">
          {climate.kind === 'loading' ? <PanelSkeleton label={en ? 'Loading NASA climate history…' : 'Buscando o histórico climático da NASA…'} /> : null}
          {climate.kind === 'error' ? <p className="rounded-lg border border-amber-300/50 bg-amber-950/30 p-3 text-amber-100">{climate.message}</p> : null}
          {climate.kind === 'ready' ? <JoaoLinesProvider climate={climate.data} point={point}><ClimateView data={climate.data} en={en} /><PlantingPanels data={climate.data} en={en} /></JoaoLinesProvider> : null}
        </div>
      </ExploreExtrasProvider>
    </Section>

    <Section icon={<Sprout size={22} />} id="farm-history" title={en ? 'Crop history and rotation' : 'Histórico e rotação de culturas'}>
      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
        <ol className="grid gap-3">{history.map((event, index) => <li className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/40 p-3" key={`${event.startYearMonth}-${index}`}>
          {event.cropId ? <CropSprite cropId={event.cropId} name={name(event)} size={40} /> : <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-lg bg-slate-800 text-slate-400">?</span>}
          <div className="min-w-0 flex-1"><p className="font-bold">{name(event)}</p><p className="text-sm text-slate-300">{formatYearMonth(event.startYearMonth, locale)} → {formatYearMonth(event.endYearMonth, locale)}{families[index] ? ` · ${familyLabel(families[index], locale)}` : ''}</p></div>
          {index === history.length - 1 ? <span className="rounded-full border border-lime-300/60 bg-lime-300/10 px-2.5 py-1 text-xs font-bold text-lime-200">{en ? 'Now' : 'Agora'}</span> : null}
        </li>)}</ol>
        {steps.length >= 2 ? <div className="mt-5"><RotationVisual steps={steps.slice(-3)} /></div> : null}
      </div>
      <JoaoNote happening={rotationText} limit={en ? 'It is a general management rule. It does not guarantee a larger harvest.' : 'É uma regra geral de manejo. Ela não garante colheita maior.'} tone={rotationTone} />
    </Section>

    <Section icon={<Droplets size={22} />} id="farm-soil" title={en ? 'Soil and relief' : 'Solo e relevo'}>
      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
        <h3 className="text-lg font-bold">{en ? 'What you reported about the soil' : 'O que você relatou sobre o solo'}</h3>
        {soilKinds.length ? <ul className="mt-3 flex flex-wrap gap-2">{soilKinds.map((kind) => <li className="rounded-full border border-amber-300/50 bg-amber-300/10 px-3 py-1.5 text-sm text-amber-100" key={kind}>{soilKindLabel(kind, en)}</li>)}</ul> : <p className="mt-2 text-slate-300">{en ? 'You did not report anything unusual in the soil.' : 'Você não relatou nada estranho no solo.'}</p>}
        {input.soilObservation?.note ? <p className="mt-3 rounded-lg bg-slate-950/60 p-3 text-sm text-slate-200">“{input.soilObservation.note}”</p> : null}
      </div>
      <JoaoNote happening={soilKinds.length ? (en ? 'You reported something unusual in the soil. I only record what you tell me.' : 'Você relatou algo estranho no solo. Eu só registro o que você me conta.') : (en ? 'No unusual signs in the soil were reported.' : 'Nenhum sinal estranho no solo foi relatado.')} limit={en ? 'The app does not diagnose soil. A technician, ideally with a soil analysis, can confirm.' : 'O app não diagnostica o solo. Quem confirma é um técnico, de preferência com análise de solo.'} tone={soilKinds.length ? 'attention' : 'info'} />
      {analysis.kind === 'loading' ? <PanelSkeleton label={en ? 'Loading soil and relief of the place…' : 'Buscando o solo e o relevo do lugar…'} /> : null}
      {analysis.kind === 'error' ? <p className="rounded-lg border border-amber-300/50 bg-amber-950/30 p-3 text-amber-100">{en ? 'Soil and relief of the place are unavailable right now.' : 'O solo e o relevo do lugar estão indisponíveis agora.'}</p> : null}
      {analysis.kind === 'ready' ? <><RegionalSoilPanel context={analysis.data.soilContext} /><TerrainPanel data={analysis.data} /></> : null}
    </Section>
  </section>;
}
