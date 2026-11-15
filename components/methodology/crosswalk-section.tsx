'use client';

import type { CSSProperties } from 'react';
import { CROSSWALK, pick, ROADMAP, STATUS_LABEL, type CrosswalkStatus, type Level } from '@/components/methodology/content';
import styles from '@/components/methodology/methodology.module.css';

const ORDER: CrosswalkStatus[] = ['numeric', 'visual', 'replaced', 'candidate', 'na'];
const BADGE: Record<CrosswalkStatus, string> = {
  numeric: 'border-lime-300/50 bg-lime-300/10 text-lime-100',
  visual: 'border-sky-300/50 bg-sky-300/10 text-sky-100',
  replaced: 'border-cyan-300/50 bg-cyan-300/10 text-cyan-100',
  candidate: 'border-amber-300/50 bg-amber-300/10 text-amber-100',
  na: 'border-slate-600 bg-slate-800/60 text-slate-300',
};
const DOTS = { easy: 1, medium: 2, hard: 3 } as const;

/** Challenge resources × FieldShift status (docs/DATA_CROSSWALK.md) and the next-data roadmap by integration difficulty. */
export function CrosswalkSection({ level, en }: { level: Level; en: boolean }) {
  return <>
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {ORDER.map((status) => {
        const rows = CROSSWALK.filter((row) => row.status === status);
        return <section aria-labelledby={`cw-${status}`} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4" key={status}>
          <h3 className="flex items-center justify-between gap-2 text-sm font-bold" id={`cw-${status}`}><span>{pick(STATUS_LABEL[status], en)}</span><span className={`rounded-full border px-2 py-0.5 text-xs ${BADGE[status]}`}>{rows.length}</span></h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {rows.map((row, index) => <li className={`${styles.node} rounded-lg border px-2.5 py-1 text-sm ${BADGE[status]} ${level === 'technical' ? 'w-full' : ''}`} key={row.name} style={{ '--i': index } as CSSProperties}>
              <span className="font-semibold">{row.name}</span>
              {level === 'technical' ? <span className="block text-xs opacity-80">{pick(row.note, en)}</span> : <span className="sr-only">: {pick(row.note, en)}</span>}
            </li>)}
          </ul>
        </section>;
      })}
    </div>
    <p className="mt-3 text-sm text-slate-400">{en ? `${CROSSWALK.length} resources listed by the challenge. Most US-only datasets have a Brazilian or global stand-in; IMERG and MODIS are also shown as map layers. Details: docs/DATA_CROSSWALK.md.` : `${CROSSWALK.length} recursos listados pelo desafio. A maioria das bases só dos EUA tem substituto brasileiro ou global; IMERG e MODIS também aparecem como camadas no mapa. Detalhes: docs/DATA_CROSSWALK.md.`}</p>

    <h3 className="mt-10 text-xl font-bold">{en ? 'Next data' : 'Próximos dados'}</h3>
    <p className="mt-1 text-sm text-slate-400">{en ? 'Already computed, so not on this list: ET0, rain − ET0 balance, rainy season, dry spells, frost screen, erosivity, root-zone wetness.' : 'Já calculados, por isso fora da lista: ET0, balanço chuva − ET0, estação chuvosa, veranicos, triagem de geada, erosividade, umidade radicular.'}</p>
    <ol className="mt-4 grid gap-4 md:grid-cols-3">
      {ROADMAP.map((tier) => <li className="rounded-xl border border-slate-700 bg-slate-900/70 p-5" key={tier.id}>
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-lg font-bold">{pick(tier.title, en)}</h4>
          <span aria-label={en ? `difficulty ${DOTS[tier.id]} of 3` : `dificuldade ${DOTS[tier.id]} de 3`} className="flex gap-1" role="img">{[1, 2, 3].map((dot) => <span className={`h-2.5 w-5 rounded-full ${dot <= DOTS[tier.id] ? (tier.id === 'easy' ? 'bg-lime-300' : tier.id === 'medium' ? 'bg-amber-300' : 'bg-rose-400') : 'bg-slate-700'}`} key={dot} />)}</span>
        </div>
        <p className="text-sm text-slate-400">{pick(tier.hint, en)}</p>
        <ul className="mt-3 grid gap-3 text-sm">
          {tier.items.map((item) => <li key={item.title.pt}>
            <b className="text-slate-100">{pick(item.title, en)}</b>
            <p className="text-slate-300">{pick(item.adds, en)}</p>
            {level === 'technical' ? <p className="mt-0.5 font-mono text-xs text-cyan-100/90">{pick(item.tech, en)}</p> : null}
          </li>)}
        </ul>
      </li>)}
    </ol>
  </>;
}
