'use client';

import { useMemo } from 'react';
import { analyzeBoundary } from '@/lib/engine/boundary-context';
import type { FieldBoundary, WaterPoint } from '@/lib/schema';
import { useLocale } from '@/components/locale-provider';

export const waterKindLabel = (kind: WaterPoint['kind'], en: boolean) => ({ well: en ? 'Well' : 'Poço', river: en ? 'River' : 'Rio', reservoir: en ? 'Reservoir / pond' : 'Açude', other: en ? 'Other' : 'Outro' }[kind]);

/** Same spatial facts everywhere the boundary appears (Atlas, Farm, Results); no ownership or field claim. */
export function BoundarySummary({ boundary, waterPoint, compact = false }: { boundary: FieldBoundary; waterPoint?: WaterPoint; compact?: boolean }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const analysis = useMemo(() => analyzeBoundary(boundary), [boundary]);
  if (analysis.status !== 'spatial_context') return null;
  const smap = analysis.smapHistorical;
  const relation = smap.spatialInterpretation === 'coarser_than_boundary'
    ? en ? 'Smaller than one nominal 9 km SMAP cell: SMAP is regional context, not field moisture.' : 'Menor que uma célula nominal de 9 km do SMAP: o SMAP é contexto regional, não umidade do talhão.'
    : en ? 'May span several nominal 9 km SMAP cells.' : 'Pode abranger várias células nominais de 9 km do SMAP.';
  return <section aria-label={en ? 'Boundary summary' : 'Resumo do polígono'} className="rounded-lg border border-cyan-300/40 bg-cyan-500/10 p-4 text-sm">
    <dl className={`grid gap-3 ${compact ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{en ? 'Approx. area' : 'Área aproximada'}</dt><dd className="font-bold">{analysis.areaHa ?? 'N/D'} ha</dd></div>
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{en ? 'Centroid' : 'Centroide'}</dt><dd className="font-mono font-bold">{analysis.centroid ? `${analysis.centroid.latitude.toFixed(5)}, ${analysis.centroid.longitude.toFixed(5)}` : 'N/D'}</dd></div>
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{en ? 'Vertices' : 'Vértices'}</dt><dd className="font-bold">{analysis.vertexCount}</dd></div>
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">SMAP L4 · 9 km</dt><dd className="font-bold">{en ? 'Historical series: N/D' : 'Série histórica: N/D'}</dd></div>
    </dl>
    <p className="mt-3 text-slate-200">{relation}</p>
    <p className="mt-2 text-xs text-slate-300">{en ? 'N/D — requires Earthdata preprocessing. A GIBS map color is never converted into a number.' : 'N/D — requer pré-processamento Earthdata. A cor do mapa GIBS nunca é convertida em número.'}</p>
    {waterPoint ? <p className="mt-2 text-xs text-slate-300"><b>{en ? 'Water point declared by the producer' : 'Ponto de água informado pelo produtor'}:</b> {waterKindLabel(waterPoint.kind, en)}{waterPoint.label ? ` — ${waterPoint.label}` : ''}. {en ? 'Declared context only; no flow, autonomy or irrigation is calculated.' : 'Apenas contexto declarado; nenhuma vazão, autonomia ou irrigação é calculada.'}</p> : null}
    {compact ? null : <p className="mt-2 text-xs text-slate-400">{en ? 'The polygon is spatial context; it does not prove ownership or a registered field.' : 'O polígono é contexto espacial; não comprova propriedade nem talhão cadastrado.'}</p>}
  </section>;
}
