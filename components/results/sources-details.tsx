import type { ClimateProvenance } from '@/lib/climate/nasa-power';

export function SourcesDetails({ sourceRefs, provenance, title = 'Fontes e proveniência' }: { sourceRefs: string[]; provenance?: ClimateProvenance | null; title?: string }) {
  const refs = [...new Set(sourceRefs)];
  if (refs.length === 0 && !provenance) return null;
  return <details className="mt-4 rounded border border-slate-700 p-3 text-sm"><summary className="cursor-pointer font-semibold">{title}</summary><div className="mt-3 grid gap-2 text-xs text-slate-300">{provenance ? <><p><b>NASA POWER:</b> {provenance.period.start}–{provenance.period.end}, UTC; capturado em {provenance.fetchedAt}.</p><p><b>Cobertura:</b> temperatura {provenance.coveragePct.T2M}%; precipitação {provenance.coveragePct.PRECTOTCORR}%; dias com ausência: {provenance.missingDays.length}.</p><a className="break-all underline" href={provenance.sourceUrl} rel="noreferrer" target="_blank">Abrir consulta NASA POWER</a></> : null}{refs.map((source) => source.startsWith('http') ? <a className="break-all underline" href={source} key={source} rel="noreferrer" target="_blank">{source}</a> : <p key={source}>{source}</p>)}</div></details>;
}
