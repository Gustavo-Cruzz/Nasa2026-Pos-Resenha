import { describe, expect, it } from 'vitest';
import { analyze } from '@/lib/engine';
import { analysisInputSchema, type AnalysisInput } from '@/lib/schema';
import { buildAnalysisSummary } from '@/lib/export-summary';
import type { ClimateContext } from '@/lib/climate/nasa-power';

const input: AnalysisInput = { location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 4, history: [{ cropId: 'soybean', startYearMonth: '2026-01', endYearMonth: '2026-12' }], priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown' };
const unavailable: ClimateContext = { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [], provenance: null, gaps: [] };
const strip = (result: ReturnType<typeof analyze>) => JSON.stringify({ ...result, input: undefined });

describe('soil observation reported by the producer', () => {
  it('validates the kinds and the note length', () => {
    expect(analysisInputSchema.safeParse({ ...input, soilObservation: { kinds: ['waterlogging', 'compaction'], note: 'empoça depois da chuva' } }).success).toBe(true);
    expect(analysisInputSchema.safeParse({ ...input, soilObservation: { kinds: ['ghosts'] } }).success).toBe(false);
    expect(analysisInputSchema.safeParse({ ...input, soilObservation: { kinds: [] } }).success).toBe(false);
    expect(analysisInputSchema.safeParse({ ...input, soilObservation: { kinds: ['other'], note: 'x'.repeat(201) } }).success).toBe(false);
  });
  it('does not change crops, evidence, indicators or NASA readings', () => {
    const base = analyze(input, unavailable);
    const withSoil = analyze({ ...input, soilObservation: { kinds: ['erosion'], note: 'sulcos' } }, unavailable);
    expect(strip(withSoil)).toBe(strip(base));
    expect(withSoil.input.soilObservation).toEqual({ kinds: ['erosion'], note: 'sulcos' });
  });
  it('is repeated in the export as declared context, and absent when nothing was reported', () => {
    const md = buildAnalysisSummary(analyze({ ...input, soilObservation: { kinds: ['waterlogging'], note: 'Água empoçada' } }, unavailable), 'pt-BR');
    expect(md).toContain('Observação do produtor sobre o solo: água empoçada');
    expect(md).toContain('não usado em nenhuma leitura');
    expect(buildAnalysisSummary(analyze(input, unavailable), 'pt-BR')).not.toContain('Observação do produtor sobre o solo');
    expect(buildAnalysisSummary(analyze({ ...input, soilObservation: { kinds: ['compaction'] } }, unavailable), 'en')).toContain('Soil observation reported by the producer: hard or compacted soil');
  });
});
