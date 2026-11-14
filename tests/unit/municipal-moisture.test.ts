import { describe, expect, it } from 'vitest';
import artifact from '@/data/soil/brazil-municipal-moisture-v1.json';
import { resolveMunicipalMoisture } from '@/lib/soil/municipal-moisture';

describe('preprocessed NASA municipal root-zone wetness', () => {
  it('contains a complete national lookup and dated monthly values', () => {
    expect(artifact.coverage).toEqual({ totalMunicipalities: 5571, available: 5571 });
    expect(Object.keys(artifact.entries)).toHaveLength(5571);
    expect(artifact.parameter).toBe('GWETROOT');
  });

  it('returns climatology and a dated, bounded relative index for Rio Verde', () => {
    const context = resolveMunicipalMoisture({ latitude: -17.798, longitude: -50.919 });
    expect(context).toMatchObject({ status: 'available', classification: 'observed_modelled', municipality: { code: '5218805' }, unit: '1' });
    expect(context.monthlyClimatology).toHaveLength(12);
    expect(context.monthlyClimatology.every((value) => value !== null && value >= 0 && value <= 1)).toBe(true);
    expect(context.latest?.period).toMatch(/^2026\d{2}$/);
    expect(context.latest?.percentile).toBeGreaterThanOrEqual(0);
    expect(context.limitations.join(' ')).toMatch(/not volumetric field moisture/i);
  });

  it('keeps outside-Brazil moisture unavailable', () => {
    expect(resolveMunicipalMoisture({ latitude: 5.6037, longitude: -0.187 })).toMatchObject({ status: 'unavailable', municipality: null, latest: null });
  });
});
