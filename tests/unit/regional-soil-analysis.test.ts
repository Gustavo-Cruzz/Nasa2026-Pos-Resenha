import { describe, expect, it } from 'vitest';
import { resolveRegionalSoilAnalysis } from '@/lib/soil/regional-analysis';

describe('unified preprocessed soil analysis contract', () => {
  it('combines static SoilGrids and NASA moisture for one IBGE municipality', () => {
    const context = resolveRegionalSoilAnalysis({ latitude: -17.798, longitude: -50.919 });
    expect(context).toMatchObject({ status: 'available', municipality: { code: '5218805' }, staticProfile: { status: 'available' }, moistureSnapshot: { status: 'available' } });
    expect(context.staticProfile.municipality?.code).toBe(context.moistureSnapshot.municipality?.code);
  });

  it('is partial when moisture exists but the static profile is no-data', () => {
    const context = resolveRegionalSoilAnalysis({ latitude: -23.5505, longitude: -46.6333 });
    expect(context).toMatchObject({ status: 'partial', municipality: { code: '3550308' }, staticProfile: { status: 'unavailable' }, moistureSnapshot: { status: 'available' } });
  });

  it('is unavailable outside Brazil', () => {
    expect(resolveRegionalSoilAnalysis({ latitude: 5.6037, longitude: -0.187 })).toMatchObject({ status: 'unavailable', municipality: null });
  });
});
