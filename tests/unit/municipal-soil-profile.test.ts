import { describe, expect, it } from 'vitest';
import { resolveMunicipalSoilProfile } from '@/lib/soil/municipal-profile';
import artifact from '@/data/soil/brazil-municipal-soil-v1.json';

describe('preprocessed national municipal soil profile', () => {
  it('covers most IBGE municipalities with real SoilGrids values and preserves the remaining gaps', () => {
    expect(artifact.coverage).toEqual({ totalMunicipalities: 5571, completeMunicipalities: 5456 });
    expect(artifact.status).toBe('partial');
    expect(Object.keys(artifact.entries)).toHaveLength(5571);
  });

  it('returns the 0-30 cm regional estimate for Rio Verde without calling an online API', () => {
    const profile = resolveMunicipalSoilProfile({ latitude: -17.798, longitude: -50.919 });
    expect(profile).toMatchObject({ status: 'available', classification: 'estimated', municipality: { code: '5218805' }, depthCm: { min: 0, max: 30 }, resolutionM: 5000, textureClass: 'medium' });
    expect(profile.attributes.phh2o.value).toBeGreaterThan(0);
    expect(profile.attributes.wv0033.value).toBeGreaterThan(profile.attributes.wv1500.value!);
    expect(profile.limitations.join(' ')).toMatch(/not laboratory measurements/i);
  });

  it('does not borrow a neighbouring value outside Brazil or for a municipal no-data profile', () => {
    expect(resolveMunicipalSoilProfile({ latitude: 5.6037, longitude: -0.187 })).toMatchObject({ status: 'unavailable', municipality: null });
    expect(resolveMunicipalSoilProfile({ latitude: -23.5505, longitude: -46.6333 })).toMatchObject({ status: 'unavailable', municipality: { code: '3550308' } });
  });
});
