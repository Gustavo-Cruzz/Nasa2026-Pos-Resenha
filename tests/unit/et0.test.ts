import { describe, expect, it } from 'vitest';
import { dayOfYear, elevationFromPressure, et0Daily, et0FromVapourPressure, extraterrestrialRadiation } from '@/lib/climate/et0';

// FAO-56 Example 18 (Uccle, Brussels): 6 July, z = 100 m, 50°48'N. Published ET0 = 3.88 mm/day, Ra = 41.09 MJ/m2/day.
const uccle = { tmaxC: 21.5, tminC: 12.3, eaKPa: 1.409, windMps2m: 2.078, solarMjM2Day: 22.07, latitudeDeg: 50.8, dayOfYear: 187, pressureKPa: 100.1 };

describe('ET0 (FAO-56 Penman–Monteith)', () => {
  it('reproduces FAO-56 Example 18 within tolerance', () => {
    expect(extraterrestrialRadiation(50.8, 187)).toBeCloseTo(41.09, 0);
    const et0 = et0FromVapourPressure(uccle);
    expect(et0).not.toBeNull();
    expect(Math.abs((et0 as number) - 3.88)).toBeLessThan(0.06);
  });
  it('infers elevation from pressure', () => {
    expect(elevationFromPressure(101.3)).toBeCloseTo(0, 5);
    expect(elevationFromPressure(100.1)).toBeGreaterThan(90);
    expect(elevationFromPressure(100.1)).toBeLessThan(110);
  });
  it('computes day of year in UTC', () => {
    expect(dayOfYear('20260101')).toBe(1);
    expect(dayOfYear('20240301')).toBe(61);
    expect(dayOfYear('20251231')).toBe(365);
  });
  it('is never zero by default: any missing input is null', () => {
    const base = { tmaxC: 28, tminC: 16, rhPct: 60, windMps2m: 2, solarMjM2Day: 20, pressureKPa: 92, latitudeDeg: -17.8, dayOfYear: 100 };
    const ok = et0Daily(base);
    expect(ok).not.toBeNull();
    expect(ok as number).toBeGreaterThan(2);
    expect(ok as number).toBeLessThan(8);
    for (const key of ['tmaxC', 'tminC', 'rhPct', 'windMps2m', 'solarMjM2Day', 'pressureKPa'] as const) expect(et0Daily({ ...base, [key]: null })).toBeNull();
    expect(et0Daily({ ...base, pressureKPa: undefined })).toBeNull();
  });
  it('rejects physically impossible input', () => {
    expect(et0FromVapourPressure({ ...uccle, tmaxC: 5, tminC: 12 })).toBeNull();
    expect(et0FromVapourPressure({ ...uccle, solarMjM2Day: -1 })).toBeNull();
    expect(et0FromVapourPressure({ ...uccle, windMps2m: Number.NaN })).toBeNull();
  });
  it('rises with radiation and falls with humidity', () => {
    const base = { tmaxC: 30, tminC: 18, rhPct: 50, windMps2m: 2, solarMjM2Day: 18, pressureKPa: 95, latitudeDeg: -15, dayOfYear: 200 };
    expect(et0Daily({ ...base, solarMjM2Day: 24 }) as number).toBeGreaterThan(et0Daily(base) as number);
    expect(et0Daily({ ...base, rhPct: 85 }) as number).toBeLessThan(et0Daily(base) as number);
  });
});
