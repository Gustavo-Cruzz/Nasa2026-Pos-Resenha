'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AtlasPoint } from '@/lib/atlas';
import type { BrazilRegionalContext } from '@/lib/brazil/types';
import type { EnsoState } from '@/lib/climate/enso';
import { useJson, type JsonState } from '@/components/atlas/use-json';

export type ForecastBody = { issuedAt: string; days: Array<{ date: string; precipitationMm: number | null }>; source: { name: string; url: string; license: string } };

const acceptForecast = (body: unknown): ForecastBody | undefined => { const value = body as { status?: string } & Partial<ForecastBody>; return value?.status === 'ok' && Array.isArray(value.days) && value.source ? (value as ForecastBody) : undefined; };
const acceptEnso = (body: unknown): EnsoState | undefined => { const value = body as { status?: string; state?: EnsoState }; return value?.status === 'ok' && value.state ? value.state : undefined; };
const acceptRegional = (body: unknown): BrazilRegionalContext | undefined => { const value = body as { status?: string; context?: BrazilRegionalContext }; return value?.status === 'ok' && value.context ? value.context : undefined; };

type Extras = {
  forecast: JsonState<ForecastBody>;
  enso: JsonState<EnsoState>;
  regional: JsonState<BrazilRegionalContext>;
  isOpen: (id: string) => boolean;
  setOpen: (id: string, open: boolean) => void;
};

const Context = createContext<Extras | null>(null);

/**
 * One fetch of each extra source (rain forecast, El Niño, municipal crops) shared by João and by the number cards,
 * plus which cards are open. A reading is tied to its place, so it is never shown for another one.
 */
export function ExploreExtrasProvider({ point, children }: { point: AtlasPoint | null; children: ReactNode }) {
  const forecast = useJson<ForecastBody>(point ? `/api/forecast?lat=${point.latitude}&lon=${point.longitude}` : null, acceptForecast);
  const enso = useJson<EnsoState>(point ? '/api/enso' : null, acceptEnso);
  const regional = useJson<BrazilRegionalContext>(point ? `/api/regional-context?lat=${point.latitude}&lon=${point.longitude}` : null, acceptRegional);
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  // Cards start open: the data and João's comment are what the page is for. A reader can still fold a card.
  const isOpen = useCallback((id: string) => openCards[id] !== false, [openCards]);
  const setOpen = useCallback((id: string, open: boolean) => setOpenCards((current) => current[id] === open ? current : { ...current, [id]: open }), []);
  const value = useMemo(() => ({ forecast, enso, regional, isOpen, setOpen }), [forecast, enso, regional, isOpen, setOpen]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useExtras(): Extras {
  const value = useContext(Context);
  if (!value) throw new Error('useExtras must be used inside ExploreExtrasProvider.');
  return value;
}
