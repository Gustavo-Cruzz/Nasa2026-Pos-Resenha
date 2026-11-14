import { NextRequest, NextResponse } from 'next/server';
import { searchMunicipalities } from '@/lib/brazil/places';

export const runtime = 'nodejs';

/** City lookup over the versioned IBGE municipal mesh; nothing is sent to any outside service. */
export function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (query.length < 2 || query.length > 80) return NextResponse.json({ status: 'error', code: 'INVALID_QUERY', message: 'Informe o nome da cidade (2 a 80 caracteres).' }, { status: 400 });
  const limit = Math.min(8, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 6));
  return NextResponse.json({ status: 'ok', results: searchMunicipalities(query, limit) }, { headers: { 'Cache-Control': 'public, max-age=86400' } });
}
