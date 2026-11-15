'use client';

import { BookOpen, CloudRain, CloudSun, Database, Layers, Leaf, Map, Mountain, Satellite, UserRound, Waves } from 'lucide-react';
import { pick, SOURCE_GROUPS, SOURCES, type Level, type SourceCard } from '@/components/methodology/content';

const ICONS: Record<SourceCard['icon'], typeof Satellite> = { satellite: Satellite, rain: CloudRain, leaf: Leaf, mountain: Mountain, map: Map, layers: Layers, database: Database, book: BookOpen, cloud: CloudSun, wave: Waves, user: UserRound };
const ACCENT: Record<string, string> = { nasa_numeric: 'bg-cyan-300/10 text-cyan-200', nasa_visual: 'bg-sky-300/10 text-sky-200', br_global: 'bg-lime-300/10 text-lime-200', yours: 'bg-amber-300/10 text-amber-200' };

export function SourceCards({ level, en }: { level: Level; en: boolean }) {
  return <div className="mt-5 grid gap-8">
    {SOURCE_GROUPS.map((group) => <section aria-labelledby={`group-${group.id}`} key={group.id}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h3 className="text-lg font-bold" id={`group-${group.id}`}>{pick(group.title, en)}</h3>
        <p className="text-sm text-slate-400">{pick(group.hint, en)}</p>
      </div>
      <ul className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SOURCES[group.id].map((source) => {
          const Icon = ICONS[source.icon];
          return <li className="flex flex-col rounded-xl border border-slate-700 bg-slate-900/70 p-5 transition-colors hover:border-slate-500" key={source.id}>
            <div className="flex items-center gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${ACCENT[group.id]}`}><Icon aria-hidden="true" size={22} /></span><h4 className="font-bold">{source.title}</h4></div>
            <dl className="mt-3 grid gap-2 text-sm">
              <div><dt className="font-semibold text-slate-100">{en ? 'What it gives' : 'O que dá'}</dt><dd className="text-slate-300">{pick(source.gives, en)}</dd></div>
              <div><dt className="font-semibold text-slate-100">{en ? 'Why we chose it' : 'Por que escolhemos'}</dt><dd className="text-slate-300">{pick(source.why, en)}</dd></div>
              <div><dt className="font-semibold text-amber-200">{en ? 'Limit' : 'Limite'}</dt><dd className="text-amber-50/90">{pick(source.limit, en)}</dd></div>
              {level === 'technical' && source.tech ? <div className="mt-1 grid gap-1 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs">
                <dt className="sr-only">{en ? 'Technical details' : 'Detalhes técnicos'}</dt>
                <dd><span className="text-slate-400">{en ? 'Parameters: ' : 'Parâmetros: '}</span><code className="break-words text-cyan-100">{source.tech.params}</code></dd>
                <dd><span className="text-slate-400">{en ? 'Resolution: ' : 'Resolução: '}</span><span className="text-slate-200">{pick(source.tech.resolution, en)}</span></dd>
                <dd><span className="text-slate-400">{en ? 'Period: ' : 'Período: '}</span><span className="text-slate-200">{pick(source.tech.period, en)}</span></dd>
              </div> : null}
            </dl>
          </li>;
        })}
      </ul>
    </section>)}
  </div>;
}
