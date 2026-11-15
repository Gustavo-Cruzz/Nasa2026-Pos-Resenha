'use client';

import Image from 'next/image';
import { useLocale } from '@/components/locale-provider';
import { JOAO_MOODS, MOODS_MISSING, moodText, type JoaoMood } from '@/lib/explain/joao-mood';

/** Review view for João's moods: which art exists, when each mood is used, and which ones are still missing.
 *  The per-mood label/when/usedIn strings come from lib/explain/joao-mood.ts (Portuguese there). */
export function JoaoMoodsView() {
  const { locale } = useLocale();
  const en = locale === 'en';
  const moods = Object.entries(JOAO_MOODS) as Array<[JoaoMood, (typeof JOAO_MOODS)[JoaoMood]]>;
  const missingNames = MOODS_MISSING.map((mood) => moodText(mood, locale).label.toLowerCase()).join(en ? ' and ' : ' e ');
  return <section className="mx-auto max-w-5xl">
    <h1 className="page-title font-bold">{en ? 'João’s moods' : 'Humores do João'}</h1>
    <p className="mt-2 text-slate-300">{en ? `The mood follows the data, never the crop: it reacts to what a number says about the place’s own normal. ${MOODS_MISSING.length} of ${moods.length} moods are missing: ${missingNames}.` : `O humor segue o dado, nunca a lavoura: ele reage ao que um número diz sobre o normal do próprio lugar. Faltam ${MOODS_MISSING.length} de ${moods.length} humores: ${missingNames}.`}</p>
    <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{moods.map(([mood, spec]) => { const text = moodText(mood, locale); return <li className={`rounded-2xl border p-4 ${spec.status === 'ready' ? 'border-slate-700 bg-slate-900/70' : 'border-amber-300/60 bg-amber-950/20'}`} key={mood}>
      <div className="flex items-start gap-4">
        {spec.src ? <Image alt={en ? `João, mood: ${text.label}` : `João, humor: ${text.label}`} className="h-[180px] w-[120px] shrink-0 object-contain object-bottom" height={360} src={spec.src} width={240} /> : <div className="grid h-[180px] w-[120px] shrink-0 place-items-center rounded-xl border-2 border-dashed border-amber-300/70 p-2 text-center text-sm font-bold text-amber-100">{en ? 'Art missing' : 'Falta arte'}</div>}
        <div className="min-w-0"><h2 className="text-lg font-bold">{text.label}</h2><p className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-bold ${spec.status === 'ready' ? 'bg-cyan-300/15 text-cyan-200' : 'bg-amber-300 text-slate-950'}`}>{spec.status === 'ready' ? (en ? 'Ready' : 'Pronto') : (en ? 'Image missing' : 'Falta a imagem')}</p><p className="mt-1 font-mono text-xs text-slate-400">{mood}</p></div>
      </div>
      <p className="mt-3 text-sm text-slate-200"><b className="text-lime-200">{en ? 'When it appears: ' : 'Quando aparece: '}</b>{text.when}</p>
      <p className="mt-2 text-sm text-slate-300"><b className="text-slate-200">{en ? 'Where today: ' : 'Onde hoje: '}</b>{text.usedIn}</p>
    </li>; })}</ul>
  </section>;
}
