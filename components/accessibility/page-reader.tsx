'use client';
import { useEffect, useRef, useState } from 'react';
import { CircleStop, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';
import { speechLanguage, splitForSpeech } from '@/lib/speech';
type Item = { text: string; element: HTMLElement };

export function PageReader({ targetId }: { targetId: string }) {
  const { locale } = useLocale(); const en = locale === 'en'; const [supported, setSupported] = useState(false); const [state, setState] = useState<'idle' | 'reading' | 'paused'>('idle'); const [rate, setRate] = useState(1); const items = useRef<Item[]>([]); const marked = useRef<HTMLElement | null>(null);
  const clearMark = () => { if (marked.current) delete marked.current.dataset.reading; marked.current = null; };
  const stop = () => { window.speechSynthesis.cancel(); clearMark(); items.current = []; setState('idle'); };
  useEffect(() => { void Promise.resolve().then(() => setSupported('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window)); return () => { window.speechSynthesis?.cancel(); if (marked.current) delete marked.current.dataset.reading; }; }, []);
  useEffect(() => { window.speechSynthesis.cancel(); if (marked.current) delete marked.current.dataset.reading; marked.current = null; items.current = []; void Promise.resolve().then(() => setState('idle')); }, [locale]);
  const speakAt = (position: number) => {
    const item = items.current[position]; if (!item) { clearMark(); setState('idle'); return; }
    clearMark(); marked.current = item.element; item.element.dataset.reading = 'true'; item.element.scrollIntoView({ block: 'center', behavior: document.documentElement.dataset.motion === 'reduced' ? 'auto' : 'smooth' });
    const utterance = new SpeechSynthesisUtterance(item.text); utterance.lang = speechLanguage(locale); utterance.rate = rate; const lang = utterance.lang.toLowerCase(); const voices = window.speechSynthesis.getVoices(); utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === lang) ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(lang.slice(0, 2))) ?? null;
    utterance.onend = () => speakAt(position + 1); utterance.onerror = () => { clearMark(); setState('idle'); }; window.speechSynthesis.speak(utterance);
  };
  const start = () => { stop(); const root = document.getElementById(targetId); if (!root) return; const markedSections = [...root.querySelectorAll<HTMLElement>('[data-readable]')]; const sections = markedSections.length ? markedSections : [root]; items.current = sections.flatMap((element) => splitForSpeech(element.innerText).map((text) => ({ text, element }))); if (!items.current.length) return; setState('reading'); speakAt(0); };
  const togglePause = () => { if (state === 'reading') { window.speechSynthesis.pause(); setState('paused'); } else if (state === 'paused') { window.speechSynthesis.resume(); setState('reading'); } };
  if (!supported) return null;
  return <div aria-label={en ? 'Page reader' : 'Leitor da página'} className="flex items-center gap-1 rounded-xl border border-slate-600 bg-slate-900/90 p-1" role="group">
    {state === 'idle' ? <button aria-label={en ? 'Read page' : 'Ler página'} className="inline-flex h-10 items-center gap-2 rounded-lg bg-lime-300 px-3 text-sm font-bold text-slate-950" onClick={start} type="button"><Volume2 aria-hidden="true" size={17} /><span className="hidden xl:inline">{en ? 'Read page' : 'Ler página'}</span></button> : <><button aria-label={state === 'paused' ? (en ? 'Continue reading' : 'Continuar leitura') : (en ? 'Pause reading' : 'Pausar leitura')} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-600" onClick={togglePause} type="button">{state === 'paused' ? <Play aria-hidden="true" size={17} /> : <Pause aria-hidden="true" size={17} />}</button><button aria-label={en ? 'Read from the beginning' : 'Ler desde o início'} className="hidden h-10 w-10 place-items-center rounded-lg border border-slate-600 sm:grid" onClick={start} type="button"><RotateCcw aria-hidden="true" size={17} /></button><button aria-label={en ? 'Stop reading' : 'Parar leitura'} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-600" onClick={stop} type="button"><CircleStop aria-hidden="true" size={17} /></button></>}
    <label className="hidden items-center text-xs text-slate-300 lg:flex">{en ? 'Speed' : 'Velocidade'}<select className="ml-2 rounded border border-slate-600 bg-slate-950 p-1.5" disabled={state !== 'idle'} value={rate} onChange={(event) => setRate(Number(event.target.value))}><option value="0.8">{en ? 'Slow' : 'Lenta'}</option><option value="1">Normal</option><option value="1.25">{en ? 'Fast' : 'Rápida'}</option></select></label>
    <span aria-live="polite" className="sr-only">{state === 'reading' ? (en ? 'Reading page.' : 'Lendo a página.') : state === 'paused' ? (en ? 'Reading paused.' : 'Leitura pausada.') : ''}</span>
  </div>;
}
