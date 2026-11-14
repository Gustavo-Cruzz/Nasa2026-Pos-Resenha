import { NextRequest, NextResponse } from 'next/server';
import { coordinatesSchema } from '@/lib/schema';
import { resolveClimateContext } from '@/lib/climate/nasa-power';

export const runtime = 'nodejs';
const requestWindows = new Map<string, { count: number; resetAt: number }>();

function limited(request: NextRequest): boolean {
  const key = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous';
  const now = Date.now();
  const window = requestWindows.get(key);
  if (!window || window.resetAt < now) { requestWindows.set(key, { count: 1, resetAt: now + 60_000 }); return false; }
  window.count += 1;
  return window.count > 30;
}

export async function GET(request: NextRequest) {
  if (limited(request)) return NextResponse.json({ status: 'error', code: 'RATE_LIMITED', message: 'Too many climate requests. Try again shortly.' }, { status: 429 });
  const parsed = coordinatesSchema.safeParse({ latitude: Number(request.nextUrl.searchParams.get('lat')), longitude: Number(request.nextUrl.searchParams.get('lon')) });
  if (!parsed.success) return NextResponse.json({ status: 'error', code: 'INVALID_COORDINATES', message: 'Latitude and longitude must be valid numbers in global bounds.' }, { status: 400 });
  const month = Number(request.nextUrl.searchParams.get('month')) || 1;
  const day = Number(request.nextUrl.searchParams.get('day')) || undefined;
  const validDay = day === undefined || (Number.isInteger(day) && day >= 1 && new Date(Date.UTC(2000, month - 1, day)).getUTCMonth() === month - 1);
  if (!Number.isInteger(month) || month < 1 || month > 12 || !validDay) return NextResponse.json({ status: 'error', code: 'INVALID_CALENDAR_DAY', message: 'Month and day must form a valid calendar window.' }, { status: 400 });
  const climate = await resolveClimateContext(parsed.data, month, day);
  if (climate.status === 'unavailable') return NextResponse.json({ status: 'error', code: 'NASA_REQUEST_FAILED', message: climate.gaps[0] }, { status: 503 });
  return NextResponse.json({ status: 'ok', origin: climate.origin, climateSummary: { monthly: climate.monthly, plantingMonthPrecipitation: climate.plantingMonthPrecipitation, historicalPrecipitationByMonth: climate.historicalPrecipitationByMonth, waterContext: climate.waterContext, calendarDayContext: climate.calendarDayContext }, provenance: climate.provenance, warnings: climate.gaps });
}
