import { describe, expect, it } from 'vitest';
import { analyze } from '@/lib/engine';
import { changeLabSlot, createLabPlan } from '@/lib/lab';
import { resolveBrazilRegionalContext } from '@/lib/brazil/context';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import type { AnalysisInput } from '@/lib/schema';

const input: AnalysisInput = { location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 4, history: [{ cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' }, { cropId: 'maize', startYearMonth: '2023-07', endYearMonth: '2023-12' }, { cropId: 'soybean', startYearMonth: '2024-01', endYearMonth: '2024-06' }], priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown' };
const climate: ClimateContext = { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [], provenance: null, gaps: ['NASA down'] };

describe('evidence manifest', () => {
  it('deduplicates sources and traces supported claims while keeping local validation unavailable', () => {
    const plan = changeLabSlot(createLabPlan(input, ['soybean', 'sorghum', 'cowpea']), 'A', 1, 'ruziziensis');
    const result = analyze(input, climate, plan, resolveBrazilRegionalContext(input.location));
    const urls = result.evidenceManifest.sources.flatMap((source) => source.url ? [source.url] : []);
    expect(new Set(urls).size).toBe(urls.length);
    expect(result.evidenceManifest.sources.some((source) => source.kind === 'nasa' && source.status === 'unavailable')).toBe(true);
    expect(result.evidenceManifest.sources.some((source) => source.kind === 'regional')).toBe(true);
    expect(result.evidenceManifest.claims.filter((claim) => claim.status === 'supported').every((claim) => claim.sourceIds.length > 0)).toBe(true);
    expect(result.evidenceManifest.gaps.some((gap) => gap.id === 'unconfigured_lab_slots')).toBe(true);
    expect(result.evidenceManifest.guardrails).toContain('Contexto municipal não é validação do talhão.');
    expect(result.evidenceManifest.claims.filter((claim) => claim.scenarioId === 'A' && claim.slotIndex === 1).every((claim) => claim.validationLevel === 'climate_exploration')).toBe(true);
    expect(JSON.stringify(result.evidenceManifest)).not.toContain('locally_validated');
  });
});
