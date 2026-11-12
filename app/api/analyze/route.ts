import { NextRequest, NextResponse } from 'next/server';
import { analyze } from '@/lib/engine';
import { analysisInputSchema } from '@/lib/schema';
import { resolveClimateContext } from '@/lib/climate/nasa-power';
import { labPlanSchema } from '@/lib/lab';
import { z } from 'zod';
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const requestSchema = z.union([analysisInputSchema, z.object({ input: analysisInputSchema, labPlan: labPlanSchema.optional() })]);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join('; '));
    const input = 'input' in parsed.data ? parsed.data.input : parsed.data;
    const labPlan = 'input' in parsed.data ? parsed.data.labPlan : undefined;
    const climate = await resolveClimateContext(input.location, input.plantingMonth);
    return NextResponse.json(analyze(input, climate, labPlan));
  } catch (error) { return NextResponse.json({ status: 'error', code: 'INVALID_ANALYSIS_INPUT', message: error instanceof Error ? error.message : 'Invalid input.' }, { status: 422 }); }
}
