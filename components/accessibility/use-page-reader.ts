'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/components/locale-provider';
import { speechLanguage, splitForSpeech } from '@/lib/speech';

export type PageReaderState = 'idle' | 'reading' | 'paused';
type Item = { text: string; element: HTMLElement };

const prefersReducedMotion = () => document.documentElement.dataset.motion === 'reduced' || (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/** Reads the `[data-readable]` sections of `#targetId` aloud, in DOM order, highlighting the current one. */
export function usePageReader(targetId: string, options: { rate?: number } = {}) {
  const { locale } = useLocale();
  const pathname = usePathname();
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<PageReaderState>('idle');
  const items = useRef<Item[]>([]);
  // Chromium drops utterances that are garbage-collected mid-speech (onend never fires): keep the current one alive.
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  const [problem, setProblem] = useState<'no-voice' | 'failed' | null>(null);
  const marked = useRef<HTMLElement | null>(null);
  const rateRef = useRef(options.rate ?? 1);
  const localeRef = useRef(locale);
  const stateRef = useRef<PageReaderState>('idle');
  // Keep the event handler in sync before the browser can expose the new-language button.
  useLayoutEffect(() => { rateRef.current = options.rate ?? 1; localeRef.current = locale; }, [locale, options.rate]);
  const update = useCallback((next: PageReaderState) => { stateRef.current = next; setState(next); }, []);
  const clearMark = useCallback(() => { if (marked.current) delete marked.current.dataset.reading; marked.current = null; }, []);
  const stop = useCallback(() => { current.current = null; window.speechSynthesis?.cancel(); clearMark(); items.current = []; update('idle'); }, [clearMark, update]);
  useEffect(() => { void Promise.resolve().then(() => setSupported('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window)); return () => { window.speechSynthesis?.cancel(); if (marked.current) delete marked.current.dataset.reading; }; }, []);
  useEffect(() => { window.speechSynthesis?.cancel(); if (marked.current) delete marked.current.dataset.reading; marked.current = null; items.current = []; void Promise.resolve().then(() => update('idle')); }, [locale, pathname, update]);
  const speakAtRef = useRef<(position: number) => void>(() => undefined);
  const speakAt = useCallback((position: number) => {
    const item = items.current[position]; if (!item) { clearMark(); current.current = null; update('idle'); return; }
    clearMark(); marked.current = item.element; item.element.dataset.reading = 'true'; item.element.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    const utterance = new SpeechSynthesisUtterance(item.text); utterance.lang = speechLanguage(localeRef.current); utterance.rate = rateRef.current; const lang = utterance.lang.toLowerCase(); const voices = window.speechSynthesis.getVoices(); utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === lang) ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(lang.slice(0, 2))) ?? null;
    utterance.onend = () => { if (current.current === utterance) speakAtRef.current(position + 1); };
    // `interrupted`/`canceled` are what our own stop/restart produce: not a failure.
    utterance.onerror = (event) => { if (current.current !== utterance || event.error === 'interrupted' || event.error === 'canceled') return; current.current = null; clearMark(); setProblem(window.speechSynthesis.getVoices().length ? 'failed' : 'no-voice'); update('idle'); };
    current.current = utterance;
    // A synthesis left paused by another reader would swallow the new utterance.
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  }, [clearMark, update]);
  useEffect(() => { speakAtRef.current = speakAt; }, [speakAt]);
  /** Voices load asynchronously (and never, on Linux Chromium without speech-dispatcher): wait up to ~1.5 s. */
  const waitForVoices = () => new Promise<number>((resolve) => {
    const synth = window.speechSynthesis;
    if (synth.getVoices().length) { resolve(synth.getVoices().length); return; }
    const done = () => { synth.removeEventListener('voiceschanged', done); window.clearTimeout(timer); resolve(synth.getVoices().length); };
    const timer = window.setTimeout(done, 1500);
    synth.addEventListener('voiceschanged', done);
  });
  const start = useCallback(() => {
    stop(); setProblem(null);
    const root = document.getElementById(targetId); if (!root) return;
    const markedSections = [...root.querySelectorAll<HTMLElement>('[data-readable]')]; const sections = markedSections.length ? markedSections : [root];
    items.current = sections.flatMap((element) => splitForSpeech(element.innerText).map((text) => ({ text, element }))); if (!items.current.length) return;
    update('reading');
    void waitForVoices().then((count) => {
      if (stateRef.current !== 'reading') return;
      if (!count) { items.current = []; setProblem('no-voice'); update('idle'); return; }
      // Chromium ignores a speak() issued in the same tick as cancel().
      window.setTimeout(() => { if (stateRef.current === 'reading') speakAt(0); }, 60);
    });
  }, [stop, targetId, update, speakAt]);
  const pause = useCallback(() => { if (stateRef.current === 'reading') { window.speechSynthesis.pause(); update('paused'); } }, [update]);
  const resume = useCallback(() => { if (stateRef.current === 'paused') { window.speechSynthesis.resume(); update('reading'); } }, [update]);
  return { state, supported, problem, start, pause, resume, stop };
}
