import { describe, expect, it } from 'vitest';
import { crops, isRecommendationEligible } from '@/lib/catalog';
import zarc from '@/data/rio-verde-zarc.json';
import scope from '@/data/s2-scope.json';

describe('crop scientific guards', () => {
  it('does not make a crop eligible when its evidence status is missing', () => {
    expect(crops.every((crop) => !isRecommendationEligible(crop))).toBe(true);
  });
  it('does not fabricate a Rio Verde ZARC window', () => {
    expect(zarc.windows).toHaveLength(6);
    expect(zarc.status).toBe('partially_verified_from_local_official_study');
  });
  it('limits S2 pilot candidates to crops with verified Rio Verde windows', () => {
    expect(scope.auditedPilotCandidates).toEqual(['soybean', 'maize', 'sunflower', 'sorghum']);
    expect(scope.displayOnly).toContain('ruziziensis');
    expect(scope.p0).toEqual(['soybean', 'maize', 'sorghum', 'sunflower', 'cowpea', 'ruziziensis']);
    expect(scope.excludedFromMvpRecommendations).toEqual(['pearl_millet', 'sunn_hemp']);
  });
});
