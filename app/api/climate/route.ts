import { NextRequest, NextResponse } from 'next/server';
import { coordinatesSchema } from '@/lib/schema';
import { ClimateDataError, fetchNasaPower, readVerifiedPilotFixture } from '@/lib/climate/nasa-power';
import { monthlyClimatology } from '@/lib/climate/indicators';

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
  try {
    const climate = await fetchNasaPower(parsed.data);
    return NextResponse.json({ status: 'ok', origin: 'live', climateSummary: { monthly: monthlyClimatology(climate.daily) }, provenance: climate.provenance, warnings: climate.provenance.warnings });
  } catch (error) {
    const fixture = await readVerifiedPilotFixture(parsed.data);
    if (fixture) return NextResponse.json({ status: 'ok', origin: 'verified_fixture', climateSummary: { monthly: monthlyClimatology(fixture.daily) }, provenance: fixture.provenance, warnings: ['Historical NASA cache. Capture date is shown in provenance.', ...fixture.provenance.warnings] });
    const code = error instanceof ClimateDataError ? error.code : 'NASA_REQUEST_FAILED';
    return NextResponse.json({ status: 'error', code, message: 'Historical NASA POWER data are currently unavailable. No compatible verified cache exists.' }, { status: 503 });
  }
}
