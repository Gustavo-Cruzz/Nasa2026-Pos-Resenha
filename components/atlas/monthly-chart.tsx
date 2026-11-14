'use client';

import { useLocale } from '@/components/locale-provider';

export type MonthPoint = { month: number; rainMm: number | null; tempC: number | null; prevRainMm?: number | null; prevTempC?: number | null };
const NAMES = { 'pt-BR': ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] } as const;

/** Typical rain (bars, cyan = observed NASA data) and temperature (line) for the 12 months, current month highlighted. Missing months stay empty (N/D). */
export function MonthlyChart({ points, currentMonth, history, previousYear }: { points: MonthPoint[]; currentMonth: number; history: string; previousYear?: number }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const names = NAMES[locale === 'en' ? 'en' : 'pt-BR'];
  const W = 360; const H = 176; const top = 22; const bottom = 24; const left = 36; const right = 34; const plot = H - top - bottom; const slot = (W - left - right) / 12;
  const rains = points.flatMap((point) => [point.rainMm, point.prevRainMm ?? null].flatMap((value) => value === null ? [] : [value]));
  const temps = points.flatMap((point) => [point.tempC, point.prevTempC ?? null].flatMap((value) => value === null ? [] : [value]));
  // Four equal grid intervals shared by both scales: rain on the left (mm), temperature on the right (°C).
  const rainStep = [10, 20, 25, 50, 100, 200, 250, 500, 1000].find((step) => step * 4 >= Math.max(...rains, 1)) ?? 1000;
  const maxRain = rainStep * 4;
  const loT = temps.length ? Math.floor(Math.min(...temps)) : 0;
  const tempStep = temps.length ? Math.max(1, Math.ceil((Math.max(...temps) - loT) / 4)) : 1;
  const ticks = [0, 1, 2, 3, 4];
  const gy = (tick: number) => top + plot - (tick / 4) * plot;
  const y = (t: number) => top + plot - ((t - loT) / (tempStep * 4)) * plot;
  const cx = (index: number) => left + index * slot + slot / 2;
  const pathFor = (pick: (point: MonthPoint) => number | null | undefined) => points.flatMap((point, index) => { const value = pick(point); if (value === null || value === undefined) return []; const before = index === 0 ? null : pick(points[index - 1]); return [`${before === null || before === undefined ? 'M' : 'L'}${cx(index).toFixed(1)},${y(value).toFixed(1)}`]; }).join(' ');
  const hasPrev = points.some((point) => point.prevRainMm !== null && point.prevRainMm !== undefined || point.prevTempC !== null && point.prevTempC !== undefined);
  const bar = (slot - 8) / 2;
  return <div>
    <svg aria-label={en ? 'Typical rain and temperature by month' : 'Chuva e temperatura típicas por mês'} className="w-full" role="img" viewBox={`0 0 ${W} ${H}`}>
      {ticks.map((tick) => <g key={tick}>
        <line stroke="#fdf6e3" strokeOpacity={tick === 0 ? 0.35 : 0.12} x1={left} x2={W - right} y1={gy(tick)} y2={gy(tick)} />
        <text fill="#7fd8ee" fontSize="9" textAnchor="end" x={left - 5} y={gy(tick) + 3}>{tick * rainStep}</text>
        {temps.length ? <text fill="#fdf6e3" fontSize="9" textAnchor="start" x={W - right + 5} y={gy(tick) + 3}>{loT + tick * tempStep}</text> : null}
      </g>)}
      <text fill="#7fd8ee" fontSize="9" fontWeight="700" textAnchor="end" x={left - 5} y="10">mm</text>
      {temps.length ? <text fill="#fdf6e3" fontSize="9" fontWeight="700" textAnchor="start" x={W - right + 5} y="10">°C</text> : null}
      {points.map((point, index) => {
        const current = point.month === currentMonth;
        const h = point.rainMm === null ? 0 : (point.rainMm / maxRain) * plot;
        return <g key={point.month}>
          {current ? <rect fill="#b6dc63" height={plot + 4} opacity="0.12" rx="4" width={slot - 2} x={left + index * slot + 1} y={top - 2} /> : null}
          <rect fill="#67d6f0" height={h} opacity={current ? 1 : 0.6} rx="2" width={hasPrev ? bar : slot - 10} x={left + index * slot + (hasPrev ? 4 : 5)} y={top + plot - h}><title>{`${names[index]} · ${history}: ${point.rainMm === null ? 'N/D' : `${Math.round(point.rainMm)} mm`}`}</title></rect>
          {hasPrev && point.prevRainMm !== null && point.prevRainMm !== undefined ? <rect fill="#67d6f0" fillOpacity="0.12" height={(point.prevRainMm / maxRain) * plot} rx="2" stroke="#67d6f0" strokeWidth="1.5" width={bar} x={left + index * slot + 4 + bar} y={top + plot - (point.prevRainMm / maxRain) * plot}><title>{`${names[index]} · ${previousYear}: ${Math.round(point.prevRainMm)} mm`}</title></rect> : null}
          <text fill={current ? '#d8efa0' : '#9fb09a'} fontSize="10" fontWeight={current ? 700 : 400} textAnchor="middle" x={cx(index)} y={H - 8}>{names[index]}</text>
        </g>;
      })}
      {temps.length ? <><path d={pathFor((point) => point.tempC)} fill="none" stroke="#fdf6e3" strokeLinejoin="round" strokeWidth="2" />{points.map((point, index) => point.tempC === null ? null : <circle cx={cx(index)} cy={y(point.tempC)} fill="#fdf6e3" key={point.month} r={point.month === currentMonth ? 4 : 2.5}><title>{`${names[index]} · ${history}: ${point.tempC.toFixed(1)} °C`}</title></circle>)}</> : null}
      {hasPrev ? <><path d={pathFor((point) => point.prevTempC)} fill="none" stroke="#fdf6e3" strokeDasharray="4 3" strokeLinejoin="round" strokeWidth="1.75" />{points.map((point, index) => point.prevTempC === null || point.prevTempC === undefined ? null : <circle cx={cx(index)} cy={y(point.prevTempC)} fill="#142018" key={point.month} r="2.75" stroke="#fdf6e3" strokeWidth="1.5"><title>{`${names[index]} · ${previousYear}: ${point.prevTempC.toFixed(1)} °C`}</title></circle>)}</> : null}
    </svg>
    <ul className="mt-1 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs text-slate-300">
      <li><i aria-hidden="true" className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-cyan-300 align-middle" />{en ? `Rain, ${history}` : `Chuva, ${history}`}</li>
      {hasPrev ? <li><i aria-hidden="true" className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm border border-cyan-300 bg-cyan-300/15 align-middle" />{en ? `Rain, ${previousYear}` : `Chuva, ${previousYear}`}</li> : null}
      <li><i aria-hidden="true" className="mr-1.5 inline-block h-0.5 w-4 bg-cream align-middle" />{en ? `Temperature, ${history}` : `Temperatura, ${history}`}</li>
      {hasPrev ? <li><i aria-hidden="true" className="mr-1.5 inline-block w-4 border-t-2 border-dashed border-cream align-middle" />{en ? `Temperature, ${previousYear}` : `Temperatura, ${previousYear}`}</li> : null}
    </ul>
    <details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold text-slate-300">{en ? 'See as a table' : 'Ver em tabela'}</summary><table className="mt-2 w-full text-left"><thead><tr><th scope="col">{en ? 'Month' : 'Mês'}</th><th scope="col">{en ? 'Rain' : 'Chuva'} {history}</th><th scope="col">{en ? 'Temp.' : 'Temp.'} {history}</th>{hasPrev ? <><th scope="col">{en ? 'Rain' : 'Chuva'} {previousYear}</th><th scope="col">{en ? 'Temp.' : 'Temp.'} {previousYear}</th></> : null}</tr></thead><tbody>{points.map((point, index) => <tr key={point.month}><th scope="row">{names[index]}</th><td>{point.rainMm === null ? 'N/D' : `${Math.round(point.rainMm)} mm`}</td><td>{point.tempC === null ? 'N/D' : `${point.tempC.toFixed(1)} °C`}</td>{hasPrev ? <><td>{point.prevRainMm === null || point.prevRainMm === undefined ? 'N/D' : `${Math.round(point.prevRainMm)} mm`}</td><td>{point.prevTempC === null || point.prevTempC === undefined ? 'N/D' : `${point.prevTempC.toFixed(1)} °C`}</td></> : null}</tr>)}</tbody></table></details>
  </div>;
}
