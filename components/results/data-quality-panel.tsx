import type { DataClassification, DataQualityRecord } from '@/lib/engine/types';
import { useLocale } from '@/components/locale-provider';

const pt: Record<DataClassification, string> = { measured: 'medido', observed: 'observado', estimated: 'estimado', derived: 'derivado', scenario: 'cenário', unknown: 'desconhecido' };

export function DataQualityPanel({ records }: { records?: DataQualityRecord[] }) {
  const { locale } = useLocale(); const en = locale === 'en'; const labels: Record<DataClassification, string> = en ? { measured: 'measured', observed: 'observed', estimated: 'estimated', derived: 'derived', scenario: 'scenario', unknown: 'unknown' } : pt;
  if (!records?.length) return null;
  return <section className="mt-6 rounded-xl border border-slate-700 bg-slate-900 p-5" aria-labelledby="data-quality-heading"><h2 className="text-xl font-bold" id="data-quality-heading">{en ? 'Data status and derivations' : 'Status e derivações dos dados'}</h2><p className="mt-2 text-sm text-slate-300">{en ? 'Each layer states whether it is measured, observed, estimated, derived, a scenario, or unknown.' : 'Cada camada informa se é medida, observada, estimada, derivada, cenário ou desconhecida.'}</p><div className="mt-4 grid gap-3 md:grid-cols-2">{records.map((record) => <article className="rounded-lg border border-slate-700 p-3" key={record.id}><p className="font-semibold">{record.label} <span className="text-xs text-lime-200">· {labels[record.classification]}</span></p>{record.formula ? <p className="mt-1 text-xs text-slate-300"><b>{en ? 'Method' : 'Método'}:</b> {record.formula}</p> : null}{record.unit ? <p className="mt-1 text-xs text-slate-300"><b>{en ? 'Unit' : 'Unidade'}:</b> {record.unit}</p> : null}<p className="mt-1 text-xs text-slate-300"><b>{en ? 'Inputs' : 'Entradas'}:</b> {record.inputs.length ? record.inputs.join(', ') : 'N/D'}</p><p className="mt-1 text-xs text-amber-100">{record.limitations.join(' ')}</p></article>)}</div></section>;
}
