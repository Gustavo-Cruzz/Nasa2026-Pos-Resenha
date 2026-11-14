import { z } from 'zod';

/** MOD13Q1 250m 16-day NDVI: integers scaled by 0.0001, fill -3000, valid range -2000..10000 (LP DAAC product guide). */
export const NDVI_SCALE = 0.0001;
export const NDVI_FILL = -3000;
export const NDVI_VALID: readonly [number, number] = [-2000, 10_000];

export type NdviObservation = { date: string; ndvi: number | null };
export type NdviMonth = { month: number; medianNdvi: number | null; validObservations: number; years: number };
export type NdviContext = { origin: 'verified_fixture'; product: 'MOD13Q1'; band: '250m_16_days_NDVI'; period: { start: string; end: string }; fetchedAt: string; sourceUrl: string; observations: number; validObservations: number; coveragePct: number; months: NdviMonth[] };

/** Demonstration points that may carry a pre-processed NDVI fixture. Exact coordinates only, like the POWER pilot fixture. */
export const NDVI_FIXTURE_SITES = [
  { slug: 'rio-verde', latitude: -17.798, longitude: -50.919 },
  { slug: 'accra', latitude: 5.6037, longitude: -0.187 },
  { slug: 'new-delhi', latitude: 28.6139, longitude: 77.209 },
] as const;

const median = (values: number[]): number | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return Number((sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2).toFixed(4));
};

/** MODIS date AYYYYDDD to YYYY-MM-DD (UTC). */
export function modisDateToIso(modisDate: string): string | null {
  const match = /^A(\d{4})(\d{3})$/.exec(modisDate);
  if (!match) return null;
  const year = Number(match[1]); const doy = Number(match[2]);
  if (doy < 1 || doy > 366) return null;
  return new Date(Date.UTC(year, 0, doy)).toISOString().slice(0, 10);
}

const subsetSchema = z.object({ subset: z.array(z.object({ band: z.string(), modis_date: z.string(), data: z.array(z.number()).min(1) })).min(1) });

/** Parses an ORNL DAAC MODIS web-service subset response for one pixel. Anything unexpected throws; nothing is guessed. */
export function parseModisSubset(payload: unknown): NdviObservation[] {
  const parsed = subsetSchema.parse(payload);
  return parsed.subset.filter((item) => item.band === '250m_16_days_NDVI').map((item) => {
    const date = modisDateToIso(item.modis_date);
    if (!date) throw new Error(`Unexpected MODIS date ${item.modis_date}.`);
    const raw = item.data[0];
    const valid = raw !== NDVI_FILL && raw >= NDVI_VALID[0] && raw <= NDVI_VALID[1];
    return { date, ndvi: valid ? Number((raw * NDVI_SCALE).toFixed(4)) : null };
  });
}

/** Median NDVI per calendar month across years; only valid composites count. */
export function monthlyNdvi(observations: NdviObservation[]): NdviMonth[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const inMonth = observations.filter((item) => Number(item.date.slice(5, 7)) === month);
    const valid = inMonth.flatMap((item) => item.ndvi === null ? [] : [item.ndvi]);
    return { month, medianNdvi: median(valid), validObservations: valid.length, years: new Set(inMonth.map((item) => item.date.slice(0, 4))).size };
  });
}

/**
 * Months with the lowest vegetation relative to this point's own series. No absolute bare-soil threshold is applied
 * (none is documented in the project evidence); needs a reading for at least nine months.
 */
export function relativeLowVegetationMonths(months: NdviMonth[], count = 3): number[] {
  const readable = months.filter((month) => month.medianNdvi !== null);
  if (readable.length < 9) return [];
  return [...readable].sort((a, b) => (a.medianNdvi as number) - (b.medianNdvi as number) || a.month - b.month).slice(0, count).map((month) => month.month).sort((a, b) => a - b);
}
