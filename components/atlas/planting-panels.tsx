'use client';

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ClimateApiResponse } from '@/lib/atlas';
import { seasonMonths } from '@/lib/climate/enso';
import type { JsonState } from '@/components/atlas/use-json';
import { useExtras } from '@/components/atlas/explore-extras';
import { JoaoComment } from '@/components/atlas/joao-panel';

type Climate = Extract<ClimateApiResponse, { status: 'ok' }>;

const MONTHS = {
  'pt-BR': { short: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'], long: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'] },
  en: { short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], long: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] },
} as const;

const numberFormat = (value: number, digits: number, en: boolean) => value.toLocaleString(en ? 'en-US' : 'pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Collapsible card: the title and one headline value are always visible, the detail and its caveats open on demand. */
function Card({ id, joao, title, headline, children, note }: { id: string; /** João's line that explains this block; defaults to the card id. */ joao?: string; title: string; headline?: ReactNode; children: ReactNode; note?: ReactNode }) {
  const { isOpen, setOpen } = useExtras();
  return <details className="group scroll-mt-2 rounded-lg border border-slate-700 bg-slate-950/60" id={`card-${id}`} onToggle={(event) => setOpen(id, event.currentTarget.open)} open={isOpen(id)}>
    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0"><span className="block text-sm font-bold text-lime-200">{title}</span>{headline ? <span className="mt-0.5 block text-sm text-slate-200">{headline}</span> : null}</span>
      <ChevronDown aria-hidden="true" className="shrink-0 text-slate-400 transition-transform group-open:rotate-180 motion-reduce:transition-none" size={18} />
    </summary>
    <div className="flex flex-col border-t border-slate-800 p-3 text-sm">
      {children}
      <JoaoComment id={joao ?? id} />
      {note ? <p className="mt-2 text-xs text-slate-400">{note}</p> : null}
    </div>
  </details>;
}

const Waiting = ({ state, en, children }: { state: JsonState<unknown>; en: boolean; children: ReactNode }) =>
  state.kind === 'ready' ? <>{children}</>
    : state.kind === 'error' ? <p className="text-amber-100">{en ? 'Unavailable right now. Nothing is estimated in its place.' : 'Indisponível agora. Nada é estimado no lugar.'}</p>
      : <p className="text-slate-300" role="status">{en ? 'Loading…' : 'Carregando…'}</p>;

type Series = { label: string; color: string; dashed?: boolean; data: Array<number | null> };
type Band = { label: string; color: string; lo: Array<number | null>; hi: Array<number | null> };

/** 12-month line chart with optional min–max band. Missing months leave a gap (N/D); nothing is interpolated. The same numbers are offered as a table. */
function MonthSeriesChart({ series, band, domain, unit, ariaLabel, en, digits = 1 }: { series: Series[]; band?: Band; domain: [number, number]; unit: string; ariaLabel: string; en: boolean; digits?: number }) {
  const names = MONTHS[en ? 'en' : 'pt-BR'].short;
  const W = 360; const H = 170; const top = 12; const bottom = 24; const left = 38; const right = 8;
  const plotW = W - left - right; const plotH = H - top - bottom;
  const [lo, hi] = domain;
  const x = (index: number) => left + (plotW / 11) * index;
  const y = (value: number) => top + plotH - ((Math.min(Math.max(value, lo), hi) - lo) / (hi - lo)) * plotH;
  const path = (data: Array<number | null>) => data.map((value, index) => value === null ? null : `${x(index)},${y(value)}`).reduce<string[][]>((groups, point) => { if (point === null) groups.push([]); else if (groups.length === 0) groups.push([point]); else groups[groups.length - 1].push(point); return groups; }, []).filter((group) => group.length > 0);
  const ticks = [0, 1, 2, 3, 4].map((step) => lo + ((hi - lo) / 4) * step);
  const bandPoints = band ? band.hi.map((high, index) => ({ index, high, low: band.lo[index] })).filter((item): item is { index: number; high: number; low: number } => item.high !== null && item.low !== null) : [];
  const fmt = (value: number | null) => value === null ? 'N/D' : numberFormat(value, digits, en);
  return <div>
    <svg aria-label={ariaLabel} className="mx-auto w-full max-w-md" role="img" viewBox={`0 0 ${W} ${H}`}>
      {ticks.map((tick) => <g key={tick}><line stroke="#405840" strokeWidth="1" x1={left} x2={W - right} y1={y(tick)} y2={y(tick)} /><text fill="#aab7a3" fontSize="9" textAnchor="end" x={left - 4} y={y(tick) + 3}>{numberFormat(tick, tick % 1 === 0 ? 0 : Math.max(1, Math.min(digits, 2)), en)}</text></g>)}
      {band && bandPoints.length >= 2 ? <polygon fill={band.color} fillOpacity="0.22" points={[...bandPoints.map((item) => `${x(item.index)},${y(item.high)}`), ...[...bandPoints].reverse().map((item) => `${x(item.index)},${y(item.low)}`)].join(' ')} /> : null}
      {series.map((item) => path(item.data).map((group, index) => group.length === 1
        ? <circle cx={group[0].split(',')[0]} cy={group[0].split(',')[1]} fill={item.color} key={`${item.label}-${index}`} r="2.5" />
        : <polyline fill="none" key={`${item.label}-${index}`} points={group.join(' ')} stroke={item.color} strokeDasharray={item.dashed ? '4 3' : undefined} strokeLinejoin="round" strokeWidth="2" />))}
      {names.map((name, index) => <text fill="#aab7a3" fontSize="9" key={name} textAnchor="middle" x={x(index)} y={H - 8}>{name[0]}</text>)}
    </svg>
    <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
      {band ? <li className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-2.5 w-3 rounded-sm" style={{ background: band.color, opacity: 0.5 }} />{band.label}</li> : null}
      {series.map((item) => <li className="flex items-center gap-1.5" key={item.label}><span aria-hidden="true" className="inline-block h-0.5 w-4" style={{ background: item.color }} />{item.label}</li>)}
    </ul>
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer text-slate-300 underline">{en ? 'View as table' : 'Ver em tabela'}</summary>
      <table className="mt-2 w-full text-left">
        <thead><tr><th className="py-1 pr-2 font-semibold">{en ? 'Month' : 'Mês'}</th>{band ? <th className="py-1 pr-2 font-semibold">{band.label}</th> : null}{series.map((item) => <th className="py-1 pr-2 font-semibold" key={item.label}>{item.label}</th>)}</tr></thead>
        <tbody>{names.map((name, index) => <tr className="border-t border-slate-800" key={name}><td className="py-1 pr-2">{name}</td>{band ? <td className="py-1 pr-2">{band.lo[index] === null || band.hi[index] === null ? 'N/D' : `${fmt(band.lo[index])} – ${fmt(band.hi[index])}`}</td> : null}{series.map((item) => <td className="py-1 pr-2" key={item.label}>{fmt(item.data[index])} {item.data[index] === null ? '' : unit}</td>)}</tr>)}</tbody>
      </table>
    </details>
  </div>;
}

const sumNext = (days: Array<{ precipitationMm: number | null }>) => days.length && days.every((day) => day.precipitationMm !== null) ? Math.round(days.reduce((sum, day) => sum + (day.precipitationMm as number), 0)) : null;

function ForecastCard({ en }: { en: boolean }) {
  const { forecast: state } = useExtras();
  const weekday = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString(en ? 'en-US' : 'pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '');
  const sevenDay = state.kind === 'ready' ? sumNext(state.data.days.slice(0, 7)) : null;
  return <Card id="forecast" headline={state.kind === 'ready' ? (sevenDay === null ? 'N/D' : `${sevenDay} mm ${en ? 'in 7 days' : 'em 7 dias'}`) : undefined} title={en ? 'Rain forecast: next days' : 'Previsão de chuva: próximos dias'} note={state.kind === 'ready' ? <>{en ? 'Weather-model forecast, not a measurement and not advice for planting. ' : 'Previsão de modelo meteorológico: não é medição nem recomendação de plantio. '}<a className="underline" href={state.data.source.url} rel="noreferrer" target="_blank">{state.data.source.name}</a> ({state.data.source.license}).</> : undefined}>
    <Waiting en={en} state={state}>{state.kind === 'ready' ? (() => {
      const days = state.data.days.slice(0, 7);
      const known = (list: typeof days) => list.flatMap((day) => day.precipitationMm === null ? [] : [day.precipitationMm]);
      const total = (list: typeof days) => list.length && known(list).length === list.length ? Math.round(known(list).reduce((sum, value) => sum + value, 0)) : null;
      const total16 = total(state.data.days);
      const peak = Math.max(...known(days), 1);
      return <>
        <p><strong className="text-lg text-cyan-200">{total(days) === null ? 'N/D' : `${total(days)} mm`}</strong> <span className="text-slate-300">{en ? 'expected in 7 days' : 'previstos em 7 dias'}{total16 === null ? '' : ` · ${total16} mm ${en ? 'in' : 'em'} ${state.data.days.length}`}</span></p>
        <ol aria-label={en ? 'Expected rain per day' : 'Chuva prevista por dia'} className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
          {days.map((day) => <li className="flex flex-col items-center justify-end" key={day.date}>
            <span className="text-slate-300">{day.precipitationMm === null ? 'N/D' : numberFormat(day.precipitationMm, day.precipitationMm >= 10 ? 0 : 1, en)}</span>
            <span aria-hidden="true" className="mt-1 w-full max-w-6 rounded-t bg-cyan-500" style={{ height: `${day.precipitationMm === null ? 2 : Math.max(2, (day.precipitationMm / peak) * 56)}px` }} />
            <span className="mt-1 text-slate-400">{weekday(day.date)}</span>
          </li>)}
        </ol>
        <p className="mt-2 text-xs text-slate-400">{en ? 'Rain per day, in mm' : 'Chuva por dia, em mm'}</p>
      </>;
    })() : null}</Waiting>
  </Card>;
}

function SeasonCards({ data, en }: { data: Climate; en: boolean }) {
  const names = MONTHS[en ? 'en' : 'pt-BR'].long;
  const season = data.climateSummary.seasonality?.rainySeason ?? null;
  const spells = data.climateSummary.seasonality?.drySpells ?? null;
  const hasSeasonality = data.climateSummary.seasonality !== undefined;
  const years = `${data.provenance.period.start.slice(0, 4)}–${data.provenance.period.end.slice(0, 4)}`;
  return <>
    <Card id="rainy-season" headline={!hasSeasonality ? 'N/D' : season ? (season.lengthMonths === 12 ? (en ? 'All year' : 'O ano todo') : `${names[season.startMonth - 1]} ${en ? 'to' : 'a'} ${names[season.endMonth - 1]}`) : (en ? 'No rainy season' : 'Sem estação chuvosa')} title={en ? 'Rainy season' : 'Estação chuvosa'} note={en ? `Months where typical rain (median ${years}) exceeds FAO-56 reference evapotranspiration. A historical pattern, not a forecast of when rain will start.` : `Meses em que a chuva típica (mediana ${years}) supera a evapotranspiração de referência FAO-56. É um padrão histórico, não previsão de quando a chuva começa.`}>
      {!hasSeasonality ? <p className="text-slate-300">N/D</p>
        : season ? null
          : <p className="text-slate-300">{en ? 'No month has typical rain above evapotranspiration here.' : 'Nenhum mês tem chuva típica acima da evapotranspiração neste ponto.'}</p>}
    </Card>
    {season ? <Card id="dry-spells" headline={spells && spells.seasonsAnalyzed > 0 && spells.medianLongestRunDays !== null ? `${numberFormat(spells.medianLongestRunDays, spells.medianLongestRunDays % 1 === 0 ? 0 : 1, en)} ${en ? 'days typical pause' : 'dias de pausa típica'} · ${spells.seasonsWithSpell}/${spells.seasonsAnalyzed}` : 'N/D'} title={en ? 'Dry spells inside the rainy season' : 'Veranicos na estação chuvosa'} note={spells ? (en ? `Dry day = under ${spells.definition.precipitationBelowMm} mm. A dry spell = ${spells.definition.consecutiveDays}+ dry days in a row. Counts only seasons with every day measured: ${spells.seasonsAnalyzed} within ${years}. Historical, not a forecast.` : `Dia seco = menos de ${spells.definition.precipitationBelowMm} mm. Veranico = ${spells.definition.consecutiveDays} ou mais dias secos seguidos. Conta só as estações com todos os dias medidos: ${spells.seasonsAnalyzed} entre ${years}. Histórico, não previsão.`) : undefined}>
      {!spells || spells.seasonsAnalyzed === 0 || spells.medianLongestRunDays === null || spells.maxRunDays === null ? <p className="text-slate-300">{en ? 'Not enough complete seasons to count dry spells (N/D).' : 'Estações completas insuficientes para contar veranicos (N/D).'}</p> : <dl className="grid grid-cols-2 gap-2">
        <div><dt className="text-xs text-slate-400">{en ? 'Longest pause, typical year' : 'Maior pausa, ano típico'}</dt><dd className="font-semibold">{numberFormat(spells.medianLongestRunDays, spells.medianLongestRunDays % 1 === 0 ? 0 : 1, en)} {en ? 'days' : 'dias'}</dd></div>
        <div><dt className="text-xs text-slate-400">{en ? 'Longest on record' : 'Pior caso registrado'}</dt><dd className="font-semibold">{spells.maxRunDays} {en ? 'days' : 'dias'}{spells.maxRunSeasonStartYear === null ? '' : ` · ${spells.maxRunSeasonStartYear}${season.startMonth > season.endMonth ? `/${String(spells.maxRunSeasonStartYear + 1).slice(2)}` : ''}`}</dd></div>
        <div className="col-span-2"><dt className="text-xs text-slate-400">{en ? 'Seasons with a dry spell' : 'Estações com veranico'}</dt><dd className="font-semibold">{spells.seasonsWithSpell} {en ? 'of' : 'de'} {spells.seasonsAnalyzed}</dd></div>
      </dl>}
    </Card> : null}
  </>;
}

function RootZoneCard({ data, en }: { data: Climate; en: boolean }) {
  const months = data.climateSummary.rootZoneByMonth;
  const lastYear = data.climateSummary.lastYear?.year;
  const known = months?.some((item) => item.medianWetness !== null) ?? false;
  const years = `${data.provenance.period.start.slice(0, 4)}–${data.provenance.period.end.slice(0, 4)}`;
  const monthNow = months?.[new Date().getMonth()];
  return <Card id="root-zone" headline={monthNow && monthNow.medianWetness !== null ? `${en ? 'Typical this month' : 'Típico neste mês'}: ${numberFormat(monthNow.medianWetness, 2, en)}${monthNow.lastYearWetness !== null && lastYear ? ` · ${lastYear}: ${numberFormat(monthNow.lastYearWetness, 2, en)}` : ''}` : undefined} title={en ? 'Root-zone soil moisture, through the year' : 'Umidade da raiz, ao longo do ano'} note={en ? 'NASA POWER root-zone wetness: 0 = dry, 1 = saturated. Modelled for a grid cell of roughly 50 km, not measured in your field. Not a soil analysis.' : 'Umidade da zona de raiz do NASA POWER: 0 = seco, 1 = saturado. Modelada para uma célula de cerca de 50 km, não medida no seu campo. Não é análise de solo.'}>
    {!months || !known ? <p className="text-slate-300">{en ? 'N/D for this point.' : 'N/D para este ponto.'}</p> : <MonthSeriesChart
      ariaLabel={en ? 'Root-zone soil moisture by month: median of the years compared with the last year' : 'Umidade da raiz por mês: mediana dos anos comparada ao último ano'}
      digits={2} domain={[0, 1]} en={en} unit=""
      series={[{ label: en ? `Median ${years}` : `Mediana ${years}`, color: '#8dc8cf', data: months.map((item) => item.medianWetness) }, ...(lastYear ? [{ label: String(lastYear), color: '#b6dc63', dashed: true, data: months.map((item) => item.lastYearWetness) }] : [])]} />}
  </Card>;
}

function TemperatureCard({ data, en }: { data: Climate; en: boolean }) {
  const monthly = data.climateSummary.monthly;
  const pick = (key: 'tminMedianC' | 'tmaxMedianC' | 'tsoilMedianC') => Array.from({ length: 12 }, (_, index) => monthly.find((item) => item.month === index + 1)?.[key] ?? null);
  const low = pick('tminMedianC'); const high = pick('tmaxMedianC'); const soil = pick('tsoilMedianC');
  const all = [...low, ...high, ...soil].filter((value): value is number => value !== null);
  const hasAir = low.some((value) => value !== null) && high.some((value) => value !== null);
  const hasSoil = soil.some((value) => value !== null);
  const domain: [number, number] = all.length ? [Math.floor(Math.min(...all) / 4) * 4, Math.ceil(Math.max(...all) / 4) * 4] : [0, 40];
  const m = new Date().getMonth();
  const range = low[m] !== null && high[m] !== null ? `${numberFormat(low[m] as number, 1, en)} – ${numberFormat(high[m] as number, 1, en)} °C ${en ? 'air this month' : 'de ar neste mês'}` : undefined;
  return <Card id="temperature" joao="heat" headline={range} title={en ? 'Minimum and maximum temperature, by month' : 'Temperatura mínima e máxima, mês a mês'} note={en ? 'Median of the daily minimum and maximum of the air at 2 m (NASA POWER). Soil temperature: POWER soil layer 1 (near-surface soil), modelled for the grid cell, not a probe reading.' : 'Mediana das mínimas e máximas diárias do ar a 2 m (NASA POWER). Solo: camada 1 do POWER (solo próximo da superfície), modelada para a célula, não é leitura de sonda.'}>
    {!hasAir ? <p className="text-slate-300">N/D</p> : <MonthSeriesChart
      ariaLabel={en ? 'Typical minimum and maximum air temperature by month, with soil temperature when available' : 'Temperatura mínima e máxima típica do ar por mês, com a do solo quando disponível'}
      band={{ label: en ? 'Air: min to max' : 'Ar: mínima a máxima', color: '#8dc8cf', lo: low, hi: high }} domain={domain} en={en} unit="°C"
      series={hasSoil ? [{ label: en ? 'Soil (layer 1)' : 'Solo (camada 1)', color: '#e7bf62', data: soil }] : []} />}
    {hasAir && !hasSoil ? <p className="mt-2 text-xs text-amber-100">{en ? 'Soil temperature: N/D for this source (the offline pilot copy has no soil layer).' : 'Temperatura do solo: N/D nesta fonte (a cópia offline do piloto não tem a camada de solo).'}</p> : null}
  </Card>;
}

const PHASE = {
  'pt-BR': { el_nino: 'El Niño', la_nina: 'La Niña', neutral: 'Neutro' },
  en: { el_nino: 'El Niño', la_nina: 'La Niña', neutral: 'Neutral' },
} as const;
const STRENGTH = { 'pt-BR': { weak: 'fraco', moderate: 'moderado', strong: 'forte', very_strong: 'muito forte' }, en: { weak: 'weak', moderate: 'moderate', strong: 'strong', very_strong: 'very strong' } } as const;

function EnsoCard({ en }: { en: boolean }) {
  const { enso: state } = useExtras();
  const names = MONTHS[en ? 'en' : 'pt-BR'].short;
  const label = (season: string, year: number) => { const range = seasonMonths(season); return range ? `${names[range[0] - 1].toLowerCase()}–${names[range[1] - 1].toLowerCase()} ${year}` : `${season} ${year}`; };
  const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${numberFormat(Math.abs(value), 2, en)} °C`;
  return <Card id="enso" headline={state.kind === 'ready' ? `${PHASE[en ? 'en' : 'pt-BR'][state.data.phase]}${state.data.strength ? ` ${STRENGTH[en ? 'en' : 'pt-BR'][state.data.strength]}` : ''} · ${signed(state.data.latest.value)}` : undefined} title={en ? 'El Niño / La Niña now' : 'El Niño / La Niña agora'} note={state.kind === 'ready' ? <>{en ? 'Global Pacific index (NOAA CPC, RONI). How it affects rain varies by region, and it is not a forecast for this point. ' : 'Índice global do Pacífico (NOAA CPC, RONI). O efeito na chuva varia por região e não é previsão para este ponto. '}<a className="underline" href={state.data.sourceUrl} rel="noreferrer" target="_blank">{en ? 'Source' : 'Fonte'}</a>.</> : undefined}>
    <Waiting en={en} state={state}>{state.kind === 'ready' ? <>
      <p><strong className="text-lg text-cyan-200">{PHASE[en ? 'en' : 'pt-BR'][state.data.phase]}{state.data.strength ? ` ${STRENGTH[en ? 'en' : 'pt-BR'][state.data.strength]}` : ''}</strong> <span className="text-slate-300">· {signed(state.data.latest.value)} · {label(state.data.latest.season, state.data.latest.year)}</span></p>
      {state.data.previous.length ? <p className="mt-1 text-xs text-slate-300">{en ? 'Before: ' : 'Antes: '}{state.data.previous.map((item) => `${label(item.season, item.year)} ${signed(item.value)}`).join(' · ')}</p> : null}
    </> : null}</Waiting>
  </Card>;
}

function CropsCard({ en }: { en: boolean }) {
  const { regional: state } = useExtras();
  const top = state.kind === 'ready' ? [...(state.data.pam?.products ?? [])].filter((item) => item.harvestedAreaHa !== null && item.harvestedAreaHa > 0).sort((a, b) => (b.harvestedAreaHa ?? 0) - (a.harvestedAreaHa ?? 0))[0] : undefined;
  return <Card id="crops" headline={top ? `${top.productLabel.replace(/\s*\(.*\)$/, '')} · ${numberFormat(top.harvestedAreaHa ?? 0, 0, en)} ha` : undefined} title={en ? 'Crops harvested in the municipality' : 'Culturas colhidas no município'}>
    <Waiting en={en} state={state}>{state.kind === 'ready' ? (() => {
      const { municipality, pam } = state.data;
      if (state.data.country !== 'BR' || !municipality) return <p className="text-slate-300">{en ? 'Municipal data covers Brazil only; this point was not matched to a municipality.' : 'Os dados municipais cobrem só o Brasil; este ponto não foi associado a um município.'}</p>;
      if (!pam || pam.products.length === 0) return <p className="text-slate-300">{en ? `No record for ${municipality.name} in the IBGE index used here (it only lists soybean, maize, sorghum, sunflower, bean and rice).` : `Sem registro de ${municipality.name} no índice do IBGE usado aqui (ele só lista soja, milho, sorgo, girassol, feijão e arroz).`}</p>;
      const ranked = [...pam.products].filter((item) => item.harvestedAreaHa !== null && item.harvestedAreaHa > 0).sort((a, b) => (b.harvestedAreaHa ?? 0) - (a.harvestedAreaHa ?? 0));
      const strip = (label: string) => label.replace(/\s*\(.*\)$/, '');
      return <>
        <p className="text-xs text-slate-400">{municipality.name} ({municipality.uf}) · IBGE PAM {pam.year}</p>
        {ranked.length ? <ol className="mt-2 grid gap-1">{ranked.slice(0, 6).map((item, index) => <li className="flex justify-between gap-3 rounded bg-slate-900/70 px-2 py-1.5" key={item.productCode}><span>{index + 1}. {strip(item.productLabel)}</span><span className="text-slate-300">{numberFormat(item.harvestedAreaHa ?? 0, 0, en)} ha</span></li>)}</ol> : <p className="mt-2 text-slate-300">{en ? 'No harvested area recorded for these crops in this municipality.' : 'Nenhuma área colhida registrada para essas culturas neste município.'}</p>}
        <p className="mt-2 text-xs text-slate-400">{en ? 'Harvested area (IBGE). Only six grain crops are indexed. Presence in the statistics does not mean a place suits a crop, and rice and bean are not split by system or species.' : 'Área colhida (IBGE). Só seis culturas de grão estão indexadas. Presença na estatística não significa que o lugar é adequado à cultura, e arroz e feijão não separam sistema nem espécie.'}</p>
      </>;
    })() : null}</Waiting>
  </Card>;
}

/** Soil-and-planting context for the selected place. Every card says where its data comes from and what it does not mean. */
export function PlantingPanels({ data, en }: { data: Climate; en: boolean }) {
  return <div className="mt-6">
    <h3 className="text-base font-bold">{en ? 'The data' : 'Os dados'}</h3>
    <p className="mt-1 text-xs text-slate-400">{en ? 'Each block shows the data, with João’s comment on what is happening. It does not say what to plant or when.' : 'Cada bloco mostra o dado e traz o comentário do João sobre o que está acontecendo. Não diz o que plantar nem quando.'}</p>
    <div className="mt-3 grid gap-3">
      <ForecastCard en={en} />
      <SeasonCards data={data} en={en} />
      <RootZoneCard data={data} en={en} />
      <TemperatureCard data={data} en={en} />
      <EnsoCard en={en} />
      <CropsCard en={en} />
    </div>
  </div>;
}
