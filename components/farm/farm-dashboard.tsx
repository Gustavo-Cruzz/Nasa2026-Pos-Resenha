'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogOut, MessageCircle, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FarmMap } from '@/components/farm/farm-map';
import { FarmArrival } from '@/components/farm/farm-arrival';
import { LayoutA } from '@/components/farm/layouts/layout-a';
import type { ClimateState } from '@/components/farm/layouts/types';
import { ExploreExtrasProvider } from '@/components/atlas/explore-extras';
import { requestClimate } from '@/components/atlas/location-explorer';
import { useLocale } from '@/components/locale-provider';
import { saveDraft } from '@/lib/storage';
import type { AtlasPoint, AtlasPolygon } from '@/lib/atlas';
import type { FarmRecord } from '@/lib/db/farms';

/** "Minha fazenda": the registered farm's panel: summary and map, water and climate of the place, crop history and rotation, soil and relief. */
export function FarmDashboard({ farm, username, ephemeral }: { farm: FarmRecord | null; username: string; ephemeral: boolean }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const router = useRouter();

  const signOut = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/'); router.refresh(); };

  if (!farm) return <section className="mx-auto max-w-xl rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
    <p className="text-sm text-slate-400">{en ? 'Signed in as' : 'Você entrou como'} {username}</p>
    <h1 className="mt-1 text-2xl font-bold">{en ? 'No farm registered yet' : 'Nenhuma fazenda cadastrada ainda'}</h1>
    <p className="mt-2 text-slate-300">{en ? 'Tell João about your farm and register it to see your panel.' : 'Conte a sua fazenda para o João e cadastre para ver o seu painel.'}</p>
    <div className="mt-4 flex flex-wrap gap-3"><Button asChild><Link href="/farm"><MessageCircle aria-hidden="true" className="mr-2" size={18} />{en ? 'Talk to João' : 'Conversar com o João'}</Link></Button><Button onClick={() => void signOut()} type="button" variant="secondary"><LogOut aria-hidden="true" className="mr-2" size={16} />{en ? 'Sign out' : 'Sair'}</Button></div>
  </section>;

  return <FarmPanel ephemeral={ephemeral} farm={farm} onSignOut={() => void signOut()} username={username} />;
}

function FarmPanel({ farm, username, ephemeral, onSignOut }: { farm: FarmRecord; username: string; ephemeral: boolean; onSignOut: () => void }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const { input } = farm;
  const point = useMemo<AtlasPoint>(() => ({ latitude: input.location.latitude, longitude: input.location.longitude, ...(farm.placeLabel ? { label: farm.placeLabel } : {}) }), [input.location.latitude, input.location.longitude, farm.placeLabel]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const [arrived, setArrived] = useState(false);
  const showArrival = searchParams.get('chegada') === '1' && !arrived;
  const savedPolygon = useMemo<AtlasPolygon>(() => input.fieldBoundary ?? [], [input.fieldBoundary]);
  const savePolygon = async (polygon: AtlasPolygon) => {
    try {
      const response = await fetch('/api/farm', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: farm.name, placeLabel: farm.placeLabel ?? undefined, input: { ...farm.input, fieldBoundary: polygon, fieldBoundaryOrigin: 'drawn' } }) });
      if (!response.ok) return false;
      router.refresh();
      return true;
    } catch { return false; }
  };
  const boundaryOrigin = (input as { fieldBoundaryOrigin?: 'suggested' | 'drawn' }).fieldBoundaryOrigin;
  const openComparison = () => {
    saveDraft(farm.input);
    try {
      window.localStorage.setItem('field-shift:atlas-point', JSON.stringify({ latitude: point.latitude, longitude: point.longitude, ...(point.label ? { label: point.label } : {}) }));
      if (savedPolygon.length >= 3) window.localStorage.setItem('field-shift:atlas-polygon', JSON.stringify(savedPolygon));
    } catch { /* storage unavailable: the comparison still opens */ }
    router.push('/results');
  };

  const [climate, setClimate] = useState<ClimateState>({ kind: 'loading' });
  useEffect(() => {
    let cancelled = false;
    requestClimate(point, en).then((data) => { if (!cancelled) setClimate({ kind: 'ready', data }); }, (error: unknown) => { if (!cancelled) setClimate({ kind: 'error', message: error instanceof Error ? error.message : en ? 'Could not load the climate.' : 'Não foi possível carregar o clima.' }); });
    return () => { cancelled = true; };
  }, [point, en]);

  return <section className="mx-auto max-w-6xl">
    {showArrival ? <FarmArrival latitude={point.latitude} longitude={point.longitude} onDone={() => { setArrived(true); router.replace('/farm'); }} placeLabel={farm.placeLabel ?? ''} /> : null}
    {ephemeral ? <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300/40 bg-amber-950/20 p-3 text-sm text-amber-100"><TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={18} /><span>{en ? 'Demo environment: the saved data can be erased at any time.' : 'Ambiente de demonstração: os dados guardados podem ser apagados a qualquer momento.'}</span></p> : null}

    <ExploreExtrasProvider point={point}>
      <LayoutA climate={climate} ephemeral={ephemeral} farm={farm} map={<FarmMap climate={climate} onSavePolygon={savePolygon} point={point} polygon={savedPolygon} polygonOrigin={boundaryOrigin} />} onOpenComparison={openComparison} onSignOut={onSignOut} point={point} username={username} />
    </ExploreExtrasProvider>
  </section>;
}
