import { NextRequest, NextResponse } from 'next/server';
import { coordinatesSchema } from '@/lib/schema';
import { fetchMeteorologicalForecast } from '@/lib/climate/forecast';

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

/** Daily rainfall forecast only (Open-Meteo, 16 days), fetched on the server. A weather-model forecast, not a measurement. */
export async function GET(request: NextRequest) {
  if (limited(request)) return NextResponse.json({ status: 'error', code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' }, { status: 429 });
  const parsed = coordinatesSchema.safeParse({ latitude: Number(request.nextUrl.searchParams.get('lat')), longitude: Number(request.nextUrl.searchParams.get('lon')) });
  if (!parsed.success) return NextResponse.json({ status: 'error', code: 'INVALID_COORDINATES', message: 'Latitude and longitude must be valid numbers in global bounds.' }, { status: 400 });
  try {
    const forecast = await fetchMeteorologicalForecast(parsed.data);
    return NextResponse.json({ status: 'ok', issuedAt: forecast.issuedAt, days: forecast.days.map((day) => ({ date: day.date, precipitationMm: day.precipitationMm })), source: { name: 'Open-Meteo', url: 'https://open-meteo.com/', license: 'CC BY 4.0' } }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600' } });
  } catch {
    return NextResponse.json({ status: 'error', code: 'FORECAST_UNAVAILABLE', message: 'Rainfall forecast is unavailable right now.' }, { status: 503 });
  }
}
