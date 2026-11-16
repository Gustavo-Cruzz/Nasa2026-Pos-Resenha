/**
 * MODIS sinusoidal grid (MOD13Q1 v061, 250 m): WGS84 -> projected metres -> tile hXXvYY -> pixel row/col.
 * Pure functions. Constants from the MODIS Land grid definition (sphere R = 6371007.181 m, 36 x 18 tiles of
 * 1111950.5197665 m, 4800 x 4800 px per tile at 250 m nominal, i.e. 231.65635826 m per pixel).
 * Relative imports only (scripts import this through node --experimental-strip-types).
 */

export const MODIS_SPHERE_RADIUS = 6_371_007.181;
export const MODIS_TILE_SIZE_M = 1_111_950.519_766_5;
export const MODIS_TILES_H = 36;
export const MODIS_TILES_V = 18;
export const MODIS_250M_TILE_PIXELS = 4800;
export const MODIS_250M_PIXEL_SIZE_M = MODIS_TILE_SIZE_M / MODIS_250M_TILE_PIXELS;
/** Upper-left corner of the global grid (tile h00v00). */
export const MODIS_GRID_ORIGIN_X = -MODIS_TILE_SIZE_M * (MODIS_TILES_H / 2);
export const MODIS_GRID_ORIGIN_Y = MODIS_TILE_SIZE_M * (MODIS_TILES_V / 2);

export type SinusoidalXY = { x: number; y: number };
export type ModisTile = { h: number; v: number; id: string };
export type ModisPixel = ModisTile & { row: number; col: number };

const DEG = Math.PI / 180;

export function tileId(h: number, v: number): string {
  return `h${String(h).padStart(2, '0')}v${String(v).padStart(2, '0')}`;
}

/** Parses "h13v10" into its indices; undefined for anything else. */
export function parseTileId(id: string): { h: number; v: number } | undefined {
  const match = /^h(\d{2})v(\d{2})$/.exec(id);
  if (!match) return undefined;
  const h = Number(match[1]);
  const v = Number(match[2]);
  return h < MODIS_TILES_H && v < MODIS_TILES_V ? { h, v } : undefined;
}

function validLatLon(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

/** Forward sinusoidal projection on the MODIS sphere. */
export function toSinusoidal(latitude: number, longitude: number): SinusoidalXY | undefined {
  if (!validLatLon(latitude, longitude)) return undefined;
  const phi = latitude * DEG;
  return { x: MODIS_SPHERE_RADIUS * longitude * DEG * Math.cos(phi), y: MODIS_SPHERE_RADIUS * phi };
}

/** Inverse projection (used by tests and for pixel-centre checks). */
export function fromSinusoidal(x: number, y: number): { latitude: number; longitude: number } {
  const phi = y / MODIS_SPHERE_RADIUS;
  const cos = Math.cos(phi);
  return { latitude: phi / DEG, longitude: cos === 0 ? 0 : x / (MODIS_SPHERE_RADIUS * cos) / DEG };
}

function clampIndex(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max - 1);
}

/** Tile containing a projected coordinate, or undefined outside the 36 x 18 grid. */
export function tileForXY(xy: SinusoidalXY): ModisTile | undefined {
  const fh = (xy.x - MODIS_GRID_ORIGIN_X) / MODIS_TILE_SIZE_M;
  const fv = (MODIS_GRID_ORIGIN_Y - xy.y) / MODIS_TILE_SIZE_M;
  const eps = 1e-9; // poles and the antimeridian land exactly on the grid edge
  if (!(fh >= -eps && fh <= MODIS_TILES_H + eps && fv >= -eps && fv <= MODIS_TILES_V + eps)) return undefined;
  const h = clampIndex(Math.floor(fh), MODIS_TILES_H);
  const v = clampIndex(Math.floor(fv), MODIS_TILES_V);
  return { h, v, id: tileId(h, v) };
}

/** Tile ("h13v10") containing a WGS84 point, or undefined when invalid or outside the grid. */
export function modisTileFor(latitude: number, longitude: number): string | undefined {
  const xy = toSinusoidal(latitude, longitude);
  return xy ? tileForXY(xy)?.id : undefined;
}

/** Tile plus 250 m pixel row/col (0-based, row from the top) for a WGS84 point, using the nominal grid. */
export function modisPixelFor(latitude: number, longitude: number, tilePixels = MODIS_250M_TILE_PIXELS): ModisPixel | undefined {
  const xy = toSinusoidal(latitude, longitude);
  const tile = xy ? tileForXY(xy) : undefined;
  if (!xy || !tile) return undefined;
  const pixel = MODIS_TILE_SIZE_M / tilePixels;
  const col = clampIndex(Math.floor((xy.x - (MODIS_GRID_ORIGIN_X + tile.h * MODIS_TILE_SIZE_M)) / pixel), tilePixels);
  const row = clampIndex(Math.floor(((MODIS_GRID_ORIGIN_Y - tile.v * MODIS_TILE_SIZE_M) - xy.y) / pixel), tilePixels);
  return { ...tile, row, col };
}
