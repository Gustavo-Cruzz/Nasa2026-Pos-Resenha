'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, MapPin, Pentagon, RefreshCw, Satellite } from 'lucide-react';
import { atlasPointSchema, ATLAS_EXAMPLES, climateApiResponseSchema, SMAP_GIBS_DATE, SMAP_GIBS_METADATA_URL, type AtlasPoint, type AtlasPolygon, type ClimateApiResponse } from '@/lib/atlas';
import { Button } from '@/components/ui/button';
import { WorldMap } from '@/components/atlas/world-map';
import { GlobalNasaComparison } from '@/components/atlas/global-nasa-comparison';
import { BoundarySummary } from '@/components/boundary/boundary-summary';
import { GeoJsonImport } from '@/components/boundary/geojson-import';
import { analyzeBoundary } from '@/lib/engine/boundary-context';
import { CropDeck } from '@/components/crops/crop-deck';
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
  const [polygon, setPolygon] = useState<AtlasPolygon>([]);
  const [drawingPolygon, setDrawingPolygon] = useState(false);
  const [smapVisible, setSmapVisible] = useState(false);

  const fetchClimate = useCallback(async (next: AtlasPoint) => {
    setState({ kind: 'loading' });
    try {
      const today = new Date();
      const query = `lat=${encodeURIComponent(next.latitude)}&lon=${encodeURIComponent(next.longitude)}&month=${today.getMonth() + 1}&day=${today.getDate()}`;
      const response = await fetch(`/api/climate?${query}`);
      const parsed = climateApiResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error(en ? 'Invalid climate response.' : 'Resposta climática inválida.');
      if (parsed.data.status === 'error') throw new Error(parsed.data.message);
      setState({ kind: 'ready', data: parsed.data });
    } catch (error) { setState({ kind: 'error', message: error instanceof Error ? error.message : en ? 'Could not load NASA POWER data.' : 'Não foi possível carregar dados NASA POWER.' }); }
  }, [en]);
  const setSelectedPoint = useCallback((next: AtlasPoint) => { setPoint(next); setLatitude(String(next.latitude)); setLongitude(String(next.longitude)); void fetchClimate(next); }, [fetchClimate]);
  const importBoundary = (boundary: AtlasPolygon) => { setPolygon(boundary); setDrawingPolygon(false); const center = analyzeBoundary(boundary).centroid; if (center) setSelectedPoint({ latitude: Number(center.latitude.toFixed(6)), longitude: Number(center.longitude.toFixed(6)) }); };
  const submitCoordinates = () => { const parsed = atlasPointSchema.safeParse({ latitude: Number(latitude), longitude: Number(longitude) }); if (!parsed.success) { setState({ kind: 'error', message: en ? 'Enter latitude between −90 and 90 and longitude between −180 and 180.' : 'Informe latitude entre −90 e 90 e longitude entre −180 e 180.' }); return; } setSelectedPoint(parsed.data); };
  const useLocation = () => { if (!point) return; window.localStorage.setItem('field-shift:atlas-point', JSON.stringify(point)); if (polygon.length >= 3) window.localStorage.setItem('field-shift:atlas-polygon', JSON.stringify(polygon)); router.push(`/farm?lat=${encodeURIComponent(point.latitude)}&lon=${encodeURIComponent(point.longitude)}`); };

  return <section className="atlas-shell"><div className="atlas-toolbar"><div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><label>Latitude<input aria-label="Latitude" className="mt-1 block w-full rounded bg-slate-800 p-2" inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} /></label><label>Longitude<input aria-label="Longitude" className="mt-1 block w-full rounded bg-slate-800 p-2" inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} /></label><Button className="self-end" type="button" onClick={submitCoordinates}>{en ? 'Go to point' : 'Ir ao ponto'}</Button></div><div className="mt-3 flex flex-wrap gap-2" aria-label={en ? 'Location examples' : 'Exemplos de localidade'}>{ATLAS_EXAMPLES.map((example) => <Button key={example.label} type="button" variant="secondary" onClick={() => setSelectedPoint(example)}>{example.label}</Button>)}</div><div className="mt-4 flex flex-wrap gap-2"><Button aria-pressed={smapVisible} type="button" variant="secondary" onClick={() => setSmapVisible((visible) => !visible)}><Satellite aria-hidden="true" size={16} />{smapVisible ? (en ? 'Hide NASA SMAP' : 'Ocultar NASA SMAP') : (en ? 'Show NASA SMAP' : 'Mostrar NASA SMAP')}</Button><Button aria-pressed={drawingPolygon} type="button" variant="secondary" onClick={() => setDrawingPolygon((drawing) => !drawing)}><Pentagon aria-hidden="true" size={16} />{drawingPolygon ? (en ? 'Finish area' : 'Encerrar área') : (en ? 'Draw exploratory area' : 'Desenhar área exploratória')}</Button>{polygon.length ? <Button type="button" variant="secondary" onClick={() => { setPolygon([]); setDrawingPolygon(false); }}>{en ? 'Clear area' : 'Limpar área'}</Button> : null}<GeoJsonImport onImport={importBoundary} /></div>{drawingPolygon ? <p className="mt-3 text-sm text-lime-100" role="status">{en ? `Click the map to add vertices (${polygon.length}). Finish after at least 3.` : `Clique no mapa para adicionar vértices (${polygon.length}). Encerre após pelo menos 3.`}</p> : null}{polygon.length >= 3 ? <div className="mt-3"><BoundarySummary boundary={polygon} compact /><p className="mt-2 text-xs text-slate-400">{en ? 'Exploratory boundary (drawn or imported); it does not confirm ownership, land use, or a registered field.' : 'Limite exploratório (desenhado ou importado); não confirma propriedade, uso agrícola ou talhão cadastrado.'}</p></div> : null}{smapVisible ? <SmapLegend en={en} /> : null}</div><div className="atlas-layout"><WorldMap point={point} polygon={polygon} drawingPolygon={drawingPolygon} smapVisible={smapVisible} onPointChange={setSelectedPoint} onPolygonChange={setPolygon} /><aside className="atlas-panel" aria-live="polite"><h2 className="flex items-center gap-2 text-xl font-bold"><MapPin className="text-lime-300" aria-hidden="true" />{en ? 'Selected location' : 'Local selecionado'}</h2>{!point ? <p className="mt-3 text-slate-300">{en ? 'Choose any land coordinate on the map or enter it above.' : 'Escolha qualquer coordenada terrestre no mapa ou pelos campos.'}</p> : <><p className="mt-3 font-mono text-sm">{point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</p>{state.kind === 'loading' ? <p className="mt-5 text-slate-300">{en ? 'Loading NASA historical context…' : 'Consultando contexto histórico NASA…'}</p> : null}{state.kind === 'error' ? <div className="mt-5 rounded border border-amber-300/50 bg-amber-950/30 p-3"><p className="flex gap-2 text-amber-100"><AlertCircle aria-hidden="true" size={18} />{state.message}</p><Button className="mt-3" type="button" variant="secondary" onClick={() => void fetchClimate(point)}><RefreshCw aria-hidden="true" size={16} />{en ? 'Try again' : 'Tentar novamente'}</Button></div> : null}{state.kind === 'ready' ? <ClimateSummary data={state.data} en={en} /> : null}<CropDeck location={point} /><Button className="mt-5" type="button" onClick={useLocation}>{en ? 'Use this location for my farm' : 'Usar este local na minha fazenda'}</Button></>}</aside></div><GlobalNasaComparison /></section>;
}

function SmapLegend({ en }: { en: boolean }) { return <div className="mt-3 rounded-lg border border-cyan-300/30 bg-slate-950/60 p-3 text-xs"><b>NASA SMAP L4 · {SMAP_GIBS_DATE}</b><p className="mt-1 text-slate-300">{en ? 'Root-zone soil moisture, 9 km, model value-added. Visual layer; not a field measurement or current farm condition.' : 'Umidade do solo na zona radicular, 9 km, produto com modelagem. Camada visual; não é medição do talhão nem condição atual da fazenda.'}</p><div aria-label={en ? 'NASA SMAP soil-moisture color scale: 0 to at least 0.70 cubic meters per cubic meter' : 'Escala NASA SMAP de umidade do solo: 0 a pelo menos 0,70 metro cúbico por metro cúbico'} className="mt-3"><div aria-hidden="true" className="h-4 rounded" style={{ background: 'linear-gradient(90deg, #ffa200, #fff000, #00d48a, #00a7ff, #00176e, #342742)' }} /><div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>0.00</span><span>0.35</span><span>≥ 0.70 m³/m³</span></div></div><a className="mt-2 inline-block underline" href={SMAP_GIBS_METADATA_URL} rel="noreferrer" target="_blank">{en ? 'Open NASA layer metadata' : 'Abrir metadados da camada NASA'}</a></div>; }

function ClimateSummary({ data, en }: { data: Extract<ClimateApiResponse, { status: 'ok' }>; en: boolean }) {
  const day = data.climateSummary.calendarDayContext;
  const water = data.climateSummary.waterContext;
  const currentMonth = new Date().getMonth() + 1;
  const fallback = data.climateSummary.monthly.find((item) => item.month === currentMonth);
  const label = day ? `${day.day} ${months[day.month - 1]}` : months[currentMonth - 1];
  return <section className="mt-4 rounded border border-slate-700 bg-slate-950/50 p-4"><h3 className="font-semibold">{en ? 'Historical context for today' : 'Contexto histórico para hoje'}</h3><p className="mt-2 text-sm"><b>{label}</b>: {en ? 'historical median temperature' : 'temperatura histórica mediana'} {day?.tmeanMedianC ?? fallback?.tmeanMedianC ?? 'N/D'} °C; {en ? 'daily precipitation' : 'precipitação diária'} {day?.precipMedianMm ?? fallback?.precipMedianMm ?? 'N/D'} mm.</p><p className="mt-2 text-sm">GPM IMERG: {day?.imergPrecipMedianMm ?? 'N/D'} mm; {en ? 'root-zone index' : 'índice da zona radicular'}: {day?.rootZoneWetnessMedian ?? water?.rootZoneWetnessMedian ?? 'N/D'}.</p><p className="mt-2 text-xs text-slate-400">{en ? 'Same calendar day across complete historical years; not a live measurement or forecast.' : 'Mesmo dia do calendário nos anos históricos completos; não é medição ao vivo nem previsão.'}</p><details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold">{en ? 'Source, period, and coverage' : 'Fonte, período e cobertura'}</summary><p className="mt-2">NASA POWER · MERRA-2 + GPM IMERG · {data.provenance.period.start}–{data.provenance.period.end}, UTC · {day ? `${day.validYears}/${day.expectedYears} ${en ? 'historical days' : 'dias históricos'}` : 'N/D'}.</p><p className="mt-2">{en ? 'Temperature' : 'Temperatura'}: {data.provenance.coveragePct.T2M ?? 'N/D'}%; {en ? 'precipitation' : 'precipitação'}: {data.provenance.coveragePct.PRECTOTCORR ?? 'N/D'}%; GPM IMERG: {data.provenance.coveragePct.IMERG_PRECTOT ?? 'N/D'}%; {en ? 'root-zone wetness' : 'umidade da zona radicular'}: {data.provenance.coveragePct.GWETROOT ?? 'N/D'}%.</p><a className="mt-2 block break-all underline" href={data.provenance.sourceUrl} rel="noreferrer" target="_blank">{en ? 'Open NASA POWER query' : 'Abrir consulta NASA POWER'}</a></details></section>;
}
