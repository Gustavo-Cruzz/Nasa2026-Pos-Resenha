import { NextRequest, NextResponse } from 'next/server';
import { coordinatesSchema } from '@/lib/schema';
import { buildOpenMeteoUrl, parseOpenMeteo } from '@/lib/weather/open-meteo';

export const runtime = 'nodejs';
const windows = new Map<string, { count: number; resetAt: number }>();

function limited(request: NextRequest): boolean {
  const key = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous';
  const now = Date.now();
  const window = windows.get(key);
  if (!window || window.resetAt < now) { windows.set(key, { count: 1, resetAt: now + 60_000 }); return false; }
  window.count += 1;
  return window.count > 30;
}

/** Live conditions through the server, so the browser never talks to the weather provider directly. */
export async function GET(request: NextRequest) {
  if (limited(request)) return NextResponse.json({ status: 'error', code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' }, { status: 429 });
  const parsed = coordinatesSchema.safeParse({ latitude: Number(request.nextUrl.searchParams.get('lat')), longitude: Number(request.nextUrl.searchParams.get('lon')) });
  if (!parsed.success) return NextResponse.json({ status: 'error', code: 'INVALID_COORDINATES', message: 'Latitude and longitude must be valid numbers in global bounds.' }, { status: 400 });
  try {
    const response = await fetch(buildOpenMeteoUrl(parsed.data.latitude, parsed.data.longitude), { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const weather = parseOpenMeteo(await response.json());
    if (!weather) return NextResponse.json({ status: 'error', code: 'WEATHER_RESPONSE_INVALID', message: 'Live weather response was not understood.' }, { status: 502 });
    return NextResponse.json({ status: 'ok', weather, source: { name: 'Open-Meteo', url: 'https://open-meteo.com/', license: 'CC BY 4.0' } }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300' } });
  } catch {
    return NextResponse.json({ status: 'error', code: 'WEATHER_REQUEST_FAILED', message: 'Live weather is unavailable right now.' }, { status: 503 });
  }
}
