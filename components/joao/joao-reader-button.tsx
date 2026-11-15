'use client';
import { CircleStop, Pause, Play, Volume2 } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';
import { usePageReader } from '@/components/accessibility/use-page-reader';

const btn = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-lime-300/60 px-4 text-sm font-bold text-lime-100 hover:bg-lime-300/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 disabled:cursor-not-allowed disabled:opacity-60';

export function JoaoReaderButton({ targetId, className }: { targetId: string; className?: string }) {
  const { locale } = useLocale(); const en = locale === 'en';
  const { state, supported, problem, start, pause, resume, stop } = usePageReader(targetId);
  const wrap = `inline-flex flex-wrap items-center gap-2 ${className ?? ''}`.trim();
  if (!supported) return <div className={wrap}><button className={btn} disabled title={en ? 'Reading aloud is not available in this browser.' : 'A leitura em voz alta não está disponível neste navegador.'} type="button"><Volume2 aria-hidden="true" size={18} />{en ? 'João, read it to me' : 'João, lê pra mim'}</button></div>;
  const status = state === 'reading' ? (en ? 'João is reading.' : 'João está lendo.') : state === 'paused' ? (en ? 'Reading paused.' : 'Leitura pausada.') : '';
  return <div className={wrap}>
    {state === 'idle'
      ? <button aria-pressed={false} className={btn} onClick={start} type="button"><Volume2 aria-hidden="true" size={18} />{en ? 'João, read it to me' : 'João, lê pra mim'}</button>
      : <>
        <button aria-pressed={state === 'reading'} className={btn} onClick={state === 'reading' ? pause : resume} type="button">{state === 'reading' ? <Pause aria-hidden="true" size={18} /> : <Play aria-hidden="true" size={18} />}{state === 'reading' ? (en ? 'Pause' : 'Pausar') : (en ? 'Resume' : 'Continuar')}</button>
        <button className={btn} onClick={stop} type="button"><CircleStop aria-hidden="true" size={18} />{en ? 'Stop' : 'Parar'}</button>
      </>}
    {state === 'reading' ? <span aria-hidden="true" className="inline-flex items-center gap-1 text-xs text-lime-100"><span className="inline-flex items-end gap-0.5" data-testid="joao-speaking-dots">{[0, 1, 2].map((i) => <span className="h-1.5 w-1.5 bg-lime-300 motion-safe:animate-bounce" key={i} style={{ animationDelay: `${i * 150}ms` }} />)}</span>{en ? 'speaking…' : 'falando…'}</span> : null}
    <span aria-live="polite" className="sr-only" role="status">{status}</span>
    {problem ? <p className="basis-full text-xs text-amber-100" role="alert">{problem === 'no-voice'
      ? (en ? 'Your browser has no reading voice installed, so I cannot speak. On Linux with Chrome/Brave, open the browser with --enable-speech-dispatcher, or use Firefox.' : 'O seu navegador não tem nenhuma voz de leitura instalada, então não consigo falar. No Linux com Chrome/Brave, abra o navegador com --enable-speech-dispatcher, ou use o Firefox.')
      : (en ? 'The browser could not play the voice. Try again.' : 'O navegador não conseguiu tocar a voz. Tente de novo.')}</p> : null}
  </div>;
}
