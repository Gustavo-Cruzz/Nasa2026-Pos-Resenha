'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/components/locale-provider';

/**
 * Arrival after registering the farm: the pixel-art globe animation from `pacote-pixel-globo` (a little farmer walks
 * around a spinning pixel globe to a house, the door opens and he goes in). Frames 0–85 of the original 90 (the last
 * four are the loop's fade-out) are packed in one sprite sheet, 10 columns of 128×128, played once at 80 ms per frame.
 * Then the view zooms into the house and the farm opens.
 */
const SHEET_NIGHT = '/assets/arrival/globo-boneco-sheet.png';
const SHEET_DAY = '/assets/arrival/globo-boneco-sheet-dia.png';

/** Day (06:00–17:59 local) plays the daytime sheet; `?ceu=dia|noite` overrides it for demos. */
function isDaytime() {
  const forced = new URLSearchParams(window.location.search).get('ceu');
  if (forced === 'dia') return true;
  if (forced === 'noite') return false;
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18;
}
const FRAME = 128;
const COLUMNS = 10;
const FRAMES = 86;
const FRAME_MS = 80;
/** From this frame on the farmer is at the door: the caption switches to "we're here". */
const ARRIVED_FRAME = 66;
const ENTER_MS = 900;

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return document.documentElement.dataset.motion === 'reduced' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function FarmArrival({ placeLabel, onDone }: { placeLabel: string; latitude: number; longitude: number; onDone: () => void }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  const [arrived, setArrived] = useState(false);
  const [entering, setEntering] = useState(false);
  const [day, setDay] = useState(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDoneRef.current();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) { const timer = window.setTimeout(finish, 0); return () => window.clearTimeout(timer); }
    context.imageSmoothingEnabled = false;
    const daytime = isDaytime();
    setDay(daytime);
    const timers: number[] = [];
    let interval: number | undefined;
    const draw = (sheet: HTMLImageElement, index: number) => {
      context.clearRect(0, 0, FRAME, FRAME);
      context.drawImage(sheet, (index % COLUMNS) * FRAME, Math.floor(index / COLUMNS) * FRAME, FRAME, FRAME, 0, 0, FRAME, FRAME);
    };
    const enter = () => {
      setEntering(true);
      timers.push(window.setTimeout(finish, ENTER_MS));
    };
    const sheet = new Image();
    sheet.onload = () => {
      if (prefersReducedMotion()) {
        draw(sheet, FRAMES - 1);
        setArrived(true);
        timers.push(window.setTimeout(finish, 1200));
        return;
      }
      let frame = 0;
      draw(sheet, frame);
      interval = window.setInterval(() => {
        frame += 1;
        if (frame >= FRAMES) { window.clearInterval(interval); enter(); return; }
        draw(sheet, frame);
        if (frame === ARRIVED_FRAME) setArrived(true);
      }, FRAME_MS);
    };
    // Without the artwork the farm simply opens.
    sheet.onerror = () => { timers.push(window.setTimeout(finish, 600)); };
    sheet.src = daytime ? SHEET_DAY : SHEET_NIGHT;
    return () => {
      sheet.onload = null;
      sheet.onerror = null;
      if (interval !== undefined) window.clearInterval(interval);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const place = placeLabel || (en ? 'your farm' : 'a sua fazenda');
  const caption = arrived
    ? en ? "We're here! Entering your farm…" : 'Chegamos! Entrando na sua fazenda…'
    : en ? `Heading to ${place}…` : `Indo até ${place}…`;

  return <div aria-label={en ? 'Arriving at your farm' : 'Chegando na sua fazenda'} aria-modal="true" className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-hidden p-4 ${day ? 'bg-[#87cefa]' : 'bg-[#0b1030]'}`} role="dialog">
    <button className={`absolute right-4 top-4 min-h-11 rounded-lg border px-4 text-sm font-semibold ${day ? 'border-sky-700 bg-white/80 text-slate-900 hover:border-green-700' : 'border-slate-500 bg-slate-900/80 text-slate-100 hover:border-lime-300'}`} onClick={finish} type="button">{en ? 'Skip' : 'Pular'}</button>
    <canvas
      aria-hidden="true"
      className="aspect-square h-auto w-[min(80vmin,640px)]"
      height={FRAME}
      ref={canvasRef}
      style={{
        imageRendering: 'pixelated',
        // The house sits at the top of the globe: zoom into it, then fade.
        transformOrigin: '50% 17%',
        transform: entering ? 'scale(6)' : 'scale(1)',
        opacity: entering ? 0 : 1,
        transition: entering ? `transform ${ENTER_MS}ms steps(8, end), opacity ${ENTER_MS}ms steps(4, end)` : 'none',
      }}
      width={FRAME}
    />
    <p aria-live="polite" className={`max-w-md text-center font-mono text-base font-bold sm:text-lg ${day ? 'text-green-900' : 'text-lime-200'}`} role="status">{caption}</p>
  </div>;
}
