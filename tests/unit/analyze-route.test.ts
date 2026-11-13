import { describe, expect, it, vi } from 'vitest';
import type { ClimateContext } from '@/lib/climate/nasa-power';

const mocks = vi.hoisted(() => ({ resolveClimateContext: vi.fn(), resolveBrazilRegionalContext: vi.fn() }));
const unavailableClimate: ClimateContext = { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, provenance: null, gaps: ['NASA_POWER unavailable for this coordinate.'] };
vi.mock('@/lib/climate/nasa-power', () => ({ resolveClimateContext: mocks.resolveClimateContext }));
vi.mock('@/lib/brazil/context', () => ({ resolveBrazilRegionalContext: mocks.resolveBrazilRegionalContext }));
import { POST } from '@/app/api/analyze/route';

const valid = { location: { latitude: 0, longitude: 0 }, plantingMonth: 7, history: [{ cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' }, { cropId: 'maize', startYearMonth: '2023-07', endYearMonth: '2023-12' }, { cropId: 'soybean', startYearMonth: '2024-01', endYearMonth: '2024-06' }], priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown' };
describe('POST /api/analyze', () => {
  it('preserves three global scenarios when NASA climate is unavailable', async () => {
    mocks.resolveClimateContext.mockResolvedValue(unavailableClimate);
    mocks.resolveBrazilRegionalContext.mockReturnValue({ country: null, municipality: null, municipalitySource: null, zarc: null, gaps: ['Outside Brazil'] });
    const response = await POST(new Request('http://localhost/api/analyze', { method: 'POST', body: JSON.stringify(valid) }) as never);
    const body = await response.json() as { strategies: unknown[]; climate: ClimateContext };
    expect(response.status).toBe(200);
    expect(body.strategies).toHaveLength(3);
    expect(body.climate.status).toBe('unavailable');
    expect(JSON.stringify(body)).not.toMatch(/"score"|"yield"|"etc"|"irrigationNeed"/i);
    expect(JSON.stringify(body)).not.toContain('locally_validated');
    expect(mocks.resolveClimateContext).toHaveBeenCalledWith(valid.location, 7);
    expect(mocks.resolveBrazilRegionalContext).toHaveBeenCalledWith(valid.location);
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
