import type { ClimateApiResponse } from '@/lib/atlas';
import type { BrazilRegionalContext } from '@/lib/brazil/types';
import type { EnsoState } from '@/lib/climate/enso';
import type { JoaoData, Remote } from '@/lib/explain/joao';
import type { JsonState } from '@/components/atlas/use-json';
import type { ForecastBody } from '@/components/atlas/explore-extras';

type Climate = Extract<ClimateApiResponse, { status: 'ok' }>;

/** A loading reading says nothing; a failed one is reported honestly by João. */
const remote = <T, U>(state: JsonState<T>, map: (value: T) => U): Remote<U> =>
  state.kind === 'ready' ? { state: 'ready', value: map(state.data) } : state.kind === 'error' ? { state: 'unavailable' } : { state: 'loading' };

/** Maps what the Explore panel already holds onto João's input. No number is changed or filled in on the way. */
export function buildJoaoData(input: { placeName: string | null; month: number; climate: Climate; forecast: JsonState<ForecastBody>; enso: JsonState<EnsoState>; regional: JsonState<BrazilRegionalContext> }): JoaoData {
  const summary = input.climate.climateSummary;
  return {
    placeName: input.placeName,
    month: input.month,
    climate: {
      monthly: summary.monthly,
      rainMedianMmByMonth: summary.historicalPrecipitationByMonth,
      rainySeason: summary.seasonality?.rainySeason,
      drySpells: summary.seasonality?.drySpells,
      rootZoneByMonth: summary.rootZoneByMonth,
      lastYear: summary.lastYear?.year,
    },
    forecast: remote(input.forecast, (body) => body.days),
    enso: remote(input.enso, (state) => state),
    crops: remote(input.regional, (context) => ({
      municipality: context.country === 'BR' ? context.municipality?.name ?? null : null,
      year: context.pam?.year ?? null,
      products: context.pam ? context.pam.products.map((product) => ({ label: product.productLabel, harvestedAreaHa: product.harvestedAreaHa })) : null,
    })),
  };
}
