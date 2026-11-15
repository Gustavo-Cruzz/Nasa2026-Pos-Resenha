import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { fallbackFarmExplanation, farmExplanationContextSchema, farmExplanationSchema } from '@/lib/gemini/farm-explanation';
import { POST } from '@/app/api/explain-farm/route';

const context = farmExplanationContextSchema.parse({
  location: { municipality: 'Rio Verde', uf: 'GO', latitude: -17.7923, longitude: -50.9192 }, plantingMonth: 11,
  history: [{ crop: 'soybean', period: '2025-01–2025-05' }],
  climate: { status: 'available', period: '20110101–20251231', monthly: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, rainMm: index === 6 ? null : 100, temperatureC: 24 })), rainySeasonMonths: [10, 11, 12, 1, 2, 3], waterBalanceMm: [20, 10, 5, 0, -5, -20, -30, -25, -5, 10, 20, 25] },
  soil: { status: 'partial', ph: null, organicCarbonGKg: null, sandPct: null, siltPct: null, clayPct: null, farmerObservations: [] },
  terrain: { status: 'unavailable', meanSlopePct: null, maxSlopePct: null, hotspotSharePct: null },
  strategies: ['A', 'B', 'C'].map((id) => ({ id, title: `Cenário ${id}`, crop: null, baseline: id === 'A', baselineAssumed: id === 'A', indicators: [], missingData: ['eligible_crop'] })), warnings: [],
});

describe('farm explanation contract', () => {
  it('keeps six concise sections and preserves unknown values', () => {
    const result = fallbackFarmExplanation(context);
    expect(farmExplanationSchema.parse(result).sections).toHaveLength(6);
    expect(result.sections.find((item) => item.id === 'soil')?.summary).toContain('Não há valores suficientes');
    expect(result.sections.find((item) => item.id === 'water')?.summary).toContain('5 de 12 meses');
  });

  it('rejects duplicated output that omits a required section', () => {
    const result = fallbackFarmExplanation(context);
    result.sections[5] = { ...result.sections[0] };
    expect(farmExplanationSchema.safeParse(result).success).toBe(false);
  });

  it('returns the validated safe fallback when the server key is absent', async () => {
    const previous = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const response = await POST(new NextRequest('http://localhost/api/explain-farm', { method: 'POST', body: JSON.stringify({ context }), headers: { 'content-type': 'application/json' } }));
      const body = await response.json() as { origin: string; sections: unknown[] };
      expect(response.status).toBe(200);
      expect(body.origin).toBe('fallback');
      expect(body.sections).toHaveLength(6);
    } finally {
      if (previous === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous;
    }
  });
});
