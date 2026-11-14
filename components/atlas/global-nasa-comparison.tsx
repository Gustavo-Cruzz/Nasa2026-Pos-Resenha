'use client';

import { useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { ATLAS_EXAMPLES, climateApiResponseSchema, type ClimateApiResponse } from '@/lib/atlas';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/locale-provider';

type ReadyClimate = Extract<ClimateApiResponse, { status: 'ok' }>;
type ComparisonItem = { label: string; data: ReadyClimate | null; error: boolean };

export function GlobalNasaComparison() {
  const { locale } = useLocale();
  const en = locale === 'en';
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ComparisonItem[]>();
  const compare = async () => {
    setLoading(true);
    const compared = await Promise.all(ATLAS_EXAMPLES.map(async (example): Promise<ComparisonItem> => {
      try {
        const response = await fetch(`/api/climate?lat=${example.latitude}&lon=${example.longitude}&month=1`);
        const parsed = climateApiResponseSchema.safeParse(await response.json());
        if (!parsed.success || parsed.data.status !== 'ok') return { label: example.label, data: null, error: true };
        return { label: example.label, data: parsed.data, error: false };
      } catch { return { label: example.label, data: null, error: true }; }
    }));
    setItems(compared);
    setLoading(false);
  };
  return <section className="mt-8 rounded-xl border border-cyan-300/30 bg-slate-900/70 p-5" aria-labelledby="global-nasa-comparison"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-xl font-bold" id="global-nasa-comparison"><BarChart3 className="text-cyan-300" aria-hidden="true" />{en ? 'Same NASA lens, three regions' : 'Mesma lente NASA, três regiões'}</h2><p className="mt-2 max-w-3xl text-sm text-slate-300">{en ? 'Compare January historical signals at Rio Verde, Accra, and New Delhi. Values come from each coordinate; they are not copied between regions.' : 'Compare sinais históricos de janeiro em Rio Verde, Acra e Nova Délhi. Os valores vêm de cada coordenada; não são copiados entre regiões.'}</p></div><Button type="button" variant="secondary" disabled={loading} onClick={() => void compare()}>{loading ? <RefreshCw className="animate-spin" aria-hidden="true" size={16} /> : null}{loading ? (en ? 'Loading NASA…' : 'Consultando NASA…') : (en ? 'Compare NASA signals' : 'Comparar sinais NASA')}</Button></div>{items ? <div className="mt-5 grid gap-3 lg:grid-cols-3">{items.map((item) => <ComparisonCard item={item} en={en} key={item.label} />)}</div> : null}<p className="mt-4 text-xs text-slate-400">{en ? 'Comparison describes historical exposure only. It does not rank farms, climates, or crops.' : 'A comparação descreve exposição histórica. Não ranqueia fazendas, climas ou culturas.'}</p></section>;
}

function ComparisonCard({ item, en }: { item: ComparisonItem; en: boolean }) {
  if (item.error || !item.data) return <article className="rounded-lg border border-amber-300/40 p-4"><h3 className="font-bold">{item.label}</h3><p className="mt-3 text-sm text-amber-100">{en ? 'NASA signal unavailable; no value was substituted.' : 'Sinal NASA indisponível; nenhum valor foi substituído.'}</p></article>;
  const january = item.data.climateSummary.monthly.find((month) => month.month === 1);
  const precipitation = item.data.climateSummary.plantingMonthPrecipitation;
  const water = item.data.climateSummary.waterContext;
  return <article className="rounded-lg border border-slate-700 bg-slate-950/50 p-4"><h3 className="font-bold text-lime-200">{item.label}</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><Metric label={en ? 'Air temperature' : 'Temperatura do ar'} value={january?.tmeanMedianC === null || january?.tmeanMedianC === undefined ? 'N/D' : `${january.tmeanMedianC} °C`} /><Metric label={en ? 'Monthly rain' : 'Chuva mensal'} value={precipitation?.medianTotalMm === null || precipitation?.medianTotalMm === undefined ? 'N/D' : `${precipitation.medianTotalMm} mm`} /><Metric label={en ? 'IMERG rain days' : 'Dias de chuva IMERG'} value={water?.medianRainDays === null || water?.medianRainDays === undefined ? 'N/D' : String(water.medianRainDays)} /><Metric label={en ? 'Root-zone index' : 'Índice zona radicular'} value={water?.rootZoneWetnessMedian === null || water?.rootZoneWetnessMedian === undefined ? 'N/D' : String(water.rootZoneWetnessMedian)} /></dl><p className="mt-3 text-xs text-slate-400">{item.data.origin === 'live' ? 'NASA POWER · MERRA-2 + GPM IMERG' : en ? 'Verified NASA fixture' : 'Fixture NASA verificado'}</p></article>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 font-bold">{value}</dd></div>; }
