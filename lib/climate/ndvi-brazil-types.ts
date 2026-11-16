/**
 * Shared contracts for the national municipal MODIS NDVI pipeline (MOD13Q1 v061, Terra only, 250m_16_days_NDVI).
 * Municipal context only: one modelled 250 m interior point per IBGE municipality, never a farm or field measurement.
 * Agents/modules: points builder, raster source adapter, ingestion pipeline and runtime reader all depend on this file only.
 */
import type { NdviMonth } from '@/lib/climate/ndvi';

export const NDVI_BRAZIL_FORMAT_VERSION = 1;
export const NDVI_BRAZIL_DIR = 'data/ndvi-brazil';
export const NDVI_PRODUCT = 'MOD13Q1' as const;
export const NDVI_BAND = '250m_16_days_NDVI' as const;
export const NDVI_COLLECTION = 'modis-13Q1-061';
export const NDVI_SOURCE_URL = 'https://planetarycomputer.microsoft.com/dataset/modis-13Q1-061';
export const NDVI_PROVIDER = 'Microsoft Planetary Computer STAC (collection modis-13Q1-061): cloud-optimized copies of NASA LP DAAC MOD13Q1 v061';
/** Composites per year for a 16-day product. */
export const NDVI_COMPOSITES_PER_YEAR = 23;
/** Coverage rules already used by scripts/fetch-modis-ndvi.ts. */
export const NDVI_MIN_LISTED_FRACTION = 0.9;
export const NDVI_MIN_VALID_FRACTION = 0.7;

export type PointMethod = 'centroid_inside' | 'interior_grid_nearest_centroid';

/** data/ndvi-brazil/points.json entry. IBGE codes are always 7-digit strings. */
export type MunicipalPoint = {
  ibgeCode: string;
  municipality: string;
  uf: string;
  latitude: number;
  longitude: number;
  method: PointMethod;
  geometryType: 'Polygon' | 'MultiPolygon';
};

export type MunicipalPointsArtifact = {
  formatVersion: number;
  generatedAt: string;
  catalog: { artifact: 'data/brazil-municipalities.json'; sha256: string; count: number; source: string };
  method: string;
  count: number;
  points: MunicipalPoint[];
};

export type MunicipalNdviStatus = 'available' | 'insufficient_coverage' | 'unavailable';

export type MunicipalNdviRecord = {
  ibgeCode: string;
  municipality: string;
  uf: string;
  point: { latitude: number; longitude: number; method: string };
  product: typeof NDVI_PRODUCT;
  band: typeof NDVI_BAND;
  period: { start: string; end: string };
  /** Composites listed for the point's tile within the requested period. */
  observations: number;
  validObservations: number;
  coveragePct: number;
  monthlyClimatology: NdviMonth[];
  status: MunicipalNdviStatus;
  source: { provider: string; sourceUrl: string; fetchedAt: string };
};

/** data/ndvi-brazil/states/<UF>.json */
export type StateNdviArtifact = {
  formatVersion: number;
  uf: string;
  generatedAt: string;
  records: MunicipalNdviRecord[];
};

/** One MOD13Q1 Terra item (one sinusoidal tile, one 16-day composite). */
export type NdviItem = { id: string; tile: string; start: string; end: string };

/** Raster access abstraction: batched COG reader (preferred) or point-by-point fallback. */
export interface NdviRasterSource {
  readonly mode: 'cog_batch' | 'point_api';
  /** Lists MOD13Q1 Terra items covering the given points for one calendar year. Never returns MYD13Q1 (Aqua). */
  listItems(year: number, bbox: [number, number, number, number]): Promise<NdviItem[]>;
  /** Tile (e.g. "h13v10") that contains a WGS84 point, or undefined outside the MODIS grid. */
  tileFor(latitude: number, longitude: number): string | undefined;
  /** Raw int16 values for many points from one item; null when the pixel could not be read. Same order as `points`. */
  sample(item: NdviItem, points: Array<{ latitude: number; longitude: number }>): Promise<Array<number | null>>;
}

export type ProgressManifest = {
  formatVersion: number;
  product: typeof NDVI_PRODUCT;
  band: typeof NDVI_BAND;
  collection: string;
  period: { startYear: number; endYear: number };
  sourceMode: NdviRasterSource['mode'];
  catalog: { sha256: string; count: number };
  pointsSha256: string;
  generator: { script: string; sha256: string };
  updatedAt: string;
  processedItems: string[];
  completedMunicipalities: string[];
  recoverableFailures: Array<{ itemId: string; error: string; attempts: number }>;
  permanentFailures: Array<{ itemId: string; error: string }>;
  /** sha256 of each states/<UF>.json, for integrity checks. */
  stateChecksums: Record<string, string>;
};
