'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { recognitionConstructor, recognitionError, speechLanguage, type RecognitionInstance, type SpeechLocale } from '@/lib/speech';
type VoiceCopy = { speak: string; stop: string; useMicrophone: string; listening: string };

export function VoiceInputButton({ locale, disabled, onTranscript, copy, autoFocus = false, onAvailabilityChange }: { locale: SpeechLocale; disabled: boolean; onTranscript: (text: string) => void; copy: VoiceCopy; autoFocus?: boolean; onAvailabilityChange?: (available: boolean) => void }) {
  const [supported, setSupported] = useState(false); const [listening, setListening] = useState(false); const [error, setError] = useState('');
  const active = useRef<RecognitionInstance | null>(null);
  useEffect(() => { const available = Boolean(recognitionConstructor()); void Promise.resolve().then(() => { setSupported(available); onAvailabilityChange?.(available); }); return () => { active.current?.abort(); active.current = null; }; }, [onAvailabilityChange]);
  useEffect(() => { active.current?.abort(); active.current = null; void Promise.resolve().then(() => { setListening(false); setError(''); }); }, [locale]);
  const toggle = () => {
    if (listening) { active.current?.stop(); return; }
    const Recognition = recognitionConstructor(); if (!Recognition) return;
    const instance = new Recognition(); instance.lang = speechLanguage(locale); instance.continuous = false; instance.interimResults = false; instance.maxAlternatives = 1;
    instance.onresult = (event) => { const value = event.results[0]?.[0]?.transcript.trim(); if (value) onTranscript(value); };
    instance.onerror = (event) => { setError(recognitionError(event.error, locale)); setListening(false); };
    instance.onend = () => { setListening(false); active.current = null; };
    active.current = instance; setError(''); setListening(true);
    try { instance.start(); } catch { setListening(false); setError(recognitionError('unknown', locale)); }
  };
  if (!supported) return null;
  const label = listening ? copy.stop : copy.speak;
  return <><button aria-label={label} aria-pressed={listening} autoFocus={autoFocus} className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border disabled:opacity-50 ${listening ? 'border-red-300 bg-red-300 text-slate-950' : 'border-slate-600 text-slate-100 hover:border-lime-300'}`} disabled={disabled} onClick={toggle} title={error || copy.useMicrophone} type="button">{listening ? <MicOff aria-hidden="true" size={19} /> : <Mic aria-hidden="true" size={19} />}</button><span aria-live="polite" className="sr-only">{error || (listening ? copy.listening : '')}</span></>;
}
