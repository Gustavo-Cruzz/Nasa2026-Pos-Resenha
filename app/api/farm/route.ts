import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db/connection';
import { getFarm, saveFarm } from '@/lib/db/farms';
import { farmPayloadSchema } from '@/lib/farm/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const unauthorized = () => NextResponse.json({ status: 'error', code: 'NOT_SIGNED_IN', message: 'Entre para ver a sua fazenda.' }, { status: 401 });

/** The signed-in user's farm (or null when none is registered yet). */
export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  return NextResponse.json({ status: 'ok', farm: getFarm(getDb(), user.id) });
}

/** Registers the signed-in user's farm, or updates it. */
export async function PUT(request: NextRequest) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const body: unknown = await request.json().catch(() => null);
  const parsed = farmPayloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ status: 'error', code: 'INVALID_FARM', message: parsed.error.issues[0]?.message ?? 'Dados da fazenda inválidos.' }, { status: 422 });
  return NextResponse.json({ status: 'ok', farm: saveFarm(getDb(), user.id, parsed.data) });
}
