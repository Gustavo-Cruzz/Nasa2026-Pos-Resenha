'use client';

import { useLocale } from '@/components/locale-provider';

export type MonthPoint = { month: number; rainMm: number | null; tempC: number | null };
const NAMES = { 'pt-BR': ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] } as const;

/** Typical rain (bars, cyan = observed NASA data) and temperature (line) for the 12 months, current month highlighted. Missing months stay empty (N/D). */
export function MonthlyChart({ points, currentMonth }: { points: MonthPoint[]; currentMonth: number }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const names = NAMES[locale === 'en' ? 'en' : 'pt-BR'];
  const W = 360; const H = 176; const top = 22; const bottom = 24; const left = 36; const right = 34; const plot = H - top - bottom; const slot = (W - left - right) / 12;
  const rains = points.flatMap((point) => point.rainMm === null ? [] : [point.rainMm]);
  const temps = points.flatMap((point) => point.tempC === null ? [] : [point.tempC]);
  // Four equal grid intervals shared by both scales: rain on the left (mm), temperature on the right (°C).
  const rainStep = [10, 20, 25, 50, 100, 200, 250, 500, 1000].find((step) => step * 4 >= Math.max(...rains, 1)) ?? 1000;
  const maxRain = rainStep * 4;
  const loT = temps.length ? Math.floor(Math.min(...temps)) : 0;
  const tempStep = temps.length ? Math.max(1, Math.ceil((Math.max(...temps) - loT) / 4)) : 1;
  const ticks = [0, 1, 2, 3, 4];
  const gy = (tick: number) => top + plot - (tick / 4) * plot;
  const y = (t: number) => top + plot - ((t - loT) / (tempStep * 4)) * plot;
  const cx = (index: number) => left + index * slot + slot / 2;
  const line = points.flatMap((point, index) => point.tempC === null ? [] : [`${index === 0 || points[index - 1]?.tempC === null ? 'M' : 'L'}${cx(index).toFixed(1)},${y(point.tempC).toFixed(1)}`]).join(' ');
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
          <rect fill="#67d6f0" height={h} opacity={current ? 1 : 0.6} rx="2" width={slot - 10} x={left + index * slot + 5} y={top + plot - h}><title>{`${names[index]}: ${point.rainMm === null ? 'N/D' : `${Math.round(point.rainMm)} mm`}`}</title></rect>
          <text fill={current ? '#d8efa0' : '#9fb09a'} fontSize="10" fontWeight={current ? 700 : 400} textAnchor="middle" x={cx(index)} y={H - 8}>{names[index]}</text>
        </g>;
      })}
      {temps.length ? <><path d={line} fill="none" stroke="#fdf6e3" strokeLinejoin="round" strokeWidth="2" />{points.map((point, index) => point.tempC === null ? null : <circle cx={cx(index)} cy={y(point.tempC)} fill="#fdf6e3" key={point.month} r={point.month === currentMonth ? 4 : 2.5}><title>{`${names[index]}: ${point.tempC.toFixed(1)} °C`}</title></circle>)}</> : null}
    </svg>
    <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-300"><span><i aria-hidden="true" className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-cyan-300 align-middle" />{en ? 'Rain (mm/month)' : 'Chuva (mm/mês)'}</span><span><i aria-hidden="true" className="mr-1.5 inline-block h-0.5 w-4 bg-cream align-middle" />{en ? 'Temperature (°C)' : 'Temperatura (°C)'}</span></p>
    <details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold text-slate-300">{en ? 'See as a table' : 'Ver em tabela'}</summary><table className="mt-2 w-full text-left"><thead><tr><th scope="col">{en ? 'Month' : 'Mês'}</th><th scope="col">{en ? 'Rain' : 'Chuva'}</th><th scope="col">{en ? 'Temp.' : 'Temp.'}</th></tr></thead><tbody>{points.map((point, index) => <tr key={point.month}><th scope="row">{names[index]}</th><td>{point.rainMm === null ? 'N/D' : `${Math.round(point.rainMm)} mm`}</td><td>{point.tempC === null ? 'N/D' : `${point.tempC.toFixed(1)} °C`}</td></tr>)}</tbody></table></details>
  </div>;
}
