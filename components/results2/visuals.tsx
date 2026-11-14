import { CropSprite } from '@/components/crops/crop-sprite';
import { ArrowRight, Droplets, Leaf, Recycle, Sprout } from 'lucide-react';

export const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Planting calendar: one row per crop, c = compatible (cyan), a = attention (amber), n = no evidence (N/D). The ring marks the suggested month. */
export function CalendarVisual({ rows, ringMonth }: { rows: Array<{ cropId: string; name: string; cells: string }>; ringMonth: number }) {
  const tone: Record<string, string> = { c: 'bg-cyan-300/70', a: 'bg-amber-300/80', n: 'bg-slate-700' };
  const label: Record<string, string> = { c: 'compatível', a: 'atenção', n: 'sem dado (N/D)' };
  return <div>
    <div className="grid gap-2" role="table" aria-label="Calendário de plantio por cultura">
      <div className="grid grid-cols-[5.5rem_repeat(12,1fr)] items-center gap-1 text-center text-[10px] text-slate-400" role="row"><span /> {MONTHS.map((m, i) => <span key={`${m}${i}`} className={i + 1 === ringMonth ? 'font-bold text-lime-200' : ''}>{m}</span>)}</div>
      {rows.map((row) => <div className="grid grid-cols-[5.5rem_repeat(12,1fr)] items-center gap-1" key={row.name} role="row">
        <span className="flex items-center gap-1.5 text-xs font-semibold"><CropSprite cropId={row.cropId} name={row.name} size={22} />{row.name}</span>
        {row.cells.split('').map((cell, i) => <span aria-label={`${row.name}, ${MONTH_NAMES[i]}: ${label[cell]}`} className={`h-7 rounded ${tone[cell]} ${i + 1 === ringMonth && row.cells[i] === 'c' && row === rows[0] ? 'ring-2 ring-lime-300 ring-offset-2 ring-offset-slate-900' : ''}`} key={i} role="cell" />)}
      </div>)}
    </div>
    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">{[['c', 'Compatível'], ['a', 'Atenção'], ['n', 'Sem dado (N/D)']].map(([key, text]) => <li key={key}><i className={`mr-1.5 inline-block h-3 w-3 rounded align-middle ${tone[key]}`} />{text}</li>)}<li><i className="mr-1.5 inline-block h-3 w-3 rounded align-middle ring-2 ring-lime-300" />Mês sugerido</li></ul>
  </div>;
}

/** Monthly rain − ET0: above the line there is surplus (cyan), below it a climate deficit (amber). */
export function WaterVisual({ balance }: { balance: number[] }) {
  const W = 360; const H = 170; const left = 34; const top = 14; const bottom = 24; const plot = H - top - bottom; const slot = (W - left - 8) / 12;
  const max = Math.max(...balance.map(Math.abs), 50); const mid = top + plot / 2; const scale = (plot / 2) / (Math.ceil(max / 50) * 50);
  return <div>
    <svg aria-label="Balanço mensal de água: chuva menos evapotranspiração de referência" className="w-full" role="img" viewBox={`0 0 ${W} ${H}`}>
      {[-1, 0, 1].map((k) => { const v = k * Math.ceil(max / 50) * 50; return <g key={k}><line stroke="#fdf6e3" strokeOpacity={k === 0 ? 0.5 : 0.12} x1={left} x2={W - 8} y1={mid - v * scale} y2={mid - v * scale} /><text fill="#9fb09a" fontSize="9" textAnchor="end" x={left - 5} y={mid - v * scale + 3}>{v}</text></g>; })}
      <text fill="#9fb09a" fontSize="9" fontWeight="700" textAnchor="end" x={left - 5} y="9">mm</text>
      {balance.map((value, i) => { const h = Math.abs(value) * scale; return <g key={i}><rect fill={value >= 0 ? '#67d6f0' : '#f0b84a'} height={h} opacity="0.85" rx="2" width={slot - 8} x={left + i * slot + 4} y={value >= 0 ? mid - h : mid}><title>{`${MONTH_NAMES[i]}: ${value > 0 ? '+' : ''}${value} mm`}</title></rect><text fill="#9fb09a" fontSize="10" textAnchor="middle" x={left + i * slot + slot / 2} y={H - 8}>{MONTHS[i]}</text></g>; })}
    </svg>
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300"><li><i className="mr-1.5 inline-block h-3 w-3 rounded-sm bg-cyan-300 align-middle" />Sobra de água (chuva maior que a evaporação)</li><li><i className="mr-1.5 inline-block h-3 w-3 rounded-sm bg-amber-300 align-middle" />Falta (a evaporação supera a chuva)</li></ul>
  </div>;
}

/** Rotation timeline: before → now → next, with plant family and the benefits of alternating. */
export function RotationVisual({ steps }: { steps: Array<{ when: string; cropId: string; name: string; family: string; highlight?: boolean }> }) {
  return <div>
    <ol className="flex items-stretch gap-1.5 sm:gap-2">{steps.flatMap((step, i) => [
      <li className={`flex min-w-0 flex-1 flex-col items-center rounded-xl border p-3 text-center ${step.highlight ? 'border-lime-300 bg-lime-300/10' : 'border-slate-600 bg-slate-950/40'}`} key={step.when}><span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{step.when}</span><CropSprite cropId={step.cropId} name={step.name} size={52} /><b className="mt-1 text-sm">{step.name}</b><span className="mt-1 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">{step.family}</span></li>,
      ...(i < steps.length - 1 ? [<li aria-hidden="true" className="grid shrink-0 place-items-center text-slate-500" key={`arrow-${i}`}><ArrowRight size={18} /></li>] : []),
    ])}</ol>
    <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-3">{[[Recycle, 'Quebra o ciclo de pragas e doenças'], [Sprout, 'Leguminosas devolvem nitrogênio ao solo'], [Leaf, 'Gramíneas deixam palha que protege o chão']].map(([Icon, text]) => { const I = Icon as typeof Recycle; return <li className="flex gap-2 rounded-lg bg-slate-950/50 p-3 text-slate-300" key={text as string}><I aria-hidden="true" className="mt-0.5 shrink-0 text-lime-300" size={16} />{text as string}</li>; })}</ul>
  </div>;
}

type Scale = { label: string; from: string; tone: string };
/** Horizontal class scale with a marker; `position` is 0–1 across the whole bar. */
export function ScaleVisual({ title, classes, position, markerLabel, note }: { title: string; classes: Scale[]; position: number; markerLabel: string; note?: string }) {
  return <div>
    <p className="text-sm font-bold">{title}</p>
    <div className="relative mt-6">
      <div className="absolute -top-5 -translate-x-1/2 text-center" style={{ left: `${position * 100}%` }}><span className="whitespace-nowrap rounded-md bg-lime-300 px-2 py-0.5 text-[11px] font-bold text-slate-950">{markerLabel}</span><span aria-hidden="true" className="mx-auto block h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-lime-300" /></div>
      <div className="flex overflow-hidden rounded-lg">{classes.map((c) => <div className={`flex-1 ${c.tone} px-1 py-2 text-center text-[10px] font-semibold leading-tight text-slate-950`} key={c.label}>{c.label}<br /><span className="font-normal">{c.from}</span></div>)}</div>
    </div>
    {note ? <p className="mt-2 text-xs text-slate-400">{note}</p> : null}
  </div>;
}

/** Sparkline of the satellite greenness (NDVI), peak month highlighted. */
export function NdviVisual({ values }: { values: number[] }) {
  const W = 360; const H = 120; const left = 30; const top = 12; const bottom = 22; const plot = H - top - bottom; const slot = (W - left - 8) / 11;
  const y = (v: number) => top + plot - ((v - 0.2) / 0.8) * plot; const x = (i: number) => left + i * slot;
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const peak = values.indexOf(Math.max(...values));
  return <div>
    <svg aria-label="Verdor da vegetação (NDVI) por mês" className="w-full" role="img" viewBox={`0 0 ${W} ${H}`}>
      {[0.2, 0.6, 1].map((v) => <g key={v}><line stroke="#fdf6e3" strokeOpacity="0.12" x1={left} x2={W - 8} y1={y(v)} y2={y(v)} /><text fill="#9fb09a" fontSize="9" textAnchor="end" x={left - 5} y={y(v) + 3}>{v.toFixed(1)}</text></g>)}
      <path d={`${line} L${x(11)},${y(0.2)} L${x(0)},${y(0.2)} Z`} fill="#67d6f0" opacity="0.15" />
      <path d={line} fill="none" stroke="#67d6f0" strokeLinejoin="round" strokeWidth="2.5" />
      <circle cx={x(peak)} cy={y(values[peak])} fill="#b6dc63" r="5" stroke="#142018" strokeWidth="2"><title>{`Pico em ${MONTH_NAMES[peak]}: ${values[peak].toFixed(2)}`}</title></circle>
      {MONTHS.map((m, i) => <text fill="#9fb09a" fontSize="10" key={i} textAnchor="middle" x={x(i)} y={H - 6}>{m}</text>)}
    </svg>
    <p className="mt-1 text-xs text-slate-300"><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-lime-300 align-middle" />Pico de verdor em {MONTH_NAMES[peak]} · quanto mais perto de 1, mais vegetação verde vista do satélite.</p>
  </div>;
}

/** What the producer reported about the soil, with plain-language context and a clear next step. */
export function SoilVisual({ items }: { items: Array<{ title: string; icon: typeof Droplets; meaning: string }> }) {
  return <ul className="grid gap-3">{items.map(({ title, icon: Icon, meaning }) => <li className="flex gap-3 rounded-xl border border-amber-300/30 bg-amber-950/10 p-4" key={title}><span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-300/15 text-amber-200"><Icon size={20} /></span><div><p className="font-bold">{title} <span className="text-xs font-normal text-slate-400">· você relatou</span></p><p className="mt-1 text-sm text-slate-300">{meaning}</p></div></li>)}</ul>;
}
