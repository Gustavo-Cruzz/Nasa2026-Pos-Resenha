import { describe, expect, it, vi } from 'vitest';
import type { ClimateContext } from '@/lib/climate/nasa-power';

const mocks = vi.hoisted(() => ({ resolveClimateContext: vi.fn(), resolveBrazilRegionalContext: vi.fn(), resolveRegionalSoilAnalysis: vi.fn() }));
const unavailableClimate: ClimateContext = { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [], provenance: null, gaps: ['NASA_POWER unavailable for this coordinate.'] };
vi.mock('@/lib/climate/nasa-power', () => ({ resolveClimateContext: mocks.resolveClimateContext }));
vi.mock('@/lib/brazil/context', () => ({ resolveBrazilRegionalContext: mocks.resolveBrazilRegionalContext }));
vi.mock('@/lib/soil/regional-analysis', () => ({ resolveRegionalSoilAnalysis: mocks.resolveRegionalSoilAnalysis }));
import { POST } from '@/app/api/analyze/route';

const valid = { location: { latitude: 0, longitude: 0 }, plantingMonth: 7, history: [{ cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' }, { cropId: 'maize', startYearMonth: '2023-07', endYearMonth: '2023-12' }, { cropId: 'soybean', startYearMonth: '2024-01', endYearMonth: '2024-06' }], priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown' };
describe('POST /api/analyze', () => {
  it('preserves three global scenarios when NASA climate is unavailable', async () => {
    mocks.resolveClimateContext.mockResolvedValue(unavailableClimate);
    mocks.resolveBrazilRegionalContext.mockReturnValue({ country: null, municipality: null, municipalitySource: null, zarc: null, pam: null, gaps: ['Outside Brazil'] });
    mocks.resolveRegionalSoilAnalysis.mockReturnValue({ status: 'unavailable', municipality: null, staticProfile: { status: 'unavailable' }, moistureSnapshot: { status: 'unavailable' }, limitations: [] });
    const response = await POST(new Request('http://localhost/api/analyze', { method: 'POST', body: JSON.stringify(valid) }) as never);
    const body = await response.json() as { strategies: unknown[]; climate: ClimateContext; nasaInsight: { status: string }; nasaInsightByMonth: unknown[]; soilContext: { status: string } };
    expect(response.status).toBe(200);
    expect(body.strategies).toHaveLength(3);
    expect(body.climate.status).toBe('unavailable');
    expect(body.nasaInsight.status).toBe('unknown');
    expect(body.nasaInsightByMonth).toHaveLength(12);
    expect(body.soilContext.status).toBe('unavailable');
    expect(JSON.stringify(body)).not.toMatch(/"score"|"yield"|"etc"|"irrigationNeed"/i);
    expect(JSON.stringify(body)).not.toContain('locally_validated');
    expect(mocks.resolveClimateContext).toHaveBeenCalledWith(valid.location, 7, undefined, undefined); // outside the IBGE mesh: no municipality code, so no municipal NDVI
    expect(mocks.resolveBrazilRegionalContext).toHaveBeenCalledWith(valid.location);
  });
  it('passes the municipal SoilGrids estimate to the engine as separate regional soil without touching the farmer input', async () => {
    mocks.resolveClimateContext.mockResolvedValue(unavailableClimate);
    mocks.resolveBrazilRegionalContext.mockReturnValue({ country: null, municipality: null, municipalitySource: null, zarc: null, pam: null, gaps: [] });
    const attr = (value: number, unit: string) => ({ value, unit });
    mocks.resolveRegionalSoilAnalysis.mockReturnValue({ status: 'available', municipality: null, staticProfile: { status: 'available', attributes: { phh2o: attr(5.2, 'pH'), soc: attr(14.5, 'g/kg'), sand: attr(30, '%'), silt: attr(20, '%'), clay: attr(50, '%'), cec: attr(10, 'x'), bdod: attr(1, 'x'), wv0033: attr(1, '%'), wv1500: attr(1, '%') } }, moistureSnapshot: { status: 'unavailable' }, limitations: [] });
    const response = await POST(new Request('http://localhost/api/analyze', { method: 'POST', body: JSON.stringify(valid) }) as never);
    const body = await response.json() as { input: { soil?: unknown }; strategies: Array<{ indicators: Array<{ id: string; origin?: string; detail: string }> }>; dataQuality: Array<{ id: string; classification: string }> };
    expect(response.status).toBe(200);
    expect(body.input.soil).toBeUndefined();
    const soil = body.strategies[0].indicators.find((item) => item.id === 'soil_context');
    expect(soil?.origin).toBe('regional_estimate'); expect(soil?.detail).toContain('pH regional 5,2');
    expect(body.dataQuality.find((item) => item.id === 'regional_soil')?.classification).toBe('estimated');
  });
  it('does not inject regional soil when the farmer supplied a soil analysis', async () => {
    mocks.resolveClimateContext.mockResolvedValue(unavailableClimate);
    const response = await POST(new Request('http://localhost/api/analyze', { method: 'POST', body: JSON.stringify({ ...valid, soil: { origin: 'farmer_lab', ph: 6.3 } }) }) as never);
    const body = await response.json() as { strategies: Array<{ indicators: Array<{ id: string; origin?: string }> }> };
    expect(body.strategies[0].indicators.find((item) => item.id === 'soil_context')?.origin).toBe('farmer');
  });
  it('returns 422 before resolving climate for invalid input', async () => {
    mocks.resolveClimateContext.mockClear();
    mocks.resolveBrazilRegionalContext.mockClear();
    const response = await POST(new Request('http://localhost/api/analyze', { method: 'POST', body: JSON.stringify({}) }) as never);
    expect(response.status).toBe(422);
    expect(mocks.resolveClimateContext).not.toHaveBeenCalled();
    expect(mocks.resolveBrazilRegionalContext).not.toHaveBeenCalled();
  });
});
