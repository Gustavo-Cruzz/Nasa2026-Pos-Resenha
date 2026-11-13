import { describe, expect, it } from 'vitest';
import { analyze } from '@/lib/engine';
import { buildAnalysisSummary } from '@/lib/export-summary';
import type { ClimateContext } from '@/lib/climate/nasa-power';

const climate: ClimateContext = { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [], provenance: null, gaps: ['NASA down'] };
const input = { location: { latitude: 0, longitude: 0 }, plantingMonth: 4, history: [{ cropId: 'soybean' as const, startYearMonth: '2023-01', endYearMonth: '2023-06' }, { cropId: 'maize' as const, startYearMonth: '2023-07', endYearMonth: '2023-12' }, { cropId: 'soybean' as const, startYearMonth: '2024-01', endYearMonth: '2024-06' }], priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown' as const };

describe('analysis summary export', () => {
  it('exports the three traceable scenarios without inventing missing climate data', () => {
    const summary = buildAnalysisSummary(analyze(input, climate), 'en');
    expect(summary).toContain('### A.');
    expect(summary).toContain('### B.');
    expect(summary).toContain('### C.');
    expect(summary).toContain('Climate source: N/D');
    expect(summary).not.toContain('locally_validated');
  });
});
