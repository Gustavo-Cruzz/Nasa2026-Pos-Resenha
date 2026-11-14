'use client';

import { useEffect, useState } from 'react';
import type { LiveWeather } from '@/lib/weather/open-meteo';

type Result = { key: string; weather?: LiveWeather; failed?: boolean };
export type LiveState = { kind: 'loading' } | { kind: 'ready'; weather: LiveWeather } | { kind: 'error' };
const REFRESH_MS = 5 * 60 * 1000;

/** Live conditions for a point, refreshed every 5 minutes while the page is open. The reading is tied to its coordinates, so a stale reading is never shown for another place. */
export function useLiveWeather(point: { latitude: number; longitude: number } | null): LiveState {
  const [result, setResult] = useState<Result>();
  const latitude = point?.latitude; const longitude = point?.longitude;
  const key = latitude === undefined || longitude === undefined ? '' : `${latitude},${longitude}`;
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const load = () => fetch(`/api/weather?lat=${latitude}&lon=${longitude}`)
      .then((response) => response.json() as Promise<{ status: string; weather?: LiveWeather }>)
      .then((body) => { if (!cancelled) setResult({ key, ...(body.status === 'ok' && body.weather ? { weather: body.weather } : { failed: true }) }); })
      .catch(() => { if (!cancelled) setResult({ key, failed: true }); });
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [key, latitude, longitude]);
  if (!result || result.key !== key) return { kind: 'loading' };
  return result.weather ? { kind: 'ready', weather: result.weather } : { kind: 'error' };
}
