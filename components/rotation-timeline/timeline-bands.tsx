'use client';

import type { Locale } from '@/lib/i18n';
import { cropDisplayName } from '@/lib/presentation';
import { readMonth, secondCropSegment, thermalReference, windowBalanceSum, type LaneModel, type ScenarioId, type TimelineModel } from '@/lib/rotation-timeline/model';
import { formatNumber, seriesTextEquivalent } from '@/lib/rotation-timeline/text';
import type { WhatIf } from '@/lib/rotation-timeline/what-if';

export const COLORS = { water: '#8DC8CF', deficit: '#E7BF62', lime: '#B6DC63', cream: '#FBF8F0', muted: '#A9B8A4', text: '#E2E7DC', grid: '#405840' } as const;
export const LANE_COLOR: Record<ScenarioId, string> = { A: COLORS.cream, B: COLORS.water, C: COLORS.lime };
export const HATCH = { deficit: 'rt-hatch-deficit', partial: 'rt-hatch-partial', ground: 'rt-hatch-ground' } as const;

export type BandId = 'rain' | 'balance' | 'temp' | 'zarc' | 'erosivity' | 'wetness' | 'ndvi';
export const BAND_IDS: BandId[] = ['rain', 'balance', 'temp', 'zarc', 'erosivity', 'wetness', 'ndvi'];
export type BandProps = { model: TimelineModel; whatIf: WhatIf; mw: number; width: number; lanes: LaneModel[]; thermalSc: ScenarioId; locale: Locale };

const copy = (locale: Locale, pt: string, en: string) => locale === 'en' ? en : pt;

/** Heights and availability of each band. `missing` is the N/D message shown when the series is absent. */
export function bandInfo(id: BandId, model: TimelineModel, laneCount: number, locale: Locale): { height: number; available: boolean; missing: string; title: string; subtitle: string } {
  const { series } = model; const t = (pt: string, en: string) => copy(locale, pt, en);
  switch (id) {
    case 'rain': return { height: 96, available: series.has.rain, title: t('Chuva mensal', 'Monthly rain'), subtitle: t('mm · mediana histórica NASA POWER', 'mm · NASA POWER historical median'), missing: t('N/D — dado não disponível: a chuva histórica mensal não foi carregada.', 'N/D — data not available: monthly historical rain was not loaded.') };
    case 'balance': return { height: 118 + laneCount * 15, available: series.has.balance, title: t('Sobra ou falta de água (P−ET₀)', 'Water surplus or deficit (P−ET₀)'), subtitle: t('mm · barras divergentes', 'mm · diverging bars'), missing: t('N/D — dado não disponível: P−ET₀ (chuva menos ET₀ FAO-56) não foi calculado para este local.', 'N/D — data not available: P−ET₀ (rain minus FAO-56 ET₀) was not computed for this location.') };
    case 'temp': return { height: 104, available: series.has.temp, title: t('Temperatura média e faixa da cultura', 'Mean temperature and crop range'), subtitle: t('°C · mediana mensal NASA POWER', '°C · NASA POWER monthly median'), missing: t('N/D — dado não disponível: a temperatura média mensal não foi carregada.', 'N/D — data not available: monthly mean temperature was not loaded.') };
    case 'zarc': return { height: laneCount * 22 + 40, available: model.zarcAvailable, title: t('Janela ZARC e risco', 'ZARC window and risk'), subtitle: t('por cenário e cultura', 'by scenario and crop'), missing: t('N/D — dado não disponível: sem ZARC municipal processado para este local.', 'N/D — data not available: no processed municipal ZARC for this location.') };
    case 'erosivity': return { height: 92 + laneCount * 13, available: series.rainSharePct.some((value) => value !== null), title: t('Erosividade e solo descoberto', 'Erosivity and bare soil'), subtitle: t('% da chuva anual no mês (base do Fournier)', '% of annual rain in the month (Fournier basis)'), missing: t('N/D — dado não disponível: sem os 12 meses de chuva não há como medir a contribuição de cada mês.', 'N/D — data not available: without all 12 months of rain the monthly contribution cannot be measured.') };
    case 'wetness': return { height: 84, available: series.has.wetness, title: t('Umidade da zona radicular (GWETROOT)', 'Root-zone wetness (GWETROOT)'), subtitle: t('índice 0–1 · modelado', 'index 0–1 · modelled'), missing: t('N/D — dado não disponível: GWETROOT não foi carregado.', 'N/D — data not available: GWETROOT was not loaded.') };
    case 'ndvi': return { height: 84, available: series.has.ndvi, title: t('NDVI mensal (MODIS)', 'Monthly NDVI (MODIS)'), subtitle: t('mediana mensal', 'monthly median'), missing: t('N/D — dado não disponível: não há série NDVI válida para este local (ex.: ponto sobre água ou fora dos pontos com arquivo verificado).', 'N/D — data not available: no valid NDVI series for this location (e.g. a point on water or outside the points with a verified file).') };
  }
}

/** Hatch patterns referenced by url(#id) from every band SVG. Render once per page. */
export function BandDefs() {
  return <svg aria-hidden="true" focusable="false" height="0" style={{ position: 'absolute' }} width="0"><defs>
    <pattern height="6" id={HATCH.deficit} patternTransform="rotate(45)" patternUnits="userSpaceOnUse" width="6"><rect fill={COLORS.deficit} fillOpacity=".25" height="6" width="6" /><line stroke={COLORS.deficit} strokeWidth="2" x1="0" x2="0" y1="0" y2="6" /></pattern>
    <pattern height="6" id={HATCH.partial} patternTransform="rotate(-45)" patternUnits="userSpaceOnUse" width="6"><rect fill={COLORS.water} fillOpacity=".2" height="6" width="6" /><line stroke={COLORS.water} strokeWidth="1.5" x1="0" x2="0" y1="0" y2="6" /></pattern>
    <pattern height="5" id={HATCH.ground} patternTransform="rotate(45)" patternUnits="userSpaceOnUse" width="5"><line stroke={COLORS.grid} strokeWidth="2" x1="0" x2="0" y1="0" y2="5" /></pattern>
  </defs></svg>;
}

const linePath = (points: Array<{ x: number; y: number } | null>) => points.reduce((path, point, index) => point ? `${path}${index === 0 || !points[index - 1] ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)} ` : path, '');

function Svg({ width, height, label, children }: { width: number; height: number; label: string; children: React.ReactNode }) {
  return <svg aria-label={label} className="block" height={height} role="img" viewBox={`0 0 ${width} ${height}`} width={width}>{children}</svg>;
}

export function RainBand({ model, whatIf, mw, width, locale }: BandProps) {
  const height = bandInfo('rain', model, 0, locale).height;
  const readings = model.months.map((item) => readMonth(model.series, item.month, whatIf));
  const max = Math.max(1, ...readings.flatMap((reading) => [reading.rainMm ?? 0, reading.rainBaseMm ?? 0]));
  const scale = (height - 24) / max; const barWidth = mw * 0.62;
  const label = seriesTextEquivalent(copy(locale, 'Chuva mensal (mediana)', 'Monthly rain (median)'), Array.from({ length: 12 }, (_, index) => readMonth(model.series, index + 1, whatIf).rainMm), 'mm', model.startMonth, 0, locale);
  return <Svg height={height} label={label} width={width}>
    {readings.map((reading, index) => {
      const x = index * mw + (mw - barWidth) / 2;
      if (reading.rainMm === null) return <text fill={COLORS.muted} fontSize="9" key={index} textAnchor="middle" x={index * mw + mw / 2} y={height - 8}>N/D</text>;
      const partial = (model.series.rainCoveragePct[reading.month - 1] ?? 100) < 100; const barHeight = reading.rainMm * scale;
      return <g key={index}>
        {whatIf.rainPct !== 0 && reading.rainBaseMm !== null ? <rect fill="none" height={reading.rainBaseMm * scale} opacity=".6" stroke={COLORS.water} strokeDasharray="3 2" width={barWidth} x={x} y={height - 4 - reading.rainBaseMm * scale} /> : null}
        <rect fill={partial ? `url(#${HATCH.partial})` : COLORS.water} height={barHeight} rx="2" stroke={COLORS.water} strokeDasharray={partial ? '3 2' : undefined} strokeWidth={partial ? 1 : 0} width={barWidth} x={x} y={height - 4 - barHeight} />
        <text fill={COLORS.text} fontSize="10" textAnchor="middle" x={index * mw + mw / 2} y={height - 7 - barHeight}>{formatNumber(reading.rainMm, 0, locale)}</text>
      </g>;
    })}
  </Svg>;
}

export function BalanceBand({ model, whatIf, mw, width, lanes, locale }: BandProps) {
  const height = bandInfo('balance', model, lanes.length, locale).height; const plot = 100; const zero = plot / 2;
  const readings = model.months.map((item) => readMonth(model.series, item.month, whatIf));
  const maxAbs = Math.max(1, ...readings.flatMap((reading) => [Math.abs(reading.balanceMm ?? 0), Math.abs(reading.balanceBaseMm ?? 0)]));
  const scale = (zero - 16) / maxAbs; const barWidth = mw * 0.62;
  const label = seriesTextEquivalent(copy(locale, 'P−ET₀ mensal (mediana de chuva menos ET₀)', 'Monthly P−ET₀ (median rain minus ET₀)'), Array.from({ length: 12 }, (_, index) => readMonth(model.series, index + 1, whatIf).balanceMm), 'mm', model.startMonth, 0, locale);
  const sumLabel = lanes.map((lane) => [1, 2].map((year) => { const segment = secondCropSegment(lane, year as 1 | 2); const sum = segment ? windowBalanceSum(model.series, segment.months, whatIf).sumMm : null; return segment ? `${lane.id} ${copy(locale, 'ano', 'year')} ${year}: ${sum === null ? 'N/D' : `${formatNumber(sum, 0, locale)} mm`}` : null; }).filter(Boolean).join('; ')).filter(Boolean).join('; ');
  return <Svg height={height} label={`${label} ${copy(locale, 'Soma na janela da segunda cultura', 'Sum over the second-crop window')}: ${sumLabel || 'N/D'}.`} width={width}>
    <line stroke={COLORS.muted} x1="0" x2={width} y1={zero} y2={zero} />
    {readings.map((reading, index) => {
      const x = index * mw + (mw - barWidth) / 2; const value = reading.balanceMm;
      if (value === null) return <text fill={COLORS.muted} fontSize="9" key={index} textAnchor="middle" x={index * mw + mw / 2} y={zero - 3}>N/D</text>;
      const barHeight = Math.abs(value) * scale; const base = reading.balanceBaseMm;
      return <g key={index}>
        {whatIf.rainPct !== 0 && base !== null ? <rect fill="none" height={Math.abs(base) * scale} opacity=".7" stroke={COLORS.muted} strokeDasharray="3 2" width={barWidth} x={x} y={base >= 0 ? zero - base * scale : zero} /> : null}
        {value >= 0 ? <><rect fill={COLORS.water} height={barHeight} rx="2" width={barWidth} x={x} y={zero - barHeight} /><text fill={COLORS.water} fontSize="9" textAnchor="middle" x={index * mw + mw / 2} y={zero - barHeight - 3}>▲</text></>
          : <><rect fill={`url(#${HATCH.deficit})`} height={barHeight} rx="2" stroke={COLORS.deficit} width={barWidth} x={x} y={zero} /><text fill={COLORS.deficit} fontSize="9" textAnchor="middle" x={index * mw + mw / 2} y={zero + barHeight + 10}>▼</text></>}
      </g>;
    })}
    {lanes.map((lane, laneIndex) => [1, 2].map((year) => {
      const segment = secondCropSegment(lane, year as 1 | 2); if (!segment) return null;
      const y = plot + 14 + laneIndex * 15; const sum = windowBalanceSum(model.series, segment.months, whatIf).sumMm;
      const reference = lanes[0]; const referenceSegment = reference ? secondCropSegment(reference, year as 1 | 2) : null; const referenceSum = referenceSegment ? windowBalanceSum(model.series, referenceSegment.months, whatIf).sumMm : null;
      const delta = lane.id !== 'A' && sum !== null && referenceSum !== null ? ` (${formatNumber(sum - referenceSum, 0, locale, { sign: true })})` : '';
      const x1 = segment.startOffset * mw + 2; const x2 = (segment.startOffset + segment.length) * mw - 2;
      return <g key={`${lane.id}-${year}`}><path d={`M${x1} ${y - 5}V${y}H${x2}V${y - 5}`} fill="none" stroke={LANE_COLOR[lane.id]} strokeWidth="1.5" /><text fill={LANE_COLOR[lane.id]} fontFamily="ui-monospace, monospace" fontSize="10" x={x1 + 2} y={y + 10}>{lane.id}: {sum === null ? 'N/D' : `${formatNumber(sum, 0, locale)} mm${delta}`}</text></g>;
    }))}
  </Svg>;
}

export function TempBand({ model, whatIf, mw, width, lanes, thermalSc, locale }: BandProps) {
  const height = bandInfo('temp', model, 0, locale).height;
  const lane = lanes.find((item) => item.id === thermalSc) ?? lanes[0];
  const reference = lane ? thermalReference(lane) : { cropId: null, range: null };
  const readings = model.months.map((item) => readMonth(model.series, item.month, whatIf));
  const values = readings.flatMap((reading) => [reading.tmeanC, reading.tmeanBaseC]).filter((value): value is number => value !== null);
  const bounds = [...values, ...(reference.range ? [reference.range.min, reference.range.max] : [])];
  const lo = Math.floor((Math.min(...bounds) - 2) / 5) * 5; const hi = Math.ceil((Math.max(...bounds) + 2) / 5) * 5;
  const y = (value: number) => height - 8 - ((value - lo) / Math.max(1, hi - lo)) * (height - 24);
  const point = (reading: (typeof readings)[number], index: number, key: 'tmeanC' | 'tmeanBaseC') => reading[key] === null ? null : { x: index * mw + mw / 2, y: y(reading[key] as number) };
  const ticks = Array.from({ length: Math.floor((hi - lo) / 10) + 1 }, (_, step) => lo + step * 10).filter((value) => value <= hi);
  const label = `${seriesTextEquivalent(copy(locale, 'Temperatura média mensal', 'Monthly mean temperature'), Array.from({ length: 12 }, (_, index) => readMonth(model.series, index + 1, whatIf).tmeanC), '°C', model.startMonth, 1, locale)} ${reference.range ? `${copy(locale, 'Faixa térmica documentada', 'Documented thermal range')} ${cropDisplayName(reference.cropId, null, locale)}: ${reference.range.min}–${reference.range.max} °C.` : copy(locale, 'Faixa térmica documentada: N/D.', 'Documented thermal range: N/D.')}`;
  return <Svg height={height} label={label} width={width}>
    {reference.range ? <><rect fill={COLORS.water} height={y(reference.range.min) - y(reference.range.max)} opacity=".13" width={width} x="0" y={y(reference.range.max)} /><line stroke={COLORS.water} strokeDasharray="4 3" x1="0" x2={width} y1={y(reference.range.max)} y2={y(reference.range.max)} /><line stroke={COLORS.water} strokeDasharray="4 3" x1="0" x2={width} y1={y(reference.range.min)} y2={y(reference.range.min)} /></> : null}
    {whatIf.tempC !== 0 ? <path d={linePath(readings.map((reading, index) => point(reading, index, 'tmeanBaseC')))} fill="none" stroke={COLORS.muted} strokeDasharray="3 3" /> : null}
    <path d={linePath(readings.map((reading, index) => point(reading, index, 'tmeanC')))} fill="none" stroke={COLORS.cream} strokeWidth="2" />
    {readings.map((reading, index) => {
      if (reading.tmeanC === null) return <text fill={COLORS.muted} fontSize="9" key={index} textAnchor="middle" x={index * mw + mw / 2} y={height - 4}>N/D</text>;
      const outside = Boolean(reference.range && (reading.tmeanC > reference.range.max || reading.tmeanC < reference.range.min));
      return <g key={index}><circle cx={index * mw + mw / 2} cy={y(reading.tmeanC)} fill={COLORS.cream} r={outside ? 4.5 : 3} stroke={outside ? COLORS.deficit : COLORS.cream} strokeWidth="1.6" />{outside ? <text fill={COLORS.deficit} fontSize="9" textAnchor="middle" x={index * mw + mw / 2} y={y(reading.tmeanC) - 7}>▼</text> : null}</g>;
    })}
    {ticks.map((tick) => <text fill={COLORS.muted} fontFamily="ui-monospace, monospace" fontSize="9" key={tick} textAnchor="end" x={width - 3} y={y(tick) + 3}>{tick}</text>)}
    <text fill={COLORS.water} fontSize="10" x="4" y="12">{reference.range ? `${copy(locale, 'faixa documentada', 'documented range')} ${cropDisplayName(reference.cropId, null, locale)}: ${reference.range.min}–${reference.range.max} °C` : `${copy(locale, 'faixa térmica documentada', 'documented thermal range')} ${reference.cropId ? cropDisplayName(reference.cropId, null, locale) : ''}: N/D`}</text>
  </Svg>;
}

export function ZarcBand({ model, mw, width, lanes, locale }: BandProps) {
  const height = bandInfo('zarc', model, lanes.length, locale).height;
  const descriptions: string[] = [];
  lanes.forEach((lane) => lane.zarc.forEach((cell) => { if (cell?.sowing) descriptions.push(`${lane.id} ${cropDisplayName(cell.cropId, null, locale)}: ${cell.status === 'indicated' ? `${copy(locale, 'indicado', 'indicated')}${cell.riskPct ? ` ${copy(locale, 'risco', 'risk')} ${cell.riskPct}%` : ''}` : cell.status === 'not_indicated' ? copy(locale, 'não indicado', 'not indicated') : 'N/D'}`); }));
  return <Svg height={height} label={`${copy(locale, 'Janela ZARC no mês de plantio de cada cultura', 'ZARC window in the sowing month of each crop')}: ${descriptions.join('; ') || 'N/D'}.`} width={width}>
    {lanes.map((lane, laneIndex) => {
      const top = laneIndex * 22 + 4;
      return <g key={lane.id}>
        <text fill={LANE_COLOR[lane.id]} fontSize="10" fontWeight="700" x="2" y={top + 13}>{lane.id}</text>
        {lane.zarc.map((cell, offset) => {
          if (!cell) return null; const x = offset * mw + 1; const w = mw - 2; const opacity = cell.sowing ? 1 : 0.5;
          if (cell.status === 'indicated') return <g key={offset} opacity={opacity}><rect fill="#264d55" height="18" rx="4" stroke={cell.sowing ? COLORS.lime : COLORS.water} strokeWidth={cell.sowing ? 2 : 1} width={w} x={x} y={top} /><text fill={COLORS.cream} fontSize="10" textAnchor="middle" x={x + w / 2} y={top + 13}>{cell.riskPct ? `${cell.riskPct}%` : '●'}</text></g>;
          if (cell.status === 'not_indicated') return <g key={offset} opacity={opacity}><rect fill="none" height="18" rx="4" stroke={COLORS.deficit} strokeWidth={cell.sowing ? 2 : 1} width={w} x={x} y={top} /><text fill={COLORS.deficit} fontSize="12" fontWeight="700" textAnchor="middle" x={x + w / 2} y={top + 14}>×</text></g>;
          return <g key={offset} opacity={opacity}><rect fill="none" height="18" rx="4" stroke={COLORS.deficit} strokeDasharray="3 2" width={w} x={x} y={top} /><text fill={COLORS.deficit} fontSize="12" fontWeight="700" textAnchor="middle" x={x + w / 2} y={top + 14}>?</text></g>;
        })}
      </g>;
    })}
    <text fill={COLORS.text} fontSize="11" x="4" y={height - 6}>{copy(locale, '% = menor risco indicado · × não indicado · ? sem registro ZARC. Vale para o mês de semeadura (contorno verde); zoneamento de risco, não garantia.', '% = lowest indicated risk · × not indicated · ? no ZARC record. Applies to the sowing month (green outline); risk zoning, not a guarantee.')}</text>
  </Svg>;
}

export function ErosivityBand({ model, mw, width, lanes, locale }: BandProps) {
  const height = bandInfo('erosivity', model, lanes.length, locale).height; const plot = 76; const base = plot - 4; const scale = (plot - 22) / Math.max(1, ...model.series.rainSharePct.map((value) => value ?? 0)); const threshold = 100 / 12;
  const coincide = (lane: LaneModel) => lane.bare.reduce((sum, segment) => sum + segment.highErosivityMonths, 0);
  const counts = lanes.map((lane) => `${lane.id} ${lane.bareKnown ? coincide(lane) : 'N/D'}`).join(' · ');
  const label = `${seriesTextEquivalent(copy(locale, 'Contribuição do mês para a chuva anual', 'Month share of annual rain'), model.series.rainSharePct, '%', model.startMonth, 1, locale)} ${copy(locale, 'Meses descobertos em meses de chuva mais erosiva', 'Bare months in more erosive months')}: ${counts}.`;
  return <Svg height={height} label={label} width={width}>
    <line stroke={COLORS.muted} strokeDasharray="4 3" x1="0" x2={width} y1={base - threshold * scale} y2={base - threshold * scale} />
    <text fill={COLORS.muted} fontSize="9" x="3" y={base - threshold * scale - 3}>{copy(locale, 'média 1/12', 'average 1/12')}</text>
    {model.months.map((item, offset) => {
      const share = model.series.rainSharePct[item.month - 1]; if (share === null || share === undefined) return null;
      const high = model.series.highErosivity[item.month - 1]; const barWidth = mw * 0.62;
      return <rect fill={high ? COLORS.deficit : '#6f7f69'} height={share * scale} key={offset} opacity={high ? 0.9 : 0.6} rx="2" width={barWidth} x={offset * mw + (mw - barWidth) / 2} y={base - share * scale} />;
    })}
    <text fill={COLORS.cream} fontSize="11" textAnchor="end" x={width - 4} y="14">{copy(locale, `meses descobertos em meses de chuva mais erosiva: ${counts}`, `bare months in more erosive months: ${counts}`)}</text>
    {lanes.map((lane, laneIndex) => {
      const top = plot + laneIndex * 13;
      return <g key={lane.id}>
        <text fill={LANE_COLOR[lane.id]} fontSize="9" x="2" y={top + 9}>{lane.id}</text>
        {!lane.bareKnown ? <text fill={COLORS.muted} fontSize="9" x="14" y={top + 9}>N/D</text> : null}
        {lane.bare.flatMap((segment) => Array.from({ length: segment.length }, (_, step) => segment.startOffset + step)).map((offset) => {
          const high = model.series.highErosivity[model.months[offset]!.month - 1];
          return <g key={offset}><rect fill={`url(#${HATCH.deficit})`} height="9" rx="3" stroke={COLORS.deficit} strokeWidth={high ? 2.5 : 1} width={mw - 2} x={offset * mw + 1} y={top + 1} />{high ? <text fill={COLORS.cream} fontSize="9" textAnchor="middle" x={offset * mw + mw / 2} y={top + 9}>▼</text> : null}</g>;
        })}
      </g>;
    })}
    <text fill={COLORS.muted} fontSize="10" x="4" y={height - 3}>{model.series.erosivityClassId ? copy(locale, 'âmbar = mês com chuva acima da média na classe anual moderada ou maior · hachura = sem janela de cultura · palha não modelada', 'amber = above-average rain month in a moderate-or-higher annual class · hatch = no crop window · residue not modelled') : copy(locale, 'classe anual de erosividade N/D: nenhum mês é destacado · hachura = sem janela de cultura', 'annual erosivity class N/D: no month is highlighted · hatch = no crop window')}</text>
  </Svg>;
}

export function WetnessBand({ model, mw, width, locale }: BandProps) {
  const height = bandInfo('wetness', model, 0, locale).height; const y = (value: number) => height - 8 - Math.min(1, Math.max(0, value)) * (height - 28);
  const points = model.months.map((item, offset) => { const value = model.series.wetness[item.month - 1]; return value === null || value === undefined ? null : { x: offset * mw + mw / 2, y: y(value), value }; });
  return <Svg height={height} label={seriesTextEquivalent(copy(locale, 'Umidade relativa da zona radicular (GWETROOT, 0 a 1)', 'Relative root-zone wetness (GWETROOT, 0 to 1)'), model.series.wetness, '', model.startMonth, 2, locale)} width={width}>
    <path d={linePath(points)} fill="none" stroke={COLORS.water} strokeWidth="2" />
    {points.map((item, index) => item ? <circle cx={item.x} cy={item.y} fill={COLORS.water} key={index} r="3" /> : <text fill={COLORS.muted} fontSize="9" key={index} textAnchor="middle" x={index * mw + mw / 2} y={height - 4}>N/D</text>)}
    <text fill={COLORS.water} fontSize="10" x="3" y="12">{copy(locale, 'umidade relativa 0–1 (modelada, não medida no talhão)', 'relative wetness 0–1 (modelled, not measured in the field)')}</text>
  </Svg>;
}

export function NdviBand({ model, mw, width, locale }: BandProps) {
  const height = bandInfo('ndvi', model, 0, locale).height; const y = (value: number) => height - 8 - Math.min(1, Math.max(0, value)) * (height - 28);
  const points = model.months.map((item, offset) => { const value = model.series.ndvi[item.month - 1]; return value === null || value === undefined ? null : { x: offset * mw + mw / 2, y: y(value) }; });
  return <Svg height={height} label={seriesTextEquivalent(copy(locale, 'NDVI mensal MODIS (mediana)', 'MODIS monthly NDVI (median)'), model.series.ndvi, '', model.startMonth, 2, locale)} width={width}>
    <path d={linePath(points)} fill="none" stroke={COLORS.lime} strokeWidth="2" />
    {points.map((item, index) => item ? <circle cx={item.x} cy={item.y} fill={COLORS.lime} key={index} r="3" /> : <text fill={COLORS.muted} fontSize="9" key={index} textAnchor="middle" x={index * mw + mw / 2} y={height - 4}>N/D</text>)}
    <text fill={COLORS.lime} fontSize="10" x="3" y="12">{copy(locale, 'NDVI 0–1 (vigor da vegetação visto do satélite)', 'NDVI 0–1 (satellite vegetation vigour)')}</text>
    {model.series.ndviMunicipal ? <text fill={COLORS.muted} fontSize="9" x="3" y={height - 16}>{copy(locale, 'Representativo do município; ponto de 250 m, não da fazenda.', 'Municipal representative; 250 m point, not the farm.')}</text> : null}
  </Svg>;
}

export const BAND_COMPONENTS: Record<BandId, (props: BandProps) => React.ReactNode> = { rain: RainBand, balance: BalanceBand, temp: TempBand, zarc: ZarcBand, erosivity: ErosivityBand, wetness: WetnessBand, ndvi: NdviBand };
