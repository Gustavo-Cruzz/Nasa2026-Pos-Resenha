import type { FieldBoundary } from '@/lib/schema';

/**
 * Starting size of the suggested perimeter, in hectares. This is NOT data: no per-municipality farm-size
 * source exists in the repo, so a fixed round number is used only as a shape the farmer adjusts later.
 */
export const SUGGESTED_AREA_HA = 25;

const METERS_PER_DEGREE_LAT = (Math.PI * 6_371_008.8) / 180;

/**
 * Square perimeter centred on the point, same format as `fieldBoundarySchema`: open ring (first vertex not repeated),
 * vertices as [longitude, latitude], clockwise from the south-west corner. Longitude is scaled by cos(latitude).
 */
export function suggestedBoundary(point: { latitude: number; longitude: number }, options: { areaHa?: number } = {}): FieldBoundary {
  const areaHa = options.areaHa && options.areaHa > 0 ? options.areaHa : SUGGESTED_AREA_HA;
  const halfSideM = Math.sqrt(areaHa * 10_000) / 2;
  const cosLat = Math.max(Math.cos((point.latitude * Math.PI) / 180), 0.01);
  const dLat = halfSideM / METERS_PER_DEGREE_LAT;
  const dLon = halfSideM / (METERS_PER_DEGREE_LAT * cosLat);
  const clampLon = (v: number) => Math.min(180, Math.max(-180, v));
  const clampLat = (v: number) => Math.min(90, Math.max(-90, v));
  const { latitude: lat, longitude: lon } = point;
  return [[lon - dLon, lat - dLat], [lon - dLon, lat + dLat], [lon + dLon, lat + dLat], [lon + dLon, lat - dLat]].map(([x, y]) => [clampLon(x), clampLat(y)] as [number, number]);
}
