import { describe, expect, it } from 'vitest';
import {
  MODIS_250M_PIXEL_SIZE_M, MODIS_GRID_ORIGIN_X, MODIS_GRID_ORIGIN_Y, MODIS_TILE_SIZE_M,
  fromSinusoidal, modisPixelFor, modisTileFor, parseTileId, tileId, toSinusoidal,
} from '@/lib/climate/modis-sinusoidal';
import { NDVI_FIXTURE_SITES } from '@/lib/climate/ndvi';

// Tile ids confirmed against Planetary Computer STAC items (modis:horizontal-tile / modis:vertical-tile) on 2026-11-15.
const EXPECTED_TILES: Record<string, string> = {
  'rio-verde': 'h13v10',
  'rio-verde-campo': 'h13v10',
  'sorriso-campo': 'h12v10',
  'luis-eduardo-magalhaes-campo': 'h13v10',
  'cascavel-campo': 'h13v11',
  accra: 'h17v08',
  'new-delhi': 'h24v06',
};

describe('MODIS sinusoidal grid', () => {
  it('uses the MODIS Land grid constants', () => {
    expect(MODIS_250M_PIXEL_SIZE_M).toBeCloseTo(231.656358, 5);
    expect(MODIS_GRID_ORIGIN_X).toBeCloseTo(-20015109.354, 2);
    expect(MODIS_GRID_ORIGIN_Y).toBeCloseTo(10007554.677, 2);
  });

  it('places the fixture sites in the tiles the STAC catalog lists for them', () => {
    for (const site of NDVI_FIXTURE_SITES) expect(modisTileFor(site.latitude, site.longitude), site.slug).toBe(EXPECTED_TILES[site.slug]);
  });

  it('projects Rio Verde to the pixel the Planetary Computer point API reads (row 3743, col 728 of h13v10)', () => {
    const xy = toSinusoidal(-17.798, -50.919);
    expect(xy?.x).toBeCloseTo(-5390960.7188, 3);
    expect(xy?.y).toBeCloseTo(-1979049.5351, 3);
    expect(modisPixelFor(-17.798, -50.919)).toEqual({ h: 13, v: 10, id: 'h13v10', row: 3743, col: 728 });
    // Same answer from the item's proj:transform (origin -5559752.598333, -1111950.519667; 231.65635826375 m).
    const gt = { ox: -5559752.598333, oy: -1111950.519667, p: 231.65635826375006 };
    expect(Math.floor(((xy?.x ?? 0) - gt.ox) / gt.p)).toBe(728);
    expect(Math.floor((gt.oy - (xy?.y ?? 0)) / gt.p)).toBe(3743);
  });

  it('maps the origin, tile corners and round-trips', () => {
    expect(modisPixelFor(0, 0)).toEqual({ h: 18, v: 9, id: 'h18v09', row: 0, col: 0 });
    const corner = fromSinusoidal(MODIS_GRID_ORIGIN_X + 13 * MODIS_TILE_SIZE_M + 1, MODIS_GRID_ORIGIN_Y - 10 * MODIS_TILE_SIZE_M - 1);
    expect(modisPixelFor(corner.latitude, corner.longitude)).toMatchObject({ id: 'h13v10', row: 0, col: 0 });
    const back = fromSinusoidal(toSinusoidal(-12.2, -45.9)!.x, toSinusoidal(-12.2, -45.9)!.y);
    expect(back.latitude).toBeCloseTo(-12.2, 9);
    expect(back.longitude).toBeCloseTo(-45.9, 9);
  });

  it('rejects invalid coordinates and keeps the poles inside the grid', () => {
    expect(modisTileFor(Number.NaN, 0)).toBeUndefined();
    expect(modisTileFor(91, 0)).toBeUndefined();
    expect(modisTileFor(0, 181)).toBeUndefined();
    expect(modisTileFor(90, 0)).toBe('h18v00');
    expect(modisTileFor(-90, 0)).toBe('h18v17');
  });

  it('formats and parses tile ids', () => {
    expect(tileId(8, 9)).toBe('h08v09');
    expect(parseTileId('h13v10')).toEqual({ h: 13, v: 10 });
    expect(parseTileId('h36v00')).toBeUndefined();
    expect(parseTileId('13v10')).toBeUndefined();
  });
});
