import Image from 'next/image';
import { JOAO_MOODS, MOODS_MISSING, type JoaoMood } from '@/lib/explain/joao-mood';

export const metadata = { title: 'Humores do João · Plantaê', robots: { index: false, follow: false } };

/** Review page for João's moods: which art exists, when each mood is used, and which ones are still missing. */
export default function JoaoMoodsPage() {
  const moods = Object.entries(JOAO_MOODS) as Array<[JoaoMood, (typeof JOAO_MOODS)[JoaoMood]]>;
  return <section className="mx-auto max-w-5xl">
    <h1 className="page-title font-bold">Humores do João</h1>
    <p className="mt-2 text-slate-300">O humor segue o dado, nunca a lavoura: ele reage ao que um número diz sobre o normal do próprio lugar. Faltam {MOODS_MISSING.length} de {moods.length} humores: {MOODS_MISSING.map((mood) => JOAO_MOODS[mood].label.toLowerCase()).join(' e ')}.</p>
    <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{moods.map(([mood, spec]) => <li className={`rounded-2xl border p-4 ${spec.status === 'ready' ? 'border-slate-700 bg-slate-900/70' : 'border-amber-300/60 bg-amber-950/20'}`} key={mood}>
      <div className="flex items-start gap-4">
        {spec.src ? <Image alt={`João, humor: ${spec.label}`} className="h-[180px] w-[120px] shrink-0 object-contain object-bottom" height={360} src={spec.src} width={240} /> : <div className="grid h-[180px] w-[120px] shrink-0 place-items-center rounded-xl border-2 border-dashed border-amber-300/70 p-2 text-center text-sm font-bold text-amber-100">Falta arte</div>}
        <div className="min-w-0"><h2 className="text-lg font-bold">{spec.label}</h2><p className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-bold ${spec.status === 'ready' ? 'bg-cyan-300/15 text-cyan-200' : 'bg-amber-300 text-slate-950'}`}>{spec.status === 'ready' ? 'Pronto' : 'Falta a imagem'}</p><p className="mt-1 font-mono text-xs text-slate-400">{mood}</p></div>
      </div>
      <p className="mt-3 text-sm text-slate-200"><b className="text-lime-200">Quando aparece: </b>{spec.when}</p>
      <p className="mt-2 text-sm text-slate-300"><b className="text-slate-200">Onde hoje: </b>{spec.usedIn}</p>
    </li>)}</ul>
  </section>;
}
