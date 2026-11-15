import { NextRequest, NextResponse } from 'next/server';
import { municipalityAt, searchMunicipalities } from '@/lib/brazil/places';

export const runtime = 'nodejs';

/** City lookup over the versioned IBGE municipal mesh; nothing is sent to any outside service. */
export function GET(request: NextRequest) {
  // Reverse lookup: which municipality contains this point?
  if (request.nextUrl.searchParams.has('lat') && request.nextUrl.searchParams.has('lon')) {
    const latitude = Number(request.nextUrl.searchParams.get('lat'));
    const longitude = Number(request.nextUrl.searchParams.get('lon'));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return NextResponse.json({ status: 'error', code: 'INVALID_COORDINATES', message: 'Invalid latitude and longitude.' }, { status: 400 });
    return NextResponse.json({ status: 'ok', municipality: municipalityAt(latitude, longitude) ?? null }, { headers: { 'Cache-Control': 'public, max-age=86400' } });
  }
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (query.length < 2 || query.length > 80) return NextResponse.json({ status: 'error', code: 'INVALID_QUERY', message: 'Enter the city name (2 to 80 characters).' }, { status: 400 });
  const limit = Math.min(8, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 6));
  return NextResponse.json({ status: 'ok', results: searchMunicipalities(query, limit) }, { headers: { 'Cache-Control': 'public, max-age=86400' } });
}
