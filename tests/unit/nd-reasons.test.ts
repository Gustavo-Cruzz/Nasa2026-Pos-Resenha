import { describe, expect, it } from 'vitest';
import { regionalNdReasons, soilHealthNdReason } from '@/lib/nd-reasons';
import type { AnalysisResult, Rotation, SoilHealthIndicator } from '@/lib/engine/types';

const indicator = (id: SoilHealthIndicator['id']): SoilHealthIndicator => ({ id, label: '', state: 'unknown', value: null, detail: '', sourceRefs: [], missingData: [] });
const rotation = (missing: string[]): Rotation => ({ bareSoil: { missing } } as Rotation);

describe('N/D reasons', () => {
  it('separates missing crop slots from missing start months and does not invent values', () => {
    expect(soilHealthNdReason(indicator('bare_soil_interval'), rotation(['unconfigured_lab_slots']), 'pt-BR')?.code).toBe('bare_slots_missing');
    expect(soilHealthNdReason(indicator('bare_soil_interval'), rotation(['safrinha_start_month']), 'pt-BR')?.code).toBe('bare_start_missing');
    expect(soilHealthNdReason(indicator('bare_soil_interval'), rotation(['safrinha_start_month']), 'pt-BR')?.action).toContain('Histórico da fazenda');
    expect(soilHealthNdReason(indicator('nitrogen_fixation_potential'), rotation([]), 'en')?.code).toBe('nitrogen_evidence_missing');
    expect(soilHealthNdReason({ ...indicator('nitrogen_fixation_potential'), state: 'yes' }, rotation([]), 'en')).toBeNull();
  });
  it('shows the recorded NDVI gap without interpreting absent ZARC as unsuitability', () => {
    const result = { climate: { ndviGapCode: 'insufficient_coverage' }, regionalContext: { municipality: { code: '5201108' }, zarc: null } } as AnalysisResult;
    const reasons = regionalNdReasons(result, 'pt-BR');
    expect(reasons.map((item) => item.code)).toEqual(['ndvi_insufficient_coverage', 'zarc_safra_missing']);
    expect(reasons[1]?.action).toContain('ausência não significa inaptidão');
  });
});
