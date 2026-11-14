'use client';

import { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import type { AnalysisResult } from '@/lib/engine/types';
import { HOTSPOT_MIN_SLOPE_PCT, RELIEF_CLASSES, reliefLabel, type ReliefClassId, type TerrainContext } from '@/lib/terrain/terrain';
import { erosivityLabel } from '@/lib/climate/erosivity';
import { useLocale } from '@/components/locale-provider';

const classColor: Record<ReliefClassId, string> = { flat: '#2f6f4f', gently_undulating: '#7bb661', moderately_undulating: '#e6d36a', undulating: '#e8a24a', strongly_undulating: '#d9663a', mountainous: '#9b2d2d' };
const SIZE = 260;

export function TerrainPanel({ data }: { data: AnalysisResult }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const terrain = data.terrain;
  const erosivity = data.climate.erosivity;
  const num = (value: number, digits = 1) => value.toLocaleString(en ? 'en-US' : 'pt-BR', { maximumFractionDigits: digits });
  return <section aria-labelledby="terrain-heading" className="mt-6 rounded-xl border border-cyan-300/50 bg-slate-900 p-5">
    <h2 className="text-xl font-bold" id="terrain-heading">{en ? 'Relief and erosion context' : 'Relevo e contexto de erosão'}</h2>
    <p className="mt-1 text-xs text-slate-300">{en ? 'Slope from NASA SRTM and rainfall erosivity from NASA POWER. It shows where relief is steeper and how aggressive the rain typically is. It does not estimate soil loss.' : 'Declividade do SRTM da NASA e erosividade da chuva do NASA POWER. Mostra onde o relevo é mais inclinado e quão agressiva a chuva costuma ser. Não estima perda de solo.'}</p>
    {terrain?.status === 'available' ? <TerrainBody en={en} num={num} polygon={data.input.fieldBoundary} terrain={terrain} locale={locale} /> : <p className="mt-4 rounded-lg border border-slate-600 p-3 text-sm"><b>{en ? 'Relief (SRTM)' : 'Relevo (SRTM)'}:</b> N/D — {en ? 'the public elevation service did not answer; nothing is assumed about the terrain.' : 'o serviço público de elevação não respondeu; nada é presumido sobre o terreno.'}</p>}
    <div className="mt-4 rounded-lg border border-slate-600 bg-slate-950/50 p-3 text-sm">
      <b>{en ? 'Rainfall erosivity (Arnoldus Modified Fournier Index)' : 'Erosividade da chuva (Índice de Fournier Modificado, Arnoldus)'}:</b>{' '}
      {erosivity?.mfi !== null && erosivity?.mfi !== undefined && erosivity.classId ? <>{num(erosivity.mfi)} — {erosivityLabel(erosivity.classId, locale)} <span className="text-slate-400">({erosivity.validYears}/{erosivity.expectedYears} {en ? 'complete years' : 'anos completos'}; MFI = Σp²/P)</span></> : 'N/D'}
      <p className="mt-1 text-xs text-slate-300">{en ? 'Classes: <60 very low, 60–90 low, 90–120 moderate, 120–160 severe, >160 very severe.' : 'Classes: <60 muito baixa, 60–90 baixa, 90–120 moderada, 120–160 severa, >160 muito severa.'}</p>
    </div>
    <p className="mt-4 rounded-lg border border-amber-300/50 bg-amber-950/30 p-3 text-sm"><b>{en ? 'Soil loss (RUSLE): N/D.' : 'Perda de solo (RUSLE): N/D.'}</b> {en ? 'It needs soil erodibility (K), cover and management (C, P) and slope length, which this app does not have. The hotspots above are relief hotspots, not soil-loss hotspots.' : 'Exige erodibilidade do solo (K), cobertura e manejo (C, P) e comprimento de rampa, que este app não tem. Os hotspots acima são hotspots de relevo, não de perda de solo.'}</p>
  </section>;
}

function TerrainBody({ terrain, polygon, en, num, locale }: { terrain: TerrainContext; polygon: AnalysisResult['input']['fieldBoundary']; en: boolean; num: (value: number, digits?: number) => string; locale: 'pt-BR' | 'en' }) {
  const shares = terrain.classShares.filter((item) => item.sharePct > 0);
  return <div className="mt-4">
    <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{en ? 'Elevation' : 'Elevação'}</dt><dd className="font-bold">{terrain.elevationM ? (terrain.elevationM.min === terrain.elevationM.max ? `${terrain.elevationM.min} m` : `${terrain.elevationM.min}–${terrain.elevationM.max} m`) : 'N/D'}</dd></div>
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{en ? 'Slope (mean / max)' : 'Declividade (média / máx.)'}</dt><dd className="font-bold">{terrain.slopePct ? `${num(terrain.slopePct.mean)}% / ${num(terrain.slopePct.max)}%` : 'N/D'}</dd></div>
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{en ? `Relief hotspots (≥ ${HOTSPOT_MIN_SLOPE_PCT}%)` : `Hotspots de relevo (≥ ${HOTSPOT_MIN_SLOPE_PCT}%)`}</dt><dd className="font-bold">{terrain.hotspots.count} {en ? 'cells' : 'células'} · {num(terrain.hotspots.sharePct)}%</dd></div>
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{en ? 'Sample grid' : 'Malha de amostra'}</dt><dd className="font-bold">{terrain.gridSpacingM} m · {terrain.sampledCells} {terrain.sampledCells === 1 ? (en ? 'cell' : 'célula') : (en ? 'cells' : 'células')}</dd></div>
    </dl>
    <div className="mt-4 grid gap-4 md:grid-cols-[auto_1fr] md:items-start">
      {terrain.mode === 'polygon' && polygon ? <HotspotMap en={en} polygon={polygon} terrain={terrain} /> : <p className="max-w-xs rounded-lg border border-slate-600 p-3 text-xs text-slate-300">{en ? 'No boundary: slope is the local value around the point (about 180 m). Draw or import a boundary to see a hotspot map.' : 'Sem polígono: a declividade é o valor local em torno do ponto (cerca de 180 m). Desenhe ou importe um polígono para ver o mapa de hotspots.'}</p>}
      <div>
        <h3 className="text-sm font-bold">{en ? 'Relief classes (Embrapa)' : 'Classes de relevo (Embrapa)'}</h3>
        <ul className="mt-2 grid gap-1 text-sm">{RELIEF_CLASSES.map((item) => { const share = shares.find((entry) => entry.classId === item.id)?.sharePct ?? 0; return <li className="grid grid-cols-[1fr_auto] items-center gap-2" key={item.id}><span className="flex items-center gap-2"><span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: classColor[item.id] }} />{reliefLabel(item.id, locale)} <span className="text-xs text-slate-400">({item.minPct}{item.maxPct === null ? '%+' : `–${item.maxPct}%`})</span></span><b>{num(share)}%</b></li>; })}</ul>
        <p className="mt-2 text-xs text-slate-400">{en ? 'Share of the sampled cells. SRTM is about 30 m and its vertical error limits slope at small scales; the grid is at least 60 m apart.' : 'Parcela das células amostradas. O SRTM tem cerca de 30 m e seu erro vertical limita a declividade em escalas pequenas; a malha tem no mínimo 60 m.'}{terrain.coarse ? (en ? ' This boundary is large, so the grid is coarse.' : ' Este polígono é grande, então a malha é grosseira.') : ''}</p>
      </div>
    </div>
    <p className="mt-3 text-xs text-slate-400"><a className="inline-flex items-center gap-1 underline" href={terrain.source.url} rel="noreferrer" target="_blank">{terrain.source.dataset}<ExternalLink aria-hidden="true" size={12} /></a> · NASA JPL (2013), doi:10.5067/MEASURES/SRTM/SRTMGL1.003</p>
  </div>;
}

function HotspotMap({ terrain, polygon, en }: { terrain: TerrainContext; polygon: NonNullable<AnalysisResult['input']['fieldBoundary']>; en: boolean }) {
  const geometry = useMemo(() => {
    const lngs = [...polygon.map(([lng]) => lng), ...terrain.cells.map((cell) => cell.lng)]; const lats = [...polygon.map(([, lat]) => lat), ...terrain.cells.map((cell) => cell.lat)];
    const midLat = (Math.min(...lats) + Math.max(...lats)) / 2; const k = Math.cos(midLat * Math.PI / 180);
    const cellLng = terrain.gridSpacingM / (111_320 * k); const cellLat = terrain.gridSpacingM / 111_320;
    const minX = (Math.min(...lngs) - cellLng / 2) * k; const maxX = (Math.max(...lngs) + cellLng / 2) * k; const minY = Math.min(...lats) - cellLat / 2; const maxY = Math.max(...lats) + cellLat / 2;
    const scale = SIZE / Math.max(maxX - minX, maxY - minY);
    const px = (lng: number) => (lng * k - minX) * scale; const py = (lat: number) => SIZE - (lat - minY) * scale;
    return { px, py, cell: terrain.gridSpacingM / 111_320 * scale, height: (maxY - minY) * scale, width: (maxX - minX) * scale };
  }, [polygon, terrain]);
  const outline = polygon.map(([lng, lat]) => `${geometry.px(lng)},${geometry.py(lat)}`).join(' ');
  return <figure className="m-0"><svg aria-label={en ? `Relief hotspot map: ${terrain.hotspots.count} of ${terrain.sampledCells} sampled cells have slope of ${HOTSPOT_MIN_SLOPE_PCT}% or more.` : `Mapa de hotspots de relevo: ${terrain.hotspots.count} de ${terrain.sampledCells} células amostradas têm declividade de ${HOTSPOT_MIN_SLOPE_PCT}% ou mais.`} className="max-w-full rounded-lg border border-slate-600 bg-slate-950" role="img" viewBox={`0 0 ${Math.max(geometry.width, 40)} ${Math.max(geometry.height, 40)}`} width={Math.min(SIZE, Math.max(geometry.width, 40))}>
    {terrain.cells.map((cell) => <rect fill={classColor[cell.classId]} height={geometry.cell} key={`${cell.row}-${cell.col}`} stroke={cell.hotspot ? '#ffffff' : 'none'} strokeDasharray={cell.hotspot ? '3 2' : undefined} strokeWidth={cell.hotspot ? 1.5 : 0} width={geometry.cell} x={geometry.px(cell.lng) - geometry.cell / 2} y={geometry.py(cell.lat) - geometry.cell / 2}><title>{`${cell.slopePct}%`}</title></rect>)}
    <polygon fill="none" points={outline} stroke="#7fd1e8" strokeWidth="2" />
  </svg><figcaption className="mt-1 text-xs text-slate-400">{en ? 'Dashed white outline = relief hotspot (slope ≥ 8%). Cyan line = boundary.' : 'Contorno branco tracejado = hotspot de relevo (declividade ≥ 8%). Linha ciano = polígono.'}</figcaption></figure>;
}
