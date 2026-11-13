import { NextRequest, NextResponse } from 'next/server';
import { coordinatesSchema } from '@/lib/schema';
import { resolveBrazilRegionalContext } from '@/lib/brazil/context';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const latitude = request.nextUrl.searchParams.get('lat');
  const longitude = request.nextUrl.searchParams.get('lon');
  const parsed = coordinatesSchema.safeParse({ latitude: latitude === null || latitude.trim() === '' ? Number.NaN : Number(latitude), longitude: longitude === null || longitude.trim() === '' ? Number.NaN : Number(longitude) });
  if (!parsed.success) return NextResponse.json({ status: 'error', code: 'INVALID_COORDINATES', message: 'Latitude e longitude devem estar dentro dos limites globais.' }, { status: 400 });
  return NextResponse.json({ status: 'ok', context: resolveBrazilRegionalContext(parsed.data) }, { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' } });
}
