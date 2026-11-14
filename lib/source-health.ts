import type { AnalysisResult } from '@/lib/engine/types';

/** Compact, non-scored state of one data source. Missing data is always `nd`, never "ok". */
export type SourceState = 'available' | 'cache_verified' | 'partial' | 'nd';
export type SourceId = 'nasa_power' | 'gpm_imerg' | 'modis_ndvi' | 'srtm' | 'smap' | 'zarc' | 'pam' | 'ibge';
export type SourceHealth = { id: SourceId; state: SourceState; origin: string; period: string | null; coveragePct: number | null; cache: 'live' | 'verified_fixture' | 'none'; gap: string | null; url: string | null };

const FULL = 100;

/** Maps what the analysis actually loaded to a per-source state; unavailable inputs never become "available". */
export function buildSourceHealth(data: Pick<AnalysisResult, 'climate' | 'regionalContext' | 'boundaryAnalysis'> & { terrain?: AnalysisResult['terrain'] }): SourceHealth[] {
  const { climate, regionalContext, boundaryAnalysis, terrain } = data;
  const provenance = climate.provenance;
  const period = provenance ? `${provenance.period.start}–${provenance.period.end}` : null;
  const cache = climate.status === 'available' ? (climate.origin === 'verified_fixture' ? 'verified_fixture' : 'live') : 'none';
  const climateState = (coverage: number | null | undefined): SourceState => {
    if (climate.status !== 'available' || coverage === null || coverage === undefined) return 'nd';
    if (coverage < FULL) return 'partial';
    return climate.origin === 'verified_fixture' ? 'cache_verified' : 'available';
  };
  const t2m = provenance?.coveragePct.T2M ?? null;
  const imerg = provenance?.coveragePct.IMERG_PRECTOT ?? null;
  const smap = boundaryAnalysis.smapHistorical;
  const inBrazil = regionalContext.country === 'BR';
  return [
    { id: 'nasa_power', state: climateState(t2m), origin: 'NASA POWER · MERRA-2', period, coveragePct: t2m, cache, gap: climate.status === 'available' ? (t2m !== null && t2m < FULL ? 'missing_days' : null) : 'climate_unavailable', url: provenance?.sourceUrl ?? null },
    { id: 'gpm_imerg', state: climateState(imerg), origin: 'GPM IMERG via NASA POWER', period, coveragePct: imerg, cache, gap: imerg === null ? 'imerg_unavailable' : imerg < FULL ? 'missing_days' : null, url: provenance?.sourceUrl ?? null },
    { id: 'modis_ndvi', state: climate.ndvi ? (climate.ndvi.coveragePct < FULL ? 'partial' : 'cache_verified') : 'nd', origin: 'MODIS MOD13Q1 NDVI (ORNL DAAC)', period: climate.ndvi ? `${climate.ndvi.period.start}–${climate.ndvi.period.end}` : null, coveragePct: climate.ndvi?.coveragePct ?? null, cache: climate.ndvi ? 'verified_fixture' : 'none', gap: climate.ndvi ? (climate.ndvi.coveragePct < FULL ? 'missing_days' : null) : 'ndvi_not_preprocessed', url: climate.ndvi?.sourceUrl ?? null },
    { id: 'srtm', state: terrain?.status === 'available' ? (terrain.gaps.includes('some_cells_without_elevation') ? 'partial' : 'available') : 'nd', origin: 'NASA SRTM GL1 v003, 1 arc-second (via OpenTopoData)', period: 'STS-99, 2000', coveragePct: null, cache: terrain?.status === 'available' ? 'live' : 'none', gap: terrain?.status === 'available' ? (terrain.gaps.includes('some_cells_without_elevation') ? 'some_cells_without_elevation' : null) : 'terrain_unavailable', url: terrain?.source.url ?? 'https://www.earthdata.nasa.gov/data/catalog/lpcloud-srtmgl1-003' },
    { id: 'smap', state: 'nd', origin: `SMAP L4 ${smap.product} v${smap.version}`, period: smap.temporalCoverage, coveragePct: null, cache: 'none', gap: 'requires_earthdata_preprocessing', url: smap.sourceUrl },
    { id: 'zarc', state: regionalContext.zarc ? 'available' : 'nd', origin: 'MAPA ZARC', period: regionalContext.zarc?.safra ?? null, coveragePct: null, cache: 'none', gap: regionalContext.zarc ? null : inBrazil ? 'no_zarc_record' : 'outside_brazil', url: regionalContext.zarc?.sourceUrl ?? null },
    { id: 'pam', state: regionalContext.pam ? 'available' : 'nd', origin: 'IBGE PAM (SIDRA 5457)', period: regionalContext.pam?.year ?? null, coveragePct: null, cache: 'none', gap: regionalContext.pam ? null : inBrazil ? 'no_pam_record' : 'outside_brazil', url: regionalContext.pam?.sourceUrl ?? null },
    { id: 'ibge', state: regionalContext.municipalitySource ? 'available' : 'nd', origin: 'IBGE malha municipal 2025', period: regionalContext.municipalitySource?.version ?? null, coveragePct: null, cache: 'none', gap: regionalContext.municipalitySource ? null : 'outside_brazil', url: regionalContext.municipalitySource?.url ?? null },
  ];
}

const labels = {
  'pt-BR': { available: 'Histórico disponível', cache_verified: 'Cache verificado', partial: 'Cobertura parcial', nd: 'N/D' },
  en: { available: 'Historical data available', cache_verified: 'Verified cache', partial: 'Partial coverage', nd: 'N/D' },
} as const;
export const sourceStateLabel = (state: SourceState, locale: 'pt-BR' | 'en') => labels[locale][state];

const gapLabels = {
  'pt-BR': { climate_unavailable: 'clima NASA indisponível', missing_days: 'dias sem valor válido', imerg_unavailable: 'GPM IMERG indisponível', requires_earthdata_preprocessing: 'requer pré-processamento Earthdata', terrain_unavailable: 'relevo SRTM indisponível neste momento (serviço público OpenTopoData)', some_cells_without_elevation: 'algumas células sem elevação', ndvi_not_preprocessed: 'NDVI MODIS só existe onde há fixture pré-processado verificado; indisponível neste ponto', no_zarc_record: 'sem registro ZARC no município', no_pam_record: 'sem registro PAM no município', outside_brazil: 'fora do Brasil: contexto brasileiro não se aplica' },
  en: { climate_unavailable: 'NASA climate unavailable', missing_days: 'days without a valid value', imerg_unavailable: 'GPM IMERG unavailable', requires_earthdata_preprocessing: 'requires Earthdata preprocessing', terrain_unavailable: 'SRTM relief unavailable right now (public OpenTopoData service)', some_cells_without_elevation: 'some cells without elevation', ndvi_not_preprocessed: 'MODIS NDVI exists only where a verified pre-processed fixture is available; unavailable at this point', no_zarc_record: 'no ZARC record for the municipality', no_pam_record: 'no PAM record for the municipality', outside_brazil: 'outside Brazil: Brazilian context does not apply' },
} as const;
export const sourceGapLabel = (gap: string | null, locale: 'pt-BR' | 'en') => gap ? (gapLabels[locale] as Record<string, string>)[gap] ?? gap : null;

export const sourceTitle = (id: SourceId) => ({ nasa_power: 'NASA POWER', gpm_imerg: 'GPM IMERG', modis_ndvi: 'MODIS NDVI', srtm: 'SRTM', smap: 'SMAP', zarc: 'ZARC', pam: 'PAM', ibge: 'IBGE' }[id]);

/** The four compact states shown near the decision, summarized across sources. */
export function summarizeSourceStates(health: SourceHealth[]): Array<{ state: SourceState; sources: SourceId[] }> {
  return (['available', 'cache_verified', 'partial', 'nd'] as const).map((state) => ({ state, sources: health.filter((item) => item.state === state).map((item) => item.id) })).filter((group) => group.sources.length > 0);
}
