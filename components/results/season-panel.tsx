'use client';

import { useId, useMemo, useState } from 'react';
import type { AnalysisResult } from '@/lib/engine/types';
import type { WaterBalanceMonth } from '@/lib/climate/indicators';
import { relativeLowVegetationMonths } from '@/lib/climate/ndvi';
import { ndviMunicipalCaveats } from '@/lib/climate/ndvi-copy';
import { applyRainChange, formatMonths, deriveRotationCalendar, deriveSeasonInsights, describeSeasonInsight, monthLabel, seasonCaveat, type CalendarCell } from '@/lib/engine/season';
import { cropDisplayName } from '@/lib/presentation';
import { useLocale } from '@/components/locale-provider';

const cellTone: Record<CalendarCell['state'], string> = { compatible: 'border-cyan-300/60 bg-cyan-500/10', attention: 'border-amber-300 bg-amber-950/50', unknown: 'border-slate-600 bg-slate-900' };
const cellMark: Record<CalendarCell['state'], string> = { compatible: '✓', attention: '!', unknown: 'N/D' };

export function SeasonPanel({ data }: { data: AnalysisResult }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const [deltaC, setDeltaC] = useState(0);
  const [rainPct, setRainPct] = useState(0);
  const calendar = useMemo(() => deriveRotationCalendar(data.nasaInsightByMonth, deltaC), [data.nasaInsightByMonth, deltaC]);
  const balance = useMemo(() => applyRainChange(data.climate.waterBalanceByMonth ?? [], rainPct), [data.climate.waterBalanceByMonth, rainPct]);
  const insights = useMemo(() => deriveSeasonInsights(calendar, balance, data.input.plantingMonth), [calendar, balance, data.input.plantingMonth]);
  const hypothetical = deltaC !== 0 || rainPct !== 0;
  const planting = data.input.plantingMonth;
  const tempId = useId(); const rainId = useId();
  if (calendar.length === 0) return null;
  return <section aria-labelledby="season-heading" className="mt-6 rounded-xl border border-cyan-300/50 bg-slate-900 p-5">
    <h2 className="text-xl font-bold" id="season-heading">{en ? 'Climate window by month' : 'Janela climática por mês'}</h2>
    <p className="mt-1 text-xs text-slate-300">{seasonCaveat(locale)}</p>
    {hypothetical ? <p className="mt-3 rounded-lg border border-amber-300 bg-amber-950/50 p-3 text-sm font-semibold" role="status">{en ? `Hypothetical view: temperature ${deltaC > 0 ? '+' : ''}${deltaC} °C, rainfall ${rainPct > 0 ? '+' : ''}${rainPct}%. Not a forecast; ET0 is not recomputed. The decision above still uses the historical reading.` : `Visão hipotética: temperatura ${deltaC > 0 ? '+' : ''}${deltaC} °C, chuva ${rainPct > 0 ? '+' : ''}${rainPct}%. Não é previsão; a ET0 não é recalculada. A decisão acima continua usando a leitura histórica.`}</p> : null}
    {hypothetical ? <ul className="mt-4 grid gap-3">{insights.map((insight, index) => { const text = describeSeasonInsight(insight, locale); return <li className="rounded-lg border border-slate-700 bg-slate-950/50 p-3" key={`${insight.kind}-${index}`}><p className="font-bold">{text.title}</p><p className="mt-1 text-sm text-slate-300">{text.detail}</p></li>; })}</ul> : null}
    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[40rem] border-separate border-spacing-1 text-center text-xs"><caption className="mb-2 text-left text-sm font-semibold">{en ? 'Monthly thermal calendar (NASA POWER median vs. documented range)' : 'Calendário térmico mensal (mediana NASA POWER × faixa documentada)'}</caption>
      <thead><tr><th className="text-left" scope="col">{en ? 'Hypothesis' : 'Hipótese'}</th>{Array.from({ length: 12 }, (_, index) => <th aria-current={index + 1 === planting ? 'true' : undefined} className={index + 1 === planting ? 'text-lime-200 underline' : ''} key={index} scope="col">{monthLabel(index + 1, locale)}</th>)}</tr></thead>
      <tbody>{calendar.map((row) => <tr key={row.scenarioId}><th className="text-left font-semibold" scope="row">{row.scenarioId} · {cropDisplayName(row.cropId, row.cropName, locale) || 'N/D'}</th>{row.cells.map((cell) => <td className={`rounded border px-1 py-1.5 ${cellTone[cell.state]}`} key={cell.month} title={cell.valueC === null ? 'N/D' : `${cell.valueC} °C${cell.rangeC ? ` · ${cell.rangeC.min}–${cell.rangeC.max} °C` : ''}`}><span className="font-bold">{cellMark[cell.state]}</span>{cell.marginC === null ? null : <span className="block text-[10px] text-slate-300">{cell.marginC > 0 ? '+' : ''}{cell.marginC.toLocaleString(en ? 'en-US' : 'pt-BR', { maximumFractionDigits: 1 })}</span>}</td>)}</tr>)}</tbody></table>
      <p className="mt-2 text-xs text-slate-400">{en ? '✓ inside the documented range · ! outside · N/D no reading or no documented range. The small number is the margin (°C) to the nearest range edge; negative means outside.' : '✓ dentro da faixa documentada · ! fora · N/D sem leitura ou sem faixa documentada. O número pequeno é a margem (°C) até o limite mais próximo da faixa; negativo significa fora.'}</p></div>
    <WaterBalanceChart balance={balance} en={en} locale={locale} planting={planting} />
    <NdviStrip climate={data.climate} en={en} locale={locale} />
    <fieldset className="mt-5 rounded-lg border border-slate-700 p-4"><legend className="px-2 text-sm font-bold">{en ? 'What if? (hypothetical, not a forecast)' : 'E se? (hipotético, não é previsão)'}</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm" htmlFor={tempId}>{en ? 'Temperature change' : 'Variação de temperatura'}: <b>{deltaC > 0 ? '+' : ''}{deltaC} °C</b><input className="mt-2 block w-full accent-lime-300" id={tempId} max="3" min="-3" step="0.5" type="range" value={deltaC} onChange={(event) => setDeltaC(Number(event.target.value))} /></label>
        <label className="block text-sm" htmlFor={rainId}>{en ? 'Rainfall change' : 'Variação de chuva'}: <b>{rainPct > 0 ? '+' : ''}{rainPct}%</b><input className="mt-2 block w-full accent-lime-300" id={rainId} max="30" min="-30" step="5" type="range" value={rainPct} onChange={(event) => setRainPct(Number(event.target.value))} /></label>
      </div>
      <button className="mt-3 min-h-11 rounded-lg border border-slate-600 px-4 text-sm font-semibold hover:border-lime-300 disabled:opacity-50" disabled={!hypothetical} type="button" onClick={() => { setDeltaC(0); setRainPct(0); }}>{en ? 'Back to the historical reading' : 'Voltar à leitura histórica'}</button>
    </fieldset>
  </section>;
}

function NdviStrip({ climate, en, locale }: { climate: AnalysisResult['climate']; en: boolean; locale: 'pt-BR' | 'en' }) {
  const ndvi = climate.ndvi;
  if (!ndvi) return <p className="mt-5 rounded-lg border border-slate-600 p-3 text-sm"><b>{en ? 'Vegetation (MODIS NDVI)' : 'Vegetação (NDVI MODIS)'}:</b> N/D — {en ? 'only available where a verified pre-processed series exists; not available at this point.' : 'só existe onde há série pré-processada verificada; indisponível neste ponto.'}</p>;
  const low = relativeLowVegetationMonths(ndvi.months);
  return <div className="mt-5 rounded-lg border border-slate-600 p-3 text-sm"><h3 className="font-bold">{en ? 'Vegetation (MODIS NDVI, monthly median)' : 'Vegetação (NDVI MODIS, mediana mensal)'}</h3>
    <ol className="mt-2 grid grid-cols-6 gap-1 text-center text-xs sm:grid-cols-12">{ndvi.months.map((month) => <li className={`rounded border px-1 py-1 ${low.includes(month.month) ? 'border-amber-300 bg-amber-950/40' : 'border-slate-700'}`} key={month.month}><span className="block text-slate-400">{monthLabel(month.month, locale)}</span><b>{month.medianNdvi === null ? 'N/D' : month.medianNdvi.toLocaleString(en ? 'en-US' : 'pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></li>)}</ol>
    <p className="mt-2 text-xs text-slate-300">{low.length ? (en ? `Lowest vegetation months relative to this point's own series: ${formatMonths(low, locale)}. This is a relative reading, not a bare-soil diagnosis.` : `Meses de menor vegetação em relação à própria série deste ponto: ${formatMonths(low, locale)}. É uma leitura relativa, não um diagnóstico de solo nu.`) : en ? 'Not enough months with a reading to compare (N/D).' : 'Meses com leitura insuficientes para comparar (N/D).'} {ndvi.period.start}–{ndvi.period.end} · {ndvi.coveragePct}%</p>
    {ndvi.origin === 'municipal_artifact' ? <ul className="mt-2 list-disc pl-5 text-xs text-slate-300">{ndviMunicipalCaveats(locale).map((line) => <li key={line}>{line}</li>)}</ul> : null}</div>;
}

function WaterBalanceChart({ balance, en, locale, planting }: { balance: WaterBalanceMonth[]; en: boolean; locale: 'pt-BR' | 'en'; planting: number }) {
  const usable = balance.filter((month) => month.precipMedianMm !== null && month.et0MedianMm !== null);
  if (usable.length === 0) return <p className="mt-5 rounded-lg border border-slate-600 p-3 text-sm">{en ? 'Monthly water balance: N/D (ET0 needs temperature, humidity, wind, radiation and surface pressure from NASA POWER).' : 'Balanço hídrico mensal: N/D (a ET0 exige temperatura, umidade, vento, radiação e pressão de superfície do NASA POWER).'}</p>;
  const width = 640; const height = 220; const left = 44; const bottom = 26; const top = 10;
  const max = Math.max(...usable.flatMap((month) => [month.precipMedianMm as number, month.et0MedianMm as number]), 1);
  const slot = (width - left - 8) / 12;
  const y = (value: number) => top + (height - top - bottom) * (1 - value / max);
  const fmt = (value: number | null) => value === null ? 'N/D' : value.toLocaleString(en ? 'en-US' : 'pt-BR', { maximumFractionDigits: 0 });
  const line = balance.flatMap((month, index) => month.et0MedianMm === null ? [] : [`${left + slot * index + slot / 2},${y(month.et0MedianMm)}`]).join(' ');
  return <div className="mt-5"><h3 className="text-sm font-bold">{en ? 'Monthly precipitation vs. FAO-56 ET0 (medians, mm)' : 'Chuva × ET0 FAO-56 por mês (medianas, mm)'}</h3>
    <svg aria-label={en ? 'Bars: median monthly precipitation. Line: median monthly ET0. See the table below for the values.' : 'Barras: chuva mediana mensal. Linha: ET0 mediana mensal. Veja a tabela abaixo para os valores.'} className="mt-2 w-full" role="img" viewBox={`0 0 ${width} ${height}`}>
      {[0, 0.5, 1].map((fraction) => <g key={fraction}><line stroke="#405840" strokeDasharray="3 3" x1={left} x2={width - 8} y1={y(max * fraction)} y2={y(max * fraction)} /><text fill="#b9c7b5" fontSize="10" textAnchor="end" x={left - 4} y={y(max * fraction) + 3}>{Math.round(max * fraction)}</text></g>)}
      {balance.map((month, index) => month.precipMedianMm === null ? null : <rect fill={month.month === planting ? '#b6dc63' : '#8dc8cf'} height={Math.max(0, height - bottom - y(month.precipMedianMm))} key={month.month} width={slot * 0.6} x={left + slot * index + slot * 0.2} y={y(month.precipMedianMm)} />)}
      <polyline fill="none" points={line} stroke="#e7bf62" strokeWidth="2.5" />
      {balance.map((month, index) => month.et0MedianMm === null ? null : <circle cx={left + slot * index + slot / 2} cy={y(month.et0MedianMm)} fill="#e7bf62" key={month.month} r="3" />)}
      {balance.map((month, index) => <text fill={month.month === planting ? '#d8efa0' : '#b9c7b5'} fontSize="10" key={month.month} textAnchor="middle" x={left + slot * index + slot / 2} y={height - 8}>{monthLabel(month.month, locale)}</text>)}
    </svg>
    <p className="mt-1 text-xs text-slate-300"><span aria-hidden="true" className="text-cyan-300">■</span> {en ? 'Precipitation' : 'Chuva'} · <span aria-hidden="true" className="text-amber-300">●</span> ET0 · <span aria-hidden="true" className="text-lime-300">■</span> {en ? 'Selected planting month.' : 'Mês de plantio selecionado.'}</p>
    <details className="mt-2"><summary className="cursor-pointer text-sm font-semibold">{en ? 'Data table' : 'Tabela de dados'}</summary><div className="mt-2 overflow-x-auto"><table className="w-full min-w-[32rem] text-left text-xs"><thead><tr><th scope="col">{en ? 'Month' : 'Mês'}</th><th scope="col">{en ? 'Precipitation (mm)' : 'Chuva (mm)'}</th><th scope="col">ET0 (mm)</th><th scope="col">{en ? 'Balance (mm)' : 'Balanço (mm)'}</th><th scope="col">{en ? 'Complete years' : 'Anos completos'}</th></tr></thead><tbody>{balance.map((month) => <tr key={month.month}><th scope="row">{monthLabel(month.month, locale)}</th><td>{fmt(month.precipMedianMm)}</td><td>{fmt(month.et0MedianMm)}</td><td>{fmt(month.balanceMedianMm)}</td><td>{month.validYears}/{month.expectedYears}</td></tr>)}</tbody></table></div></details>
  </div>;
}
