import { z } from 'zod';
import { coordinatesSchema, fieldBoundarySchema, type FieldBoundary } from '@/lib/schema';

export const atlasPointSchema = coordinatesSchema.extend({ label: z.string().min(1).optional() });
export type AtlasPoint = z.infer<typeof atlasPointSchema>;
export const atlasPolygonSchema = fieldBoundarySchema;
export type AtlasPolygon = FieldBoundary;

export const SMAP_GIBS_DATE = '2025-06-30';
export const SMAP_GIBS_LAYER = 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture';
export const SMAP_GIBS_TILE_URL = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${SMAP_GIBS_LAYER}/default/${SMAP_GIBS_DATE}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`;
/** Near-real-time NASA GIBS layers (daily, about one day behind): visual context only, never a field measurement. */
export const IMERG_GIBS_TILE_URL = (date: string) => `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/${date}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`;
export const MODIS_GIBS_TILE_URL = (date: string) => `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
/** Newest day (UTC, YYYY-MM-DD) that GIBS has reliably published: yesterday, or the day before in the first hours of the UTC day. */
export function latestNrtDate(now: Date = new Date()): string {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (now.getUTCHours() < 6 ? 2 : 1)));
  return day.toISOString().slice(0, 10);
}
export type MapLayers = { smap: boolean; rain: boolean; modis: boolean };

export const SMAP_GIBS_LEGEND_URL = 'https://gibs.earthdata.nasa.gov/legends/SMAP_Analyzed_Soil_Moisture_H.svg';
export const SMAP_GIBS_METADATA_URL = `https://gibs.earthdata.nasa.gov/layer-metadata/v1.0/${SMAP_GIBS_LAYER}.json`;

const monthlyClimateSchema = z.object({ month: z.number().int().min(1).max(12), tmeanMedianC: z.number().nullable(), tminMedianC: z.number().nullable().optional(), tmaxMedianC: z.number().nullable().optional(), tsoilMedianC: z.number().nullable().optional(), precipMedianMm: z.number().nullable(), validTemperatureDays: z.number().int().nonnegative(), validPrecipitationDays: z.number().int().nonnegative() });
export const climateApiResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), origin: z.enum(['live', 'verified_fixture']), climateSummary: z.object({ monthly: z.array(monthlyClimateSchema), plantingMonthPrecipitation: z.object({ month: z.number().int(), medianTotalMm: z.number().nullable(), validYears: z.number().int(), expectedYears: z.number().int(), coveragePct: z.number() }).nullable(), historicalPrecipitationByMonth: z.array(z.object({ month: z.number().int().min(1).max(12), medianTotalMm: z.number().nullable(), validYears: z.number().int(), expectedYears: z.number().int(), coveragePct: z.number() })).default([]), lastYear: z.object({ year: z.number().int(), months: z.array(z.object({ month: z.number().int().min(1).max(12), rainTotalMm: z.number().nullable(), tmeanMedianC: z.number().nullable() })) }).optional(), waterContext: z.object({ month: z.number().int().min(1).max(12), imergMedianTotalMm: z.number().nullable(), medianRainDays: z.number().nullable(), rootZoneWetnessMedian: z.number().nullable(), validImergYears: z.number().int(), expectedYears: z.number().int(), imergCoveragePct: z.number(), rootZoneCoveragePct: z.number() }).nullable().optional(), seasonality: z.object({
    rainySeason: z.object({ method: z.literal('positive_water_balance'), startMonth: z.number().int().min(1).max(12), endMonth: z.number().int().min(1).max(12), months: z.array(z.number().int().min(1).max(12)), lengthMonths: z.number().int().min(1).max(12) }).nullable(),
    drySpells: z.object({ definition: z.object({ consecutiveDays: z.number().int(), precipitationBelowMm: z.number() }), seasonsAnalyzed: z.number().int().nonnegative(), seasonsWithSpell: z.number().int().nonnegative(), medianLongestRunDays: z.number().nullable(), maxRunDays: z.number().nullable(), maxRunSeasonStartYear: z.number().int().nullable() }).nullable(),
  }).optional(), rootZoneByMonth: z.array(z.object({ month: z.number().int().min(1).max(12), medianWetness: z.number().nullable(), lastYearWetness: z.number().nullable() })).optional(), calendarDayContext: z.object({ month: z.number().int().min(1).max(12), day: z.number().int().min(1).max(31), tmeanMedianC: z.number().nullable(), precipMedianMm: z.number().nullable(), imergPrecipMedianMm: z.number().nullable(), rootZoneWetnessMedian: z.number().nullable(), validYears: z.number().int(), expectedYears: z.number().int() }).nullable().optional() }), provenance: z.object({ sourceUrl: z.string().url(), period: z.object({ start: z.string(), end: z.string() }), fetchedAt: z.string(), coveragePct: z.record(z.string(), z.number()), missingDays: z.array(z.string()) }), warnings: z.array(z.string()) }),
  z.object({ status: z.literal('error'), code: z.string(), message: z.string() }),
]);
export type ClimateApiResponse = z.infer<typeof climateApiResponseSchema>;

const zarcCropContextSchema = z.object({ cropId: z.string(), rowCount: z.number().int().positive(), zarcCultures: z.array(z.string()), cycleCodes: z.array(z.number()), soilCodes: z.array(z.number()), climateCodes: z.array(z.number()), managements: z.array(z.string()), ordinances: z.array(z.string()), riskCodes: z.array(z.number()), decendiosWithRiskCode: z.array(z.number().int()) });
export const brazilRegionalContextSchema = z.object({
  country: z.literal('BR').nullable(),
  municipality: z.object({ code: z.string().regex(/^\d{7}$/), name: z.string(), uf: z.string().length(2) }).nullable(),
  municipalitySource: z.object({ version: z.literal('2025'), url: z.string().url(), officialMeshUrl: z.string().url(), accessedAt: z.string(), referenceSystem: z.string(), sha256: z.string().length(64) }).nullable(),
  zarc: z.object({ safra: z.string(), sourceUrl: z.string().url(), dictionaryUrl: z.string().url(), accessedAt: z.string(), sha256: z.string().length(64), crops: z.record(z.string(), zarcCropContextSchema) }).nullable(),
  pam: z.object({ year: z.string(), sourceUrl: z.string().url(), accessedAt: z.string(), sha256: z.string().length(64), caveat: z.string(), products: z.array(z.object({ productCode: z.string(), productLabel: z.string(), cropIds: z.array(z.string()), harvestedAreaHa: z.number().nullable(), producedQuantity: z.number().nullable(), productionUnit: z.string().nullable(), caveat: z.string().nullable() })) }).nullable(),
  gaps: z.array(z.string()),
});
export const regionalContextApiResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), context: brazilRegionalContextSchema }),
  z.object({ status: z.literal('error'), code: z.string(), message: z.string() }),
]);
export type RegionalContextApiResponse = z.infer<typeof regionalContextApiResponseSchema>;

export const ATLAS_EXAMPLES: Array<AtlasPoint & { label: string }> = [
  { label: 'Rio Verde (GO), Brasil', latitude: -17.798, longitude: -50.919 },
  { label: 'Acra, Gana', latitude: 5.6037, longitude: -0.187 },
  { label: 'Nova Délhi, Índia', latitude: 28.6139, longitude: 77.209 },
];
