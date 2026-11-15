import { describe, expect, it } from 'vitest';
import { analyze } from '@/lib/engine';
import { resolveBrazilRegionalContext } from '@/lib/brazil/context';
import type { ClimateContext } from '@/lib/climate/nasa-power';

const historical: ClimateContext = { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [], provenance: null, gaps: ['NASA unavailable'] };
const crops = { availableCropIds: ['soybean', 'maize', 'sorghum'], exploreCropIds: [], blockedCropIds: [], customCrops: [] };
const rio = { location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 4, history: [{ cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' }, { cropId: 'maize', startYearMonth: '2023-07', endYearMonth: '2023-12' }], priorities: { water: 3, soil: 10, operations: 3 }, irrigation: 'irrigated' as const, farmerCrops: crops };

describe('Farmer-first acceptance scenarios', () => {
  it('handles Rio Verde soybean/maize with laboratory soil and irrigation', () => {
    const result = analyze({ ...rio, soil: { origin: 'farmer_lab' as const, ph: 6.1, organicCarbonGKg: 18, depthCm: 20 } }, historical, undefined, resolveBrazilRegionalContext(rio.location));
    expect(result.strategies).toHaveLength(3);
    expect(result.dataQuality.find((item) => item.id === 'farmer_soil')?.classification).toBe('measured');
    expect(result.strategies[1].soilHealth.find((item) => item.id === 'organic_carbon_context')?.value).toBe(18);
  });
  it('changes contextual highlights for the same crops when rainfed water protection is primary', () => {
    const result = analyze({ ...rio, irrigation: 'rainfed', priorities: { water: 10, soil: 3, operations: 3 } }, historical, undefined, resolveBrazilRegionalContext(rio.location));
    expect(result.priorityHighlights[0]).toBe('root_zone_wetness');
    expect(result.strategies.map((strategy) => strategy.configuredSlots)).toEqual([4, 4, 4]);
  });
  it('keeps global exploration without ZARC for catalogued crops outside Brazil', () => {
    const result = analyze({ ...rio, location: { latitude: 5.6037, longitude: -0.187 } }, historical);
    expect(result.regionalContext.municipality).toBeNull();
    expect(result.strategies.every((strategy) => strategy.validationLevel === 'climate_exploration')).toBe(true);
    expect(result.dataQuality.find((item) => item.id === 'rotation_hypotheses')?.classification).toBe('scenario');
  });
  it('retains a custom crop and unknown SoilGrids context without fabricating a regional estimate', () => {
    const result = analyze({ ...rio, farmerCrops: { availableCropIds: ['soybean'], exploreCropIds: [], blockedCropIds: [], customCrops: [{ label: 'mandioca', purpose: 'grain' }] }, irrigation: 'unknown' }, historical);
    expect(result.input.farmerCrops?.customCrops[0]?.label).toBe('mandioca');
    expect(result.dataQuality.find((item) => item.id === 'farmer_soil')?.classification).toBe('unknown');
    expect(result.strategies[1].slots[1]?.cropId).toBeNull();
  });
});
