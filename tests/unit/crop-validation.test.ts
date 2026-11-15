import { describe, expect, it } from 'vitest';
import { crops, isRecommendationEligible } from '@/lib/catalog';
import zarc from '@/data/rio-verde-zarc.json';
import scope from '@/data/s2-scope.json';

describe('crop scientific guards', () => {
  it('offers exactly eight P0 crops and preserves unknown scientific parameters', () => {
    const p0 = ['soybean', 'maize', 'sorghum', 'sunflower', 'cowpea', 'common_bean', 'upland_rice', 'ruziziensis'];
    expect(crops.filter((crop) => p0.includes(crop.id))).toHaveLength(8);
    expect(crops.find((item) => item.id === 'upland_rice')).toMatchObject({ cycleDaysRange: { min: 89, max: 115 }, idealTempC: null, viableTempC: { min: 10, max: 36 }, soilPhRange: { min: 5.5, max: 7 }, kcStages: null, parameterStatus: 'missing' });
    // Common bean gained verified ranges (Embrapa CPATSA and Embrapa Acre); viable temperature comes from FAO ECOCROP (absolute range); cycle comes from the ZARC groups (Embrapa/MAPA, Brazil).
    // FAO-56 cycle totals are not projected (product decision 15/11/2026: they mix climates).
    expect(crops.find((item) => item.id === 'common_bean')).toMatchObject({ cycleDaysRange: { min: 70, max: 80 }, viableTempC: { min: 7, max: 32 }, idealTempC: { min: 15, max: 27 }, soilPhRange: { min: 5.5, max: 6.5 }, parameterStatus: 'missing' });
  });
  it('does not make a crop eligible when its evidence status is missing', () => {
    expect(crops.every((crop) => !isRecommendationEligible(crop))).toBe(true);
  });
  it('retains the official 2026/2027 Rio Verde ZARC rows without relabelling risk codes', () => {
    expect(zarc.entries).toHaveLength(117);
    expect(zarc.status).toBe('verified_from_MAPA_2026_2027_csv_risk_codes_not_semantically_interpreted');
    expect(zarc.entries.every((entry) => entry.safra === '2026/2027' && entry.management === 'Sequeiro')).toBe(true);
    expect(zarc.entries.some((entry) => entry.cropId === 'cowpea')).toBe(true);
    expect(zarc.entries.every((entry) => !('riskPct' in entry))).toBe(true);
    expect(zarc.notCoveredAsStandaloneCrop).toEqual(['ruziziensis']);
  });
  it('limits S2 pilot candidates to crops with verified Rio Verde windows', () => {
    expect(scope.auditedPilotCandidates).toEqual(['soybean', 'maize', 'sunflower', 'sorghum']);
    expect(scope.displayOnly).toContain('ruziziensis');
    expect(scope.p0).toEqual(['soybean', 'maize', 'sorghum', 'sunflower', 'cowpea', 'common_bean', 'upland_rice', 'ruziziensis']);
    expect(scope.excludedFromMvpRecommendations).toEqual(['pearl_millet', 'sunn_hemp']);
  });
});
