'use client';

import { ExternalLink } from 'lucide-react';
import { sourceGapLabel, sourceStateLabel, sourceTitle, type SourceHealth, type SourceState } from '@/lib/source-health';
import { useLocale } from '@/components/locale-provider';

const mark: Record<SourceState, string> = { available: '●', cache_verified: '◆', partial: '◐', nd: '○' };
const tone: Record<SourceState, string> = { available: 'border-lime-300/60', cache_verified: 'border-cyan-300/60', partial: 'border-amber-300/60', nd: 'border-slate-500' };

/** One row per source: origin, period, coverage, cache and gap. State is never conveyed by color alone. */
export function SourceHealthList({ health }: { health: SourceHealth[] }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  return <ul className="mt-3 grid gap-2">{health.map((source) => {
    const gap = sourceGapLabel(source.gap, locale);
    return <li className={`rounded-lg border p-3 text-sm ${tone[source.state]}`} key={source.id}>
      <div className="flex items-start justify-between gap-3"><b>{sourceTitle(source.id)}</b><span className="rounded-full border border-current px-2 py-0.5 text-xs"><span aria-hidden="true">{mark[source.state]} </span>{sourceStateLabel(source.state, locale)}</span></div>
      <dl className="mt-2 grid gap-1 text-xs text-slate-300 sm:grid-cols-2">
        <div><dt className="inline font-semibold">{en ? 'Origin' : 'Origem'}: </dt><dd className="inline">{source.origin}</dd></div>
        <div><dt className="inline font-semibold">{en ? 'Period' : 'Período'}: </dt><dd className="inline">{source.period ?? 'N/D'}</dd></div>
        <div><dt className="inline font-semibold">{en ? 'Coverage' : 'Cobertura'}: </dt><dd className="inline">{source.coveragePct === null ? 'N/D' : `${source.coveragePct}%`}</dd></div>
        <div><dt className="inline font-semibold">Cache: </dt><dd className="inline">{source.cache === 'verified_fixture' ? (en ? 'verified fixture' : 'fixture verificado') : source.cache === 'live' ? (en ? 'live query' : 'consulta ao vivo') : 'N/D'}</dd></div>
      </dl>
      {gap ? <p className="mt-2 text-xs text-amber-100"><b>{en ? 'Gap' : 'Lacuna'}:</b> {gap}</p> : null}
      {source.url ? <a className="mt-2 inline-flex min-h-10 items-center gap-1 text-xs underline" href={source.url} rel="noreferrer" target="_blank">{en ? 'Open source' : 'Abrir fonte'}<ExternalLink aria-hidden="true" size={13} /></a> : null}
    </li>;
  })}</ul>;
}
