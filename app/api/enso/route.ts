import { NextResponse } from 'next/server';
import { fetchEnsoState } from '@/lib/climate/enso';

export const runtime = 'nodejs';

/** Current El Niño / La Niña state from NOAA CPC's Relative Oceanic Niño Index. Global context, not a local forecast. */
export async function GET() {
  try {
    const state = await fetchEnsoState();
    if (!state) return NextResponse.json({ status: 'error', code: 'ENSO_EMPTY', message: 'The ENSO index table had no readable values.' }, { status: 502 });
    return NextResponse.json({ status: 'ok', state }, { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' } });
  } catch {
    return NextResponse.json({ status: 'error', code: 'ENSO_UNAVAILABLE', message: 'The ENSO index is unavailable right now.' }, { status: 503 });
  }
}
