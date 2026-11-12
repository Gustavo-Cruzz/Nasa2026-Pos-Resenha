import { NextRequest, NextResponse } from 'next/server';
import { analyze } from '@/lib/engine';
import { analysisInputSchema } from '@/lib/schema';
import { resolveClimateContext } from '@/lib/climate/nasa-power';
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = analysisInputSchema.safeParse(body);
    if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join('; '));
    const climate = await resolveClimateContext(parsed.data.location, parsed.data.plantingMonth);
    return NextResponse.json(analyze(parsed.data, climate));
  } catch (error) { return NextResponse.json({ status: 'error', code: 'INVALID_ANALYSIS_INPUT', message: error instanceof Error ? error.message : 'Invalid input.' }, { status: 422 }); }
}
