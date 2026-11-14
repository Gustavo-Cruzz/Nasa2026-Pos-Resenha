import { describe, expect, it } from 'vitest';
import { buildOpenMeteoForecastUrl, parseOpenMeteoForecast } from '@/lib/climate/forecast';
import { calculateFutureWaterPressure } from '@/lib/climate/water-pressure';
import { buildDrySpellSamples, chronologicalSplit, isDrySpell, trainLogisticDrySpellModel, type DrySpellSample } from '@/lib/climate/dry-spell';

const point = { latitude: -17.798, longitude: -50.919 };
const payload = { latitude: point.latitude, longitude: point.longitude, timezone: 'UTC', daily_units: { precipitation_sum: 'mm', et0_fao_evapotranspiration: 'mm', temperature_2m_max: '°C', temperature_2m_min: '°C' }, daily: { time: ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'], precipitation_sum: [0, 0, 2, 0, 0, 0, 0], et0_fao_evapotranspiration: [4, 4, 4, 4, 4, 4, 4], temperature_2m_max: [30, 30, 30, 30, 30, 30, 30], temperature_2m_min: [18, 18, 18, 18, 18, 18, 18] } };

describe('Climate Risk contracts', () => {
  it('requests documented forecast daily variables and validates units', () => {
    const url = new URL(buildOpenMeteoForecastUrl(point));
    expect(url.searchParams.get('daily')).toContain('et0_fao_evapotranspiration');
    expect(url.searchParams.get('timezone')).toBe('UTC');
    expect(parseOpenMeteoForecast(payload, point, url.toString(), '2026-11-14T00:00:00.000Z').days).toHaveLength(7);
    expect(() => parseOpenMeteoForecast({ ...payload, daily_units: { ...payload.daily_units, precipitation_sum: 'inch' } }, point, url.toString())).toThrow(/units/);
  });
  it('computes P minus provider ET0 without turning incomplete days into zero', () => {
    const forecast = parseOpenMeteoForecast(payload, point, 'https://example.test', '2026-11-14T00:00:00.000Z');
    const result = calculateFutureWaterPressure(forecast, 7, [{ month: 11, precipMedianMm: 30, et0MedianMm: 90, balanceMedianMm: -60, validYears: 15, expectedYears: 15, coveragePct: 100 }]);
    expect(result).toMatchObject({ precipitationTotalMm: 2, et0TotalMm: 28, climateBalanceMm: -26, negativeBalanceDays: 7, historicalComparison: 'drier_than_historical' });
    expect(calculateFutureWaterPressure({ ...forecast, days: forecast.days.map((day, index) => index === 2 ? { ...day, et0Mm: null } : day) }, 7).climateBalanceMm).toBeNull();
  });
  it('defines dry spells as seven consecutive days below 1 mm/day', () => {
    expect(isDrySpell(Array.from({ length: 7 }, () => ({ precipMm: 0.9 })))).toBe(true);
    expect(isDrySpell([{ precipMm: 0 }, { precipMm: 0 }, { precipMm: 0 }, { precipMm: 0 }, { precipMm: 0 }, { precipMm: 0 }, { precipMm: 1 }])).toBe(false);
    expect(isDrySpell([{ precipMm: null }])).toBeNull();
  });
  it('builds only past-looking features and embargoes chronological partitions', () => {
    const days = Array.from({ length: 200 }, (_, index) => { const date = new Date(Date.UTC(2020, 0, index + 1)).toISOString().slice(0, 10).replaceAll('-', ''); return { date, precipMm: index < 30 ? 0 : 5, tmeanC: 25, et0Mm: 4, tmaxC: 30, tminC: 20, rhPct: 60, windMps: 2, solarMjM2Day: 20 }; });
    const samples = buildDrySpellSamples(days, 7); expect(samples[0].features[0]).toBe(0); expect(samples[0].event).toBe(0);
    const split = chronologicalSplit(samples, 30); expect(split.validation[0].issuedOn > split.train.at(-1)!.issuedOn).toBe(true); expect(split.test[0].issuedOn > split.validation.at(-1)!.issuedOn).toBe(true);
  });
  it('reports held-out Brier and does not mark an unproven model validated', () => {
    const samples: DrySpellSample[] = Array.from({ length: 100 }, (_, index) => ({ issuedOn: `2020${String(Math.floor(index / 28) + 1).padStart(2, '0')}${String(index % 28 + 1).padStart(2, '0')}`, month: Math.floor(index / 28) + 1, features: [index, index % 2, 25, 100, 0, 1], event: index % 2 as 0 | 1 }));
    const artifact = trainLogisticDrySpellModel(chronologicalSplit(samples, 1), 7); expect(artifact.evaluation.model.brierScore).not.toBeNull(); expect(artifact.evaluation.baseline.calibration).toHaveLength(5); expect(['validated', 'not_validated']).toContain(artifact.validationStatus);
  });
});
