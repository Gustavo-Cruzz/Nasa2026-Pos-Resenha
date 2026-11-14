import { z } from 'zod';
import type { Coordinates, FieldBoundary } from '@/lib/schema';
import { MAX_GRID_POINTS, TERRAIN_SOURCE, analyzeTerrain, buildSampleGrid, type SampleGrid, type TerrainContext } from '@/lib/terrain/terrain';

const ENDPOINT = 'https://api.opentopodata.org/v1/srtm30m';
const responseSchema = z.object({ status: z.literal('OK'), results: z.array(z.object({ elevation: z.number().nullable(), location: z.object({ lat: z.number(), lng: z.number() }).optional() })) });
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const cache = new Map<string, { at: number; value: TerrainContext }>();
const CACHE_MS = 24 * 3_600_000;

export function buildElevationUrl(grid: SampleGrid): string {
  if (grid.points.length > MAX_GRID_POINTS) throw new Error('Too many sample points for one request.');
  return `${ENDPOINT}?locations=${grid.points.map((point) => `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`).join('|')}`;
}

function unavailable(grid: SampleGrid, gap: string): TerrainContext {
  return { status: 'unavailable', mode: grid.mode, source: { ...TERRAIN_SOURCE, fetchedAt: new Date().toISOString() }, gridSpacingM: grid.spacingM, coarse: grid.coarse, sampledCells: 0, elevationM: null, slopePct: null, classShares: [], hotspots: { count: 0, sharePct: 0, minSlopePct: 8 }, cells: [], gaps: [gap] };
}

/** One public-API request (limits: 100 locations, 1 call/s, 1000 calls/day). Never throws: failures become an unavailable (N/D) context. */
export async function fetchTerrain(center: Coordinates, boundary?: FieldBoundary, fetcher: FetchLike = fetch): Promise<TerrainContext> {
  const grid = buildSampleGrid(boundary, center);
  const key = `${grid.points[0].lat.toFixed(5)},${grid.points[0].lng.toFixed(5)}|${grid.rows}x${grid.cols}|${grid.spacingM}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  try {
    const response = await fetcher(buildElevationUrl(grid), { signal: AbortSignal.timeout(8_000), next: { revalidate: 604_800 } } as RequestInit);
    if (!response.ok) return unavailable(grid, `srtm_http_${response.status}`);
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.results.length !== grid.points.length) return unavailable(grid, 'srtm_response_invalid');
    const value = analyzeTerrain(grid, parsed.data.results.map((item) => item.elevation), new Date().toISOString());
    if (value.status === 'available') cache.set(key, { at: Date.now(), value });
    return value;
  } catch { return unavailable(grid, 'srtm_unreachable'); }
}
