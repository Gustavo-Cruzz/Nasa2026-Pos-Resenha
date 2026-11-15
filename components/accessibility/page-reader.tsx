'use client';
import { useState } from 'react';
import { CircleStop, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';
import { usePageReader } from './use-page-reader';

export function PageReader({ targetId }: { targetId: string }) {
  const { locale } = useLocale(); const en = locale === 'en'; const [rate, setRate] = useState(1); const { state, supported, start, pause, resume, stop } = usePageReader(targetId, { rate });
  const togglePause = () => { if (state === 'reading') pause(); else if (state === 'paused') resume(); };
  if (!supported) return null;
  return <div aria-label={en ? 'Page reader' : 'Leitor da página'} className="flex items-center gap-1 rounded-xl border border-slate-600 bg-slate-900/90 p-1" role="group">
    {state === 'idle' ? <button aria-label={en ? 'Read page' : 'Ler página'} className="inline-flex h-10 items-center gap-2 rounded-lg bg-lime-300 px-3 text-sm font-bold text-slate-950" onClick={start} type="button"><Volume2 aria-hidden="true" size={17} /><span className="hidden xl:inline">{en ? 'Read page' : 'Ler página'}</span></button> : <><button aria-label={state === 'paused' ? (en ? 'Continue reading' : 'Continuar leitura') : (en ? 'Pause reading' : 'Pausar leitura')} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-600" onClick={togglePause} type="button">{state === 'paused' ? <Play aria-hidden="true" size={17} /> : <Pause aria-hidden="true" size={17} />}</button><button aria-label={en ? 'Read from the beginning' : 'Ler desde o início'} className="hidden h-10 w-10 place-items-center rounded-lg border border-slate-600 sm:grid" onClick={start} type="button"><RotateCcw aria-hidden="true" size={17} /></button><button aria-label={en ? 'Stop reading' : 'Parar leitura'} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-600" onClick={stop} type="button"><CircleStop aria-hidden="true" size={17} /></button></>}
    <label className="hidden items-center text-xs text-slate-300 lg:flex">{en ? 'Speed' : 'Velocidade'}<select className="ml-2 rounded border border-slate-600 bg-slate-950 p-1.5" disabled={state !== 'idle'} value={rate} onChange={(event) => setRate(Number(event.target.value))}><option value="0.8">{en ? 'Slow' : 'Lenta'}</option><option value="1">Normal</option><option value="1.25">{en ? 'Fast' : 'Rápida'}</option></select></label>
    <span aria-live="polite" className="sr-only">{state === 'reading' ? (en ? 'Reading page.' : 'Lendo a página.') : state === 'paused' ? (en ? 'Reading paused.' : 'Leitura pausada.') : ''}</span>
  </div>;
}
