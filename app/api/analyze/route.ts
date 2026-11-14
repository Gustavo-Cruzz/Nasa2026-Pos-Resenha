import { NextRequest, NextResponse } from 'next/server';
import { analyze } from '@/lib/engine';
import { analysisInputSchema } from '@/lib/schema';
import { resolveClimateContext } from '@/lib/climate/nasa-power';
import { labPlanSchema } from '@/lib/lab';
import { resolveBrazilRegionalContext } from '@/lib/brazil/context';
import { fetchTerrain } from '@/lib/terrain/srtm';
import { buildSourceHealth } from '@/lib/source-health';
import { z } from 'zod';
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const requestSchema = z.union([analysisInputSchema, z.object({ input: analysisInputSchema, labPlan: labPlanSchema.optional() })]);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join('; '));
    const input = 'input' in parsed.data ? parsed.data.input : parsed.data;
    const labPlan = 'input' in parsed.data ? parsed.data.labPlan : undefined;
    const [climate, regionalContext, terrain] = await Promise.all([resolveClimateContext(input.location, input.plantingMonth), Promise.resolve(resolveBrazilRegionalContext(input.location)), fetchTerrain(input.location, input.fieldBoundary)]);
    const result = analyze(input, climate, labPlan, regionalContext);
    return NextResponse.json({ ...result, terrain, evidenceManifest: { ...result.evidenceManifest, sourceHealth: buildSourceHealth({ ...result, terrain }) } });
  } catch (error) { return NextResponse.json({ status: 'error', code: 'INVALID_ANALYSIS_INPUT', message: error instanceof Error ? error.message : 'Invalid input.' }, { status: 422 }); }
}
