import { describe, expect, it } from 'vitest';
import { evidenceCoverageAssessment, p0CropCoverage } from '@/lib/evidence-coverage';
import { RIO_VERDE_PILOT } from '@/lib/region';
import { resolveBrazilRegionalContext } from '@/lib/brazil/context';

describe('evidence coverage assessment', () => {
  it('returns exactly the eight P0 cards', () => expect(p0CropCoverage(null).map((item) => item.crop.id)).toEqual(['soybean', 'maize', 'sorghum', 'sunflower', 'cowpea', 'common_bean', 'upland_rice', 'ruziziensis']));
  it('keeps a non-pilot coordinate insufficient instead of inferring local suitability', () => {
    const coverage = evidenceCoverageAssessment({ latitude: 5.6037, longitude: -0.187 }, 'soybean');
    expect(coverage.status).toBe('insufficient_evidence');
    expect(coverage.warnings[0]).toMatch(/não há contexto regional/i);
  });
  it('marks matching Rio Verde ZARC only as partial regional context', () => {
    const context = resolveBrazilRegionalContext(RIO_VERDE_PILOT.coordinates);
    const coverage = evidenceCoverageAssessment(RIO_VERDE_PILOT.coordinates, 'soybean', context);
    expect(coverage.status).toBe('partial');
    expect(coverage.warnings[0]).toMatch(/códigos brutos/);
  });
  it('uses municipal context beyond the exact pilot coordinate', () => {
    const location = { latitude: -23.5505, longitude: -46.6333 };
    const context = resolveBrazilRegionalContext(location);
    const coverage = evidenceCoverageAssessment(location, 'maize', context);
    expect(context.municipality).toEqual({ code: '3550308', name: 'São Paulo', uf: 'SP' });
    expect(coverage.status).toBe('partial');
  });
  it('does not convert missing values into zero', () => {
    const coverage = evidenceCoverageAssessment({ latitude: 28.6139, longitude: 77.209 }, 'cassava');
    expect(coverage.indicators.find((item) => item.id === 'temperature')?.value).toBeNull();
  });
});
