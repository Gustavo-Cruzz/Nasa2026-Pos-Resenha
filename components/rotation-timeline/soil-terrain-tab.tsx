'use client';

import { Term } from '@/components/rotation-timeline/glossary-term';
import { SoilHealthComparison } from '@/components/results/soil-health-comparison';
import { useLocale } from '@/components/locale-provider';
import type { AnalysisResult } from '@/lib/engine/types';
import { erosivityLabel } from '@/lib/climate/erosivity';
import { buildRegionalSoilSummary } from '@/lib/soil/presentation';
import { RELIEF_CLASSES, reliefLabel, type ReliefClassId } from '@/lib/terrain/terrain';
import { formatNumber } from '@/lib/rotation-timeline/text';

const RELIEF_COLOR: Record<ReliefClassId, string> = { flat: '#2f6f4f', gently_undulating: '#7bb661', moderately_undulating: '#e6d36a', undulating: '#e8a24a', strongly_undulating: '#d9663a', mountainous: '#9b2d2d' };
const TEXTURE_COLOR = { sand: '#E7BF62', silt: '#A9B8A4', clay: '#8DC8CF' } as const;

export function SoilTerrainTab({ data }: { data: AnalysisResult }) {
  const { locale } = useLocale(); const en = locale === 'en';
  const soilContext = data.soilContext; const profile = soilContext?.staticProfile; const available = profile?.status === 'available';
  const summary = soilContext ? buildRegionalSoilSummary(soilContext, locale) : [];
  const parts = available ? (['sand', 'silt', 'clay'] as const).map((id) => ({ id, value: profile.attributes[id]?.value ?? null, unit: profile.attributes[id]?.unit ?? '' })) : [];
  const textureComplete = parts.length === 3 && parts.every((part) => part.value !== null); const textureTotal = parts.reduce((sum, part) => sum + (part.value ?? 0), 0);
  const textureName = { sand: en ? 'sand' : 'areia', silt: en ? 'silt' : 'silte', clay: en ? 'clay' : 'argila' };
  const terrain = data.terrain; const erosivity = data.climate.erosivity;
  const farmerSoil = data.input.soil && data.input.soil.origin === 'farmer_lab' ? data.input.soil : null;
  return <div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
        <h3 className="m-0 text-[15px] font-bold"><Term k="SoilGrids">{en ? 'Soil' : 'Solo'}</Term> <span className="ml-1 rounded-full border border-cyan-300 px-2 py-0.5 text-[11px] font-normal text-cyan-200">{en ? 'Regional estimate' : 'Estimativa regional'}</span></h3>
        {available && soilContext ? <>
          <p className="mt-1 text-xs text-slate-400">{soilContext.municipality ? `${soilContext.municipality.name} (${soilContext.municipality.uf}) · ` : ''}SoilGrids 2.0 · 0–30 cm · 5 km</p>
          <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[13px]">{summary.map((item) => <div className="contents" key={item.id}><dt className="text-slate-400">{item.label}</dt><dd className="m-0 text-right font-mono">{item.value}</dd></div>)}</dl>
          {textureComplete ? <div className="mt-3"><div aria-label={parts.map((part) => `${textureName[part.id]} ${formatNumber(part.value, 0, locale)} ${part.unit}`).join(', ')} className="flex h-4 overflow-hidden rounded-lg" role="img">{parts.map((part) => <span key={part.id} style={{ width: `${((part.value as number) / textureTotal) * 100}%`, background: TEXTURE_COLOR[part.id] }} />)}</div><p className="mt-1 text-[11px] text-slate-300">{parts.map((part) => `${textureName[part.id]} ${formatNumber(part.value, 0, locale)} ${part.unit}`).join(' · ')}</p></div> : <p className="mt-2 text-xs text-amber-200">{en ? 'N/D: sand, silt and clay are not all available.' : 'N/D: areia, silte e argila não estão todos disponíveis.'}</p>}
        </> : <p className="mt-2 text-sm text-amber-200">N/D — {en ? 'no regional soil estimate for this location.' : 'sem estimativa regional de solo para este local.'}</p>}
        {farmerSoil ? <p className="mt-2 rounded-lg border border-lime-300/50 px-2 py-1 text-xs">{en ? 'Reported by you' : 'Informado por você'}: pH {formatNumber(farmerSoil.ph, 1, locale)} · {en ? 'organic carbon' : 'carbono orgânico'} {formatNumber(farmerSoil.organicCarbonGKg, 1, locale)} g/kg</p> : <p className="mt-2 text-xs text-slate-400">{en ? 'No field soil analysis reported.' : 'Nenhuma análise de solo do talhão informada.'}</p>}
        <p className="mt-2 text-[11px] text-slate-400">{en ? 'Regional modelled context, not a field measurement.' : 'Contexto regional modelado, não medição do talhão.'}</p>
      </article>
      <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
        <h3 className="m-0 text-[15px] font-bold">{en ? 'Relief' : 'Relevo'} <span className="ml-1 rounded-full border border-cyan-300 px-2 py-0.5 text-[11px] font-normal text-cyan-200">NASA SRTM</span></h3>
        {terrain?.status === 'available' && terrain.slopePct ? <>
          <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[13px]">
            <dt className="text-slate-400">{en ? 'Mean slope' : 'Declividade média'}</dt><dd className="m-0 text-right font-mono">{formatNumber(terrain.slopePct.mean, 1, locale)} %</dd>
            <dt className="text-slate-400">{en ? 'Max slope' : 'Declividade máxima'}</dt><dd className="m-0 text-right font-mono">{formatNumber(terrain.slopePct.max, 1, locale)} %</dd>
            <dt className="text-slate-400">{en ? 'Elevation' : 'Elevação'}</dt><dd className="m-0 text-right font-mono">{terrain.elevationM ? `${formatNumber(terrain.elevationM.min, 0, locale)}–${formatNumber(terrain.elevationM.max, 0, locale)} m` : 'N/D'}</dd>
            <dt className="text-slate-400">{en ? 'Steep hotspots' : 'Pontos mais inclinados'}</dt><dd className="m-0 text-right font-mono">{terrain.hotspots.count} ({formatNumber(terrain.hotspots.sharePct, 0, locale)} %)</dd>
          </dl>
          <div aria-label={terrain.classShares.map((item) => `${reliefLabel(item.classId, locale)} ${formatNumber(item.sharePct, 0, locale)}%`).join(', ')} className="mt-3 flex h-4 overflow-hidden rounded-lg" role="img">{terrain.classShares.map((item) => <span key={item.classId} style={{ width: `${item.sharePct}%`, background: RELIEF_COLOR[item.classId] }} />)}</div>
          <p className="mt-1 text-[11px] text-slate-300">{RELIEF_CLASSES.filter((item) => terrain.classShares.some((share) => share.classId === item.id && share.sharePct > 0)).map((item) => `${reliefLabel(item.id, locale)} ${formatNumber(terrain.classShares.find((share) => share.classId === item.id)?.sharePct ?? null, 0, locale)}%`).join(' · ')}</p>
        </> : <p className="mt-2 text-sm text-amber-200">N/D — {en ? 'the elevation service did not return relief for this area.' : 'o serviço de elevação não devolveu o relevo desta área.'}</p>}
        <p className="mt-3 text-[13px]"><b><Term k="MFI">{en ? 'Rainfall erosivity' : 'Erosividade da chuva'}</Term>:</b> {erosivity?.mfi !== null && erosivity?.mfi !== undefined && erosivity.classId ? `${formatNumber(erosivity.mfi, 0, locale)} — ${erosivityLabel(erosivity.classId, locale)}` : 'N/D'}</p>
        <p className="mt-2 text-[11px] text-slate-400">{en ? 'It shows where relief is steeper and how aggressive the rain typically is; it does not estimate soil loss.' : 'Mostra onde o relevo é mais inclinado e quão agressiva a chuva costuma ser; não estima perda de solo.'}</p>
      </article>
    </div>
    <SoilHealthComparison strategies={data.strategies} />
  </div>;
}
