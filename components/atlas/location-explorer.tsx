'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, MapPin, RefreshCw } from 'lucide-react';
import { atlasPointSchema, ATLAS_EXAMPLES, climateApiResponseSchema, regionalContextApiResponseSchema, type AtlasPoint, type ClimateApiResponse } from '@/lib/atlas';
import { Button } from '@/components/ui/button';
import { WorldMap } from '@/components/atlas/world-map';
import { CropDeck } from '@/components/crops/crop-deck';
import { BrazilContextNote } from '@/components/brazil-context-note';
import type { BrazilRegionalContext } from '@/lib/brazil/types';
import { useLocale } from '@/components/locale-provider';

type ClimateState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; data: Extract<ClimateApiResponse, { status: 'ok' }> } | { kind: 'error'; message: string };
const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function LocationExplorer() {
  const { locale } = useLocale();
  const en = locale === 'en';
  const router = useRouter();
  const [point, setPoint] = useState<AtlasPoint | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [state, setState] = useState<ClimateState>({ kind: 'idle' });
  const [regionalContext, setRegionalContext] = useState<BrazilRegionalContext>();
  const fetchClimate = useCallback(async (next: AtlasPoint) => {
    setState({ kind: 'loading' });
    setRegionalContext(undefined);
    try {
      const query = `lat=${encodeURIComponent(next.latitude)}&lon=${encodeURIComponent(next.longitude)}`;
      const [response, contextResponse] = await Promise.all([fetch(`/api/climate?${query}&month=1`), fetch(`/api/regional-context?${query}`)]);
      const contextParsed = regionalContextApiResponseSchema.safeParse(await contextResponse.json());
      if (contextParsed.success && contextParsed.data.status === 'ok') setRegionalContext(contextParsed.data.context);
      const parsed = climateApiResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error('Resposta climática inválida.');
      if (parsed.data.status === 'error') throw new Error(parsed.data.message);
      setState({ kind: 'ready', data: parsed.data });
    } catch (error) { setState({ kind: 'error', message: error instanceof Error ? error.message : 'Não foi possível carregar dados NASA POWER.' }); }
  }, []);
  const setSelectedPoint = useCallback((next: AtlasPoint) => { setPoint(next); setLatitude(String(next.latitude)); setLongitude(String(next.longitude)); void fetchClimate(next); }, [fetchClimate]);
  const submitCoordinates = () => { const parsed = atlasPointSchema.safeParse({ latitude: Number(latitude), longitude: Number(longitude) }); if (!parsed.success) { setState({ kind: 'error', message: 'Informe latitude entre −90 e 90 e longitude entre −180 e 180.' }); return; } setSelectedPoint(parsed.data); };
  const selectExample = (example: AtlasPoint) => setSelectedPoint(example);
  const useLocation = () => { if (!point) return; window.localStorage.setItem('field-shift:atlas-point', JSON.stringify(point)); router.push(`/farm?lat=${encodeURIComponent(point.latitude)}&lon=${encodeURIComponent(point.longitude)}`); };
  return <section className="atlas-shell"><div className="atlas-toolbar"><div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><label>Latitude<input aria-label="Latitude" className="mt-1 block w-full rounded bg-slate-800 p-2" inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} /></label><label>Longitude<input aria-label="Longitude" className="mt-1 block w-full rounded bg-slate-800 p-2" inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} /></label><Button className="self-end" type="button" onClick={submitCoordinates}>{en ? 'Go to point' : 'Ir ao ponto'}</Button></div><div className="mt-3 flex flex-wrap gap-2" aria-label={en ? 'Location examples' : 'Exemplos de localidade'}>{ATLAS_EXAMPLES.map((example) => <Button key={example.label} type="button" variant="secondary" onClick={() => selectExample(example)}>{example.label}</Button>)}</div></div><div className="atlas-layout"><WorldMap point={point} onPointChange={setSelectedPoint} /><aside className="atlas-panel" aria-live="polite"><h2 className="flex items-center gap-2 text-xl font-bold"><MapPin className="text-lime-300" aria-hidden="true" />{en ? 'Selected location' : 'Local selecionado'}</h2>{!point ? <><p className="mt-3 text-slate-300">{en ? 'Choose any land coordinate on the map or enter it above.' : 'Escolha qualquer coordenada terrestre no mapa ou pelos campos.'}</p><div className="mt-4"><BrazilContextNote compact /></div></> : <><p className="mt-3 font-mono text-sm">{point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</p>{state.kind === 'loading' ? <p className="mt-5 text-slate-300">{en ? 'Loading NASA POWER history and municipal context…' : 'Consultando histórico NASA POWER e contexto municipal…'}</p> : null}{state.kind === 'error' ? <div className="mt-5 rounded border border-amber-300/50 bg-amber-950/30 p-3"><p className="flex gap-2 text-amber-100"><AlertCircle aria-hidden="true" size={18} />{state.message}</p><Button className="mt-3" type="button" variant="secondary" onClick={() => void fetchClimate(point)}><RefreshCw aria-hidden="true" size={16} />{en ? 'Try again' : 'Tentar novamente'}</Button></div> : null}{state.kind === 'ready' ? <ClimateSummary data={state.data} en={en} /> : null}<div className="mt-5"><BrazilContextNote compact context={regionalContext} /></div><CropDeck location={point} regionalContext={regionalContext} /><Button className="mt-5" type="button" onClick={useLocation}>{en ? 'Use this location for my farm' : 'Usar este local na minha fazenda'}</Button></>}</aside></div></section>;
}

function ClimateSummary({ data, en }: { data: Extract<ClimateApiResponse, { status: 'ok' }>; en: boolean }) {
  const january = data.climateSummary.monthly.find((item) => item.month === 1);
  return <section className="mt-5 rounded border border-slate-700 bg-slate-950/50 p-4"><h3 className="font-semibold">{en ? 'Observed historical climate' : 'Clima histórico observado'}</h3><p className="mt-2 text-sm">{en ? 'Source' : 'Origem'}: {data.origin === 'live' ? 'NASA POWER' : en ? 'verified Rio Verde NASA cache' : 'cache NASA verificado de Rio Verde'}.</p><p className="mt-2 text-sm">{months[0]}: {en ? 'median daily temperature' : 'temperatura mediana diária'} {january?.tmeanMedianC ?? 'N/D'} °C; {en ? 'median daily precipitation' : 'precipitação diária mediana'} {january?.precipMedianMm ?? 'N/D'} mm.</p><p className="mt-2 text-xs text-slate-400">{en ? 'Period' : 'Período'}: {data.provenance.period.start}–{data.provenance.period.end}, UTC.</p><details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold">{en ? 'Source and coverage' : 'Fonte e cobertura'}</summary><p className="mt-2">{en ? 'Temperature' : 'Temperatura'}: {data.provenance.coveragePct.T2M ?? 'N/D'}%; {en ? 'precipitation' : 'precipitação'}: {data.provenance.coveragePct.PRECTOTCORR ?? 'N/D'}%; {en ? 'missing days' : 'dias com ausência'}: {data.provenance.missingDays.length}.</p><a className="mt-2 block break-all underline" href={data.provenance.sourceUrl} rel="noreferrer" target="_blank">{en ? 'Open NASA POWER query' : 'Abrir consulta NASA POWER'}</a></details></section>;
}
