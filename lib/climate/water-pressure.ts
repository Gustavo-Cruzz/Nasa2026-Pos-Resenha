import type { ForecastDay, MeteorologicalForecast } from '@/lib/climate/forecast';
import type { WaterBalanceMonth } from '@/lib/climate/indicators';

export type FutureWaterPressure = { kind: 'meteorological_forecast'; horizonDays: 7 | 15; issuedAt: string; precipitationTotalMm: number | null; et0TotalMm: number | null; climateBalanceMm: number | null; negativeBalanceDays: number | null; validDays: number; expectedDays: number; historicalEquivalentBalanceMm: number | null; historicalComparison: 'drier_than_historical' | 'wetter_than_historical' | 'similar_to_historical' | 'unknown'; limitations: string[] };

function round(value: number): number { return Number(value.toFixed(2)); }
function monthDays(start: string, horizon: number): Array<{ month: number; fraction: number }> {
  const counts = new Map<number, number>();
  for (let offset = 0; offset < horizon; offset += 1) { const date = new Date(`${start}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + offset); counts.set(date.getUTCMonth() + 1, (counts.get(date.getUTCMonth() + 1) ?? 0) + 1); }
  return [...counts].map(([month, count]) => ({ month, fraction: count / new Date(Date.UTC(Number(start.slice(0, 4)), month, 0)).getUTCDate() }));
}

/** P − ET0 is a climate balance only. It deliberately does not infer soil water or irrigation demand. */
export function calculateFutureWaterPressure(forecast: MeteorologicalForecast, horizonDays: 7 | 15, historical: WaterBalanceMonth[] = []): FutureWaterPressure {
  const days = forecast.days.slice(0, horizonDays); const usable = days.filter((day) => day.precipitationMm !== null && day.et0Mm !== null);
  // A horizon aggregate is withheld unless every requested day has both variables.
  // Partial provider arrays must not silently look like a complete 7/15-day signal.
  const complete = days.length === horizonDays && usable.length === days.length;
  const precipitationTotalMm = complete ? round(usable.reduce((sum, day) => sum + (day.precipitationMm as number), 0)) : null;
  const et0TotalMm = complete ? round(usable.reduce((sum, day) => sum + (day.et0Mm as number), 0)) : null;
  const climateBalanceMm = precipitationTotalMm !== null && et0TotalMm !== null ? round(precipitationTotalMm - et0TotalMm) : null;
  const historicalEquivalentBalanceMm = complete && historical.length ? (() => { const lookup = new Map(historical.map((entry) => [entry.month, entry])); const values = monthDays(days[0]?.date ?? '', horizonDays).map(({ month, fraction }) => { const balance = lookup.get(month); return balance?.balanceMedianMm === null || balance?.balanceMedianMm === undefined || balance.coveragePct < 80 ? null : balance.balanceMedianMm * fraction; }); return values.every((value): value is number => value !== null) ? round(values.reduce((sum, value) => sum + value, 0)) : null; })() : null;
  const comparison = climateBalanceMm === null || historicalEquivalentBalanceMm === null ? 'unknown' : climateBalanceMm < historicalEquivalentBalanceMm - 1 ? 'drier_than_historical' : climateBalanceMm > historicalEquivalentBalanceMm + 1 ? 'wetter_than_historical' : 'similar_to_historical';
  return { kind: 'meteorological_forecast', horizonDays, issuedAt: forecast.issuedAt, precipitationTotalMm, et0TotalMm, climateBalanceMm, negativeBalanceDays: usable.length === days.length ? usable.filter((day) => (day.precipitationMm as number) - (day.et0Mm as number) < 0).length : null, validDays: usable.length, expectedDays: days.length, historicalEquivalentBalanceMm, historicalComparison: comparison, limitations: [...forecast.limitations, 'P − ET0 is not soil moisture, crop water use, irrigation need, or a crop deficit. Historical comparison is a calendar-window climatology derived from complete historical months.'] };
}
