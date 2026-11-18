'use client';

import { ndviMunicipalCaveats } from '@/lib/climate/ndvi-copy';
import { DataQualityPanel } from '@/components/results/data-quality-panel';
import { Term } from '@/components/rotation-timeline/glossary-term';
import { useLocale } from '@/components/locale-provider';
import type { AnalysisResult } from '@/lib/engine/types';
import { sourceGapLabel, sourceStateLabel, sourceTitle } from '@/lib/source-health';
import { regionalNdReasons } from '@/lib/nd-reasons';

const STATE_TONE = { available: 'border-cyan-300 text-cyan-200', cache_verified: 'border-cyan-300 text-cyan-200', partial: 'border-[#E7BF62] text-[#E7BF62]', nd: 'border-slate-500 text-slate-300' } as const;

export function SourcesTab({ data }: { data: AnalysisResult }) {
  const { locale } = useLocale(); const en = locale === 'en';
  const health = data.evidenceManifest?.sourceHealth ?? []; const context = data.regionalContext;
  const regionalGaps = regionalNdReasons(data, locale);
  const termFor: Record<string, 'IMERG' | 'POWER' | 'NDVI' | 'ZARC' | 'PAM' | null> = { nasa_power: 'POWER', gpm_imerg: 'IMERG', modis_ndvi: 'NDVI', zarc: 'ZARC', pam: 'PAM' };
  return <div>
    <section aria-label={en ? 'Source status' : 'Estado das fontes'}>
      <h3 className="mb-2 text-base font-bold">{en ? 'Source status' : 'Estado das fontes'}</h3>
      {health.length ? <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-4">{health.map((source) => { const key = termFor[source.id] ?? null; const gap = sourceGapLabel(source.gap, locale);
        return <li className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3" key={source.id}>
          <h4 className="m-0 text-sm font-bold">{key ? <Term k={key}>{sourceTitle(source.id)}</Term> : sourceTitle(source.id)} <span className={`ml-1 rounded-full border px-2 py-0.5 text-[11px] font-normal ${STATE_TONE[source.state]}`}>{sourceStateLabel(source.state, locale)}</span></h4>
          <p className="mt-1 text-xs text-slate-300">{source.origin}{source.period ? ` · ${source.period}` : ''}{source.cache === 'verified_fixture' ? ` · ${en ? 'verified cache' : 'cache verificado'}` : ''}</p>
          {source.coveragePct !== null ? <><div aria-label={`${en ? 'Coverage' : 'Cobertura'} ${source.coveragePct}%`} className="my-1.5 h-1.5 rounded bg-[#2A3D2B]" role="img"><i className="block h-1.5 rounded bg-[#8DC8CF]" style={{ width: `${Math.min(100, source.coveragePct)}%` }} /></div><p className="m-0 text-xs text-slate-300">{en ? 'Coverage' : 'Cobertura'}: {source.coveragePct}%</p></> : <p className="m-0 text-xs text-slate-400">{en ? 'Coverage' : 'Cobertura'}: N/D</p>}
          {gap ? <p className="mt-1 text-xs text-amber-200">{gap}</p> : null}
          {source.url ? <a className="mt-1 inline-block text-xs text-cyan-200 underline" href={source.url} rel="noreferrer" target="_blank">{en ? 'Source' : 'Fonte'}</a> : null}
        </li>; })}</ul> : <p className="text-sm text-amber-200">N/D</p>}
      {data.climate.ndvi?.origin === 'municipal_artifact' ? <ul aria-label="NDVI" className="mt-2 list-disc pl-5 text-xs text-slate-300">{ndviMunicipalCaveats(locale).map((line) => <li key={line}>{line}</li>)}</ul> : null}
      {regionalGaps.length ? <ul className="mt-3 grid gap-2 text-xs" aria-label={en ? 'Reasons for unavailable regional data' : 'Motivos dos dados regionais indisponíveis'}>{regionalGaps.map((gap) => <li className="rounded-lg border border-amber-300/40 bg-amber-950/20 p-2" key={gap.code}><b className="text-amber-100">N/D · {gap.code.startsWith('ndvi') ? 'NDVI' : 'ZARC'}:</b> {gap.reason} <span className="text-lime-200">{gap.action}</span></li>)}</ul> : null}
    </section>
    <section aria-label={en ? 'Regional context' : 'Contexto regional'} className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-3 text-sm">
      <h3 className="mb-1 text-base font-bold">{en ? 'Regional context' : 'Contexto regional'}</h3>
      {context.municipality ? <p className="m-0"><b>{en ? 'Municipality' : 'Município'}:</b> {context.municipality.name} ({context.municipality.uf}) · {en ? 'IBGE code' : 'código IBGE'} {context.municipality.code}</p> : <p className="m-0 text-amber-200">N/D — {en ? 'no municipality resolved; global climate exploration only.' : 'nenhum município resolvido; apenas exploração climática global.'}</p>}
      {context.zarc ? <p className="mt-1"><b><Term k="ZARC">ZARC</Term>:</b> {en ? 'crop year' : 'safra'} {context.zarc.safra} · {Object.keys(context.zarc.crops).length} {en ? 'crops with records' : 'culturas com registros'} · <a className="text-cyan-200 underline" href={context.zarc.sourceUrl} rel="noreferrer" target="_blank">{en ? 'source' : 'fonte'}</a></p> : <p className="mt-1 text-slate-300"><b>ZARC:</b> N/D</p>}
      {context.pam ? <p className="mt-1"><b><Term k="PAM">PAM</Term>:</b> {context.pam.year} · {context.pam.caveat}</p> : <p className="mt-1 text-slate-300"><b>PAM:</b> N/D</p>}
      {context.gaps.length ? <ul className="mt-2 list-disc pl-5 text-xs text-slate-300">{context.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul> : null}
    </section>
    <DataQualityPanel records={data.dataQuality} />
  </div>;
}
