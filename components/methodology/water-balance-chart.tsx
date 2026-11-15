'use client';

import type { CSSProperties } from 'react';
import { erosivityLabel } from '@/lib/climate/erosivity';
import type { Level } from '@/components/methodology/content';
import type { PilotExample } from '@/components/methodology/pilot-example';
import styles from '@/components/methodology/methodology.module.css';
import { useInView } from '@/components/methodology/use-in-view';

const MONTHS = { pt: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] } as const;
const LEFT = 44;
const BAND = 56;
const BASE = 200;
const TOP = 34;
const ZERO = 262;
const BALANCE_PX = 34;
const fmt = (value: number | null) => (value === null ? 'N/D' : String(value));

/** Rain vs reference ET0, month by month, with the real Rio Verde medians computed from the verified NASA POWER fixture. */
export function WaterBalanceChart({ example, level, en }: { example: PilotExample | null; level: Level; en: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const months = MONTHS[en ? 'en' : 'pt'];
  const legend = <ul className="flex flex-wrap gap-4 text-sm text-slate-300">
    <li className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-sm bg-cyan-300" />{en ? 'Rain (P)' : 'Chuva (P)'}</li>
    <li className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-sm bg-amber-300" />{en ? 'ET0 (what the air asks)' : 'ET0 (o que o ar pede)'}</li>
    <li className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-sm bg-lime-300" />{en ? 'Surplus' : 'Sobra'}</li>
    <li className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-sm bg-rose-400" />{en ? 'Deficit' : 'Falta'}</li>
  </ul>;
  const explainer = <p className="text-sm leading-6 text-slate-300">{level === 'technical'
    ? (en ? 'Daily FAO-56 Penman-Monteith ET0 from NASA POWER (T2M_MAX, T2M_MIN, RH2M → ea, WS2M, ALLSKY_SFC_SW_DWN, PS → γ and elevation). Per month and year, Σ PRECTOTCORR and Σ ET0 are kept only when every day has both; the chart shows medians across years. The balance is the median of yearly P − ET0, so it need not equal the difference of the two medians. Rainy season = longest run of months with positive median balance.'
      : 'ET0 diária FAO-56 Penman-Monteith a partir do NASA POWER (T2M_MAX, T2M_MIN, RH2M → ea, WS2M, ALLSKY_SFC_SW_DWN, PS → γ e altitude). Por mês e ano, Σ PRECTOTCORR e Σ ET0 só entram se todos os dias tiverem os dois; o gráfico mostra medianas entre anos. O balanço é a mediana de P − ET0 de cada ano, por isso não precisa ser igual à diferença das duas medianas. Estação chuvosa = maior sequência de meses com balanço mediano positivo.')
    : (en ? 'Blue is the rain that usually falls. Orange is the water the air would pull from a reference lawn (ET0). When blue is taller, water is left over (green); when orange is taller, water is short (red). This is climate context, not your crop’s demand or an irrigation need.'
      : 'Azul é a chuva que costuma cair. Laranja é a água que o ar puxaria de um gramado de referência (ET0). Quando o azul é maior, sobra água (verde); quando o laranja é maior, falta (vermelho). É contexto do clima, não a demanda da sua cultura nem necessidade de irrigação.')}</p>;

  if (!example) return <div className="mt-5 grid gap-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
    <p className="rounded-lg border border-amber-300/40 bg-amber-950/30 p-3 text-sm text-amber-100">{en ? 'Schematic only: the verified Rio Verde NASA POWER file could not be read, so no numbers are shown.' : 'Só esquema: o arquivo verificado do NASA POWER de Rio Verde não pôde ser lido, então nenhum número é mostrado.'}</p>
    {legend}{explainer}
  </div>;

  const peak = Math.max(1, ...example.months.flatMap((item) => [item.precipMm ?? 0, item.et0Mm ?? 0]));
  const peakBalance = Math.max(1, ...example.months.map((item) => Math.abs(item.balanceMm ?? 0)));
  const height = (value: number) => (value / peak) * (BASE - TOP);
  const rainy = new Set(example.rainyMonths);
  const rainyText = example.rainyMonths.length ? `${months[example.rainyMonths[0] - 1]}–${months[example.rainyMonths[example.rainyMonths.length - 1] - 1]}` : 'N/D';
  const validYears = Math.min(...example.months.map((item) => item.validYears));
  const expectedYears = Math.max(...example.months.map((item) => item.expectedYears));
  const title = en ? `${example.label}, example: monthly rain vs ET0` : `${example.label}, exemplo: chuva × ET0 por mês`;

  return <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]" data-inview={inView ? 'true' : 'false'} ref={ref}>
    <figure className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3">
      <svg aria-labelledby="balance-title balance-desc" className="h-auto w-full" role="img" viewBox="0 0 720 300">
        <title id="balance-title">{title}</title>
        <desc id="balance-desc">{en ? `Median monthly rain and ET0 in millimetres, NASA POWER 2011–2025. Rainy season (positive balance): ${rainyText}. Full numbers in the table below.` : `Chuva e ET0 medianas por mês em milímetros, NASA POWER 2011–2025. Estação chuvosa (balanço positivo): ${rainyText}. Números completos na tabela abaixo.`}</desc>
        {example.months.map((item, index) => rainy.has(item.month) ? <rect fill="rgb(103 232 249 / .07)" height={ZERO + BALANCE_PX - TOP + 6} key={`band-${item.month}`} width={BAND} x={LEFT + index * BAND} y={TOP - 6} /> : null)}
        <line stroke="rgb(148 163 184 / .5)" x1={LEFT} x2={LEFT + 12 * BAND} y1={BASE} y2={BASE} />
        <line stroke="rgb(148 163 184 / .5)" strokeDasharray="3 4" x1={LEFT} x2={LEFT + 12 * BAND} y1={ZERO} y2={ZERO} />
        <text fill="#94a3b8" fontSize="11" x="4" y={TOP - 14}>{en ? 'mm/month' : 'mm/mês'}</text>
        <text fill="#94a3b8" fontSize="11" x="4" y={ZERO + 4}>P−ET0</text>
        {example.months.map((item, index) => {
          const x = LEFT + index * BAND;
          const rainH = item.precipMm === null ? 0 : height(item.precipMm);
          const et0H = item.et0Mm === null ? 0 : height(item.et0Mm);
          const bal = item.balanceMm;
          const balH = bal === null ? 0 : (Math.abs(bal) / peakBalance) * BALANCE_PX;
          const style = { '--i': index } as CSSProperties;
          return <g key={item.month}>
            {item.precipMm !== null ? <rect className={styles.bar} fill="rgb(103 232 249)" height={rainH} rx="2" style={style} width="20" x={x + 7} y={BASE - rainH} /> : null}
            {item.et0Mm !== null ? <rect className={styles.bar} fill="rgb(252 211 77)" height={et0H} rx="2" style={style} width="20" x={x + 29} y={BASE - et0H} /> : null}
            {bal === null ? <text fill="#cbd5e1" fontSize="10" textAnchor="middle" x={x + BAND / 2} y={ZERO + 4}>N/D</text>
              : <rect className={bal >= 0 ? styles.bar : styles.barDown} fill={bal >= 0 ? 'rgb(190 242 100)' : 'rgb(251 113 133)'} height={Math.max(balH, 1)} rx="2" style={style} width="36" x={x + 10} y={bal >= 0 ? ZERO - balH : ZERO} />}
            <text fill="#cbd5e1" fontSize="12" textAnchor="middle" x={x + BAND / 2} y={BASE + 16}>{months[index]}</text>
            {level === 'technical' ? <g className={styles.fadeIn} style={style}>
              <text fill="rgb(165 243 252)" fontSize="9.5" textAnchor="middle" x={x + 17} y={BASE - rainH - 4}>{fmt(item.precipMm)}</text>
              <text fill="rgb(253 230 138)" fontSize="9.5" textAnchor="middle" x={x + 39} y={BASE - et0H - 4}>{fmt(item.et0Mm)}</text>
              {bal !== null ? <text fill={bal >= 0 ? 'rgb(217 249 157)' : 'rgb(253 164 175)'} fontSize="9.5" textAnchor="middle" x={x + BAND / 2} y={bal >= 0 ? ZERO + 14 : ZERO - 4}>{bal > 0 ? `+${bal}` : bal}</text> : null}
            </g> : null}
          </g>;
        })}
      </svg>
      <figcaption className="mt-2 px-1 text-xs text-slate-400">{en ? `${example.label} (${example.latitude}, ${example.longitude}), example. NASA POWER daily 2011–2025, verified file fetched ${example.fetchedAt.slice(0, 10)}. Shaded months: rainy season (${rainyText}).` : `${example.label} (${example.latitude}, ${example.longitude}), exemplo. NASA POWER diário 2011–2025, arquivo verificado obtido em ${example.fetchedAt.slice(0, 10)}. Meses sombreados: estação chuvosa (${rainyText}).`}</figcaption>
    </figure>
    <div className="grid content-start gap-4">
      {legend}
      {explainer}
      <p className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">
        <b className="text-slate-100">{en ? 'Rain force (erosivity): ' : 'Força da chuva (erosividade): '}</b>
        {example.mfi === null || example.mfiClass === null ? 'N/D' : level === 'technical'
          ? `MFI = ${example.mfi} (${erosivityLabel(example.mfiClass, en ? 'en' : 'pt-BR')}; classes <60 · 60–90 · 90–120 · 120–160 · >160, Arnoldus/CEC 1992)`
          : `${erosivityLabel(example.mfiClass, en ? 'en' : 'pt-BR')}. ${en ? 'Rain concentrated in a few months hits bare soil harder.' : 'Chuva concentrada em poucos meses bate mais forte no solo descoberto.'}`}
      </p>
      <details className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-sm">
        <summary className="cursor-pointer font-semibold text-cyan-200">{en ? 'See the numbers (table)' : 'Ver os números (tabela)'}</summary>
        <table className="mt-3 w-full text-left text-xs tabular-nums">
          <caption className="sr-only">{title}</caption>
          <thead className="text-slate-400"><tr><th scope="col">{en ? 'Month' : 'Mês'}</th><th scope="col">P (mm)</th><th scope="col">ET0 (mm)</th><th scope="col">P−ET0</th><th scope="col">{en ? 'Years' : 'Anos'}</th></tr></thead>
          <tbody>{example.months.map((item, index) => <tr className="border-t border-slate-800" key={item.month}><th className="py-1 font-normal" scope="row">{months[index]}</th><td>{fmt(item.precipMm)}</td><td>{fmt(item.et0Mm)}</td><td>{fmt(item.balanceMm)}</td><td>{item.validYears}/{item.expectedYears}</td></tr>)}</tbody>
        </table>
        <p className="mt-2 text-xs text-slate-400">{en ? `Complete years per month: at least ${validYears} of ${expectedYears}.` : `Anos completos por mês: no mínimo ${validYears} de ${expectedYears}.`}</p>
      </details>
    </div>
  </div>;
}
