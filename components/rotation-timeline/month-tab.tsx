'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CropSprite } from '@/components/crops/crop-sprite';
import { Term } from '@/components/rotation-timeline/glossary-term';
import type { Locale } from '@/lib/i18n';
import type { AnalysisResult } from '@/lib/engine/types';
import { cropDisplayName } from '@/lib/presentation';
import { cropById, type Crop } from '@/lib/catalog';
import type { LaneModel, TimelineModel } from '@/lib/rotation-timeline/model';
import { MONTH_LONG, formatNumber, monthPanelRows } from '@/lib/rotation-timeline/text';
import { isHypothetical, type WhatIf } from '@/lib/rotation-timeline/what-if';
import { erosivityLabel } from '@/lib/climate/erosivity';

const BADGE = { A: 'bg-[#FBF8F0]', B: 'bg-[#8DC8CF]', C: 'bg-[#B6DC63]' } as const;

export function MonthTab({ data, model, lanes, offset, whatIf, onNav, locale }: { data: AnalysisResult; model: TimelineModel; lanes: LaneModel[]; offset: number; whatIf: WhatIf; onNav: (delta: number) => void; locale: Locale }) {
  const en = locale === 'en'; const item = model.months[offset]!; const rows = monthPanelRows(model.series, item.month, whatIf, locale); const reading = rows.reading;
  const rainy = data.climate.seasonality?.rainySeason ?? null;
  const rainyText = rainy ? (rainy.months.includes(item.month) ? (en ? 'yes' : 'sim') : (en ? 'no' : 'não')) : 'N/D';
  const high = !model.series.has.erosivity ? 'N/D' : reading.highErosivity ? (en ? 'yes' : 'sim') : (en ? 'no' : 'não');
  return <div>
    <div className="mb-2 flex items-center justify-between gap-2">
      <button aria-label={en ? 'Previous month' : 'Mês anterior'} className="grid h-9 w-9 place-items-center rounded-lg border border-[#405840] hover:border-lime-300 disabled:opacity-40" disabled={offset === 0} type="button" onClick={() => onNav(-1)}><ChevronLeft aria-hidden="true" size={16} /></button>
      <h3 className="m-0 text-center text-xl font-bold">{MONTH_LONG[locale][item.month - 1]} <span className="font-mono text-xs font-normal text-slate-400">{en ? 'year' : 'ano'} {item.year}</span></h3>
      <button aria-label={en ? 'Next month' : 'Próximo mês'} className="grid h-9 w-9 place-items-center rounded-lg border border-[#405840] hover:border-lime-300 disabled:opacity-40" disabled={offset === model.months.length - 1} type="button" onClick={() => onNav(1)}><ChevronRight aria-hidden="true" size={16} /></button>
    </div>
    {isHypothetical(whatIf) ? <p className="my-2 rounded-lg border border-[#E7BF62] bg-[#3a3015] px-2.5 py-1.5 text-xs text-[#F1D58A]">{en ? `Hypothetical simulator applied: temperature ${formatNumber(whatIf.tempC, 1, locale, { sign: true })} °C, rain ${formatNumber(whatIf.rainPct, 0, locale, { sign: true })}%. Not a forecast.` : `Valores com o simulador aplicado (hipotético): temperatura ${formatNumber(whatIf.tempC, 1, locale, { sign: true })} °C, chuva ${formatNumber(whatIf.rainPct, 0, locale, { sign: true })}%. Não é previsão.`}</p> : null}
    <section aria-label={en ? 'Crop in each scenario' : 'Cultura em cada cenário'}>
      <h4 className="mb-1 text-sm font-bold">{en ? 'Crop in each scenario' : 'Cultura em cada cenário'}</h4>
      <ul className="m-0 list-none p-0">{lanes.map((lane) => {
        const segment = lane.segments.find((entry) => offset >= entry.startOffset && offset < entry.startOffset + entry.length); const cell = lane.zarc[offset]; const bare = lane.bare.some((entry) => offset >= entry.startOffset && offset < entry.startOffset + entry.length);
        const range = segment ? cropById.get(segment.cropId as Crop['id'])?.viableTempC ?? null : null; const temp = reading.tmeanC;
        return <li className="flex flex-wrap items-center gap-2 py-1 text-sm" key={lane.id}>
          <span className={`grid h-6 w-6 place-items-center rounded-[7px] text-[13px] font-extrabold text-[#142018] ${BADGE[lane.id]}`}>{lane.id}</span>
          {segment ? <span className="inline-flex items-center gap-1 font-bold"><CropSprite cropId={segment.cropId} name="" size={18} />{cropDisplayName(segment.cropId, null, locale)}</span> : bare ? <span className="rounded-full border border-[#E7BF62] px-2 py-0.5 text-xs text-[#E7BF62]">▼ {en ? 'bare soil' : 'solo descoberto'}</span> : <span className="text-xs text-slate-400">N/D</span>}
          {cell ? <span className={`rounded-full border px-2 py-0.5 text-xs ${cell.status === 'indicated' ? 'border-cyan-300 text-cyan-200' : 'border-[#E7BF62] text-[#E7BF62]'}`} title={en ? cell.noteEn : cell.note}>ZARC {cell.status === 'indicated' ? `${en ? 'sowing indicated' : 'plantio indicado'}${cell.riskPct ? ` · ${en ? 'risk' : 'risco'} ${cell.riskPct}%` : ''}` : cell.status === 'not_indicated' ? (en ? 'sowing not indicated' : 'plantio não indicado') : 'N/D'}</span> : null}
          {segment && range && temp !== null ? <span className={`text-xs ${temp < range.min || temp > range.max ? 'text-[#E7BF62]' : 'text-slate-300'}`}>{temp < range.min || temp > range.max ? (en ? 'mean temperature outside the documented range' : 'temperatura média fora da faixa documentada') : (en ? 'mean temperature inside the documented range' : 'temperatura média dentro da faixa documentada')}</span> : null}
        </li>;
      })}</ul>
    </section>
    <section className="mt-3 border-t border-slate-700 pt-2" aria-label={en ? 'Month climate' : 'Clima do mês'}>
      <h4 className="mb-1 text-sm font-bold">{en ? 'Month climate' : 'Clima do mês'} <span className="ml-1 rounded-full border border-slate-600 px-2 py-0.5 text-[11px] font-normal">{en ? 'historical median' : 'mediana histórica'}</span></h4>
      <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[13px]">
        <dt className="text-slate-400">{en ? 'Rain' : 'Chuva'} (<Term k="IMERG">IMERG</Term>/<Term k="POWER">POWER</Term>)</dt><dd className="m-0 text-right font-mono">{rows.rain}</dd>
        <dt className="text-slate-400"><Term k="ET0">ET₀</Term> FAO-56</dt><dd className="m-0 text-right font-mono">{rows.et0}</dd>
        <dt className="text-slate-400"><Term k="PET0">P−ET₀</Term></dt><dd className="m-0 text-right font-mono">{reading.balanceMm === null ? 'N/D' : `${reading.balanceMm >= 0 ? '▲' : '▼'} ${rows.balance}`}</dd>
        <dt className="text-slate-400">{en ? 'Mean temperature' : 'Temperatura média'}</dt><dd className="m-0 text-right font-mono">{rows.temp}</dd>
        <dt className="text-slate-400"><Term k="GWETROOT">GWETROOT</Term></dt><dd className="m-0 text-right font-mono">{rows.wetness}</dd>
        <dt className="text-slate-400"><Term k="NDVI">NDVI</Term></dt><dd className="m-0 text-right font-mono">{rows.ndvi}</dd>
        <dt className="text-slate-400">{en ? 'Share of annual rain' : 'Parte da chuva anual'}</dt><dd className="m-0 text-right font-mono">{rows.share}</dd>
        <dt className="text-slate-400">{en ? 'More erosive rain month' : 'Mês de chuva mais erosiva'} ({data.climate.erosivity?.classId ? erosivityLabel(data.climate.erosivity.classId, locale) : 'N/D'})</dt><dd className="m-0 text-right font-mono">{high}</dd>
        <dt className="text-slate-400">{en ? 'Years with frost (' : 'Anos com geada ('}<Term k="Tmin">Tmín ≤ 2 °C</Term>)</dt><dd className="m-0 text-right font-mono">{rows.frost}</dd>
        <dt className="text-slate-400">{en ? 'Rainy season' : 'Estação chuvosa'}</dt><dd className="m-0 text-right font-mono">{rainyText}</dd>
      </dl>
      <p className="mt-2 text-[11px] text-slate-400">{en ? 'Climate context, not a forecast; ET₀ is a reference value, not crop water use.' : 'Contexto climático, não previsão; ET₀ é valor de referência, não consumo da cultura.'}</p>
    </section>
  </div>;
}
