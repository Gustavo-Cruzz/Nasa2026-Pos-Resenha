import { describe, expect, it } from 'vitest';
import { monthlyForYear } from '@/lib/climate/indicators';
import type { ClimateDay } from '@/lib/climate/nasa-power';

const day = (date: string, precipMm: number | null, tmeanC: number | null): ClimateDay => ({ date, tmeanC, tmaxC: null, tminC: null, precipMm, rhPct: null, windMps: null, solarMjM2Day: null });
const february = (year: string, rain: number | null) => Array.from({ length: 28 }, (_, index) => day(`${year}02${String(index + 1).padStart(2, '0')}`, index === 0 ? rain : 1, 25));

describe('monthlyForYear', () => {
  it('totals rain and takes the median temperature of the chosen year only', () => {
    const feb = monthlyForYear([...february('2024', 50), ...february('2025', 2)], 2025)[1];
    expect(feb).toEqual({ month: 2, rainTotalMm: 29, tmeanMedianC: 25 });
  });
  it('keeps a month N/D when any day is missing, and absent months N/D', () => {
    const result = monthlyForYear(february('2025', null), 2025);
    expect(result[1]).toEqual({ month: 2, rainTotalMm: null, tmeanMedianC: 25 });
    expect(result[0]).toEqual({ month: 1, rainTotalMm: null, tmeanMedianC: null });
    expect(monthlyForYear(february('2025', 1), 2026)[1].rainTotalMm).toBeNull();
  });
});
