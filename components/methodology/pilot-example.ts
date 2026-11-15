import { historicalErosivity, type ErosivityClassId } from '@/lib/climate/erosivity';
import { historicalWaterBalanceByMonth } from '@/lib/climate/indicators';
import { readVerifiedPilotFixture } from '@/lib/climate/nasa-power';
import { rainySeasonFromBalance } from '@/lib/climate/seasonality';
import { RIO_VERDE_PILOT } from '@/lib/region';

export type PilotMonth = { month: number; precipMm: number | null; et0Mm: number | null; balanceMm: number | null; validYears: number; expectedYears: number };
/** Real Rio Verde (GO) numbers, derived with the app's own helpers from the SHA-256-verified NASA POWER fixture. */
export type PilotExample = {
  label: string;
  latitude: number;
  longitude: number;
  fetchedAt: string;
  months: PilotMonth[];
  rainyMonths: number[];
  mfi: number | null;
  mfiClass: ErosivityClassId | null;
};

const round = (value: number | null) => (value === null ? null : Math.round(value));

/** Returns null when the fixture is missing or fails its hash check; the page then shows a schematic without numbers. */
export async function loadPilotExample(): Promise<PilotExample | null> {
  const coordinates = { latitude: RIO_VERDE_PILOT.coordinates.latitude, longitude: RIO_VERDE_PILOT.coordinates.longitude };
  const dataset = await readVerifiedPilotFixture(coordinates);
  if (!dataset) return null;
  const balance = historicalWaterBalanceByMonth(dataset.daily);
  const erosivity = historicalErosivity(dataset.daily);
  return {
    label: RIO_VERDE_PILOT.label,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    fetchedAt: dataset.provenance.fetchedAt,
    months: balance.map((item) => ({ month: item.month, precipMm: round(item.precipMedianMm), et0Mm: round(item.et0MedianMm), balanceMm: round(item.balanceMedianMm), validYears: item.validYears, expectedYears: item.expectedYears })),
    rainyMonths: rainySeasonFromBalance(balance)?.months ?? [],
    mfi: erosivity.mfi === null ? null : Math.round(erosivity.mfi),
    mfiClass: erosivity.classId,
  };
}
