import { NextRequest, NextResponse } from 'next/server';
import { analyze } from '@/lib/engine';
import { analysisInputSchema, type SoilProfile } from '@/lib/schema';
import { resolveClimateContext } from '@/lib/climate/nasa-power';
import { labPlanSchema } from '@/lib/lab';
import { resolveBrazilRegionalContext } from '@/lib/brazil/context';
import { fetchTerrain } from '@/lib/terrain/srtm';
import { buildSourceHealth } from '@/lib/source-health';
import { z } from 'zod';
import { resolveRegionalSoilAnalysis, type RegionalSoilAnalysis } from '@/lib/soil/regional-analysis';

/** Municipal SoilGrids estimate as a separate engine parameter; never merged into the farmer-declared input. */
function regionalSoilProfile(soilContext: RegionalSoilAnalysis): SoilProfile | undefined {
  const profile = soilContext.staticProfile; if (profile.status !== 'available') return undefined;
  const { phh2o, soc, sand, silt, clay } = profile.attributes;
  return { origin: 'regional_estimate', depthCm: 30, ...(phh2o.value !== null ? { ph: phh2o.value } : {}), ...(soc.value !== null ? { organicCarbonGKg: soc.value } : {}), ...(sand.value !== null && silt.value !== null && clay.value !== null ? { sandPct: sand.value, siltPct: silt.value, clayPct: clay.value } : {}) };
}
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const requestSchema = z.union([analysisInputSchema, z.object({ input: analysisInputSchema, labPlan: labPlanSchema.optional() })]);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join('; '));
    const input = 'input' in parsed.data ? parsed.data.input : parsed.data;
    const labPlan = 'input' in parsed.data ? parsed.data.labPlan : undefined;
    const [climate, regionalContext, terrain, soilContext] = await Promise.all([resolveClimateContext(input.location, input.plantingMonth), Promise.resolve(resolveBrazilRegionalContext(input.location)), fetchTerrain(input.location, input.fieldBoundary), Promise.resolve(resolveRegionalSoilAnalysis(input.location))]);
    const regionalSoil = input.soil ? undefined : regionalSoilProfile(soilContext);
    const result = analyze(input, climate, labPlan, regionalContext, { regionalSoil, terrain });
    return NextResponse.json({ ...result, terrain, soilContext, evidenceManifest: { ...result.evidenceManifest, sourceHealth: buildSourceHealth({ ...result, terrain }) } });
  } catch (error) { return NextResponse.json({ status: 'error', code: 'INVALID_ANALYSIS_INPUT', message: error instanceof Error ? error.message : 'Invalid input.' }, { status: 422 }); }
}
