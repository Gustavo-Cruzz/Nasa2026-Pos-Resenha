import { describe, expect, it } from 'vitest';
import { evidenceCoverageAssessment, p0CropCoverage } from '@/lib/evidence-coverage';
import { RIO_VERDE_PILOT } from '@/lib/region';

describe('evidence coverage assessment', () => {
  it('returns exactly the six P0 cards', () => expect(p0CropCoverage(null).map((item) => item.crop.id)).toEqual(['soybean', 'maize', 'sorghum', 'sunflower', 'cowpea', 'ruziziensis']));
  it('keeps a non-pilot coordinate insufficient instead of inferring local suitability', () => {
    const coverage = evidenceCoverageAssessment({ latitude: 5.6037, longitude: -0.187 }, 'soybean');
    expect(coverage.status).toBe('insufficient_evidence');
    expect(coverage.warnings[0]).toMatch(/Não há calendário/);
  });
  it('marks matching Rio Verde ZARC only as partial regional context', () => {
    const coverage = evidenceCoverageAssessment(RIO_VERDE_PILOT.coordinates, 'soybean');
    expect(coverage.status).toBe('partial');
    expect(coverage.warnings[0]).toMatch(/códigos brutos/);
  });
  it('does not convert missing values into zero', () => {
    const coverage = evidenceCoverageAssessment({ latitude: 28.6139, longitude: 77.209 }, 'ruziziensis');
    expect(coverage.indicators.find((item) => item.id === 'temperature')?.value).toBeNull();
  });
});
