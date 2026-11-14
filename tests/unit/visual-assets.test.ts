import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import p0 from '@/assets/FieldShift_P0_Assets/assets-manifest.json';
import p1 from '@/assets/FieldShift_P1_Assets/assets-p1-manifest.json';
import familySprites from '@/FieldShift_Sprites_16_Culturas_PNG_Integracao/crop-sprites-16.manifest.json';
import { cropSpriteFiles, cropSpriteSource } from '@/components/crops/crop-sprite';

const root = process.cwd();
function pngSize(path: string): [number, number] {
  const buffer = readFileSync(path);
  expect(buffer.subarray(1, 4).toString()).toBe('PNG');
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

function rgbaPixels(path: string): { width: number; height: number; pixels: Buffer } {
  const png = readFileSync(path); const width = png.readUInt32BE(16); const height = png.readUInt32BE(20);
  expect(png[25]).toBe(6); // PNG RGBA colour type.
  const chunks: Buffer[] = []; let offset = 8;
  while (offset < png.length) { const size = png.readUInt32BE(offset); const type = png.subarray(offset + 4, offset + 8).toString(); if (type === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + size)); offset += size + 12; }
  const raw = inflateSync(Buffer.concat(chunks)); const stride = width * 4; const pixels = Buffer.alloc(stride * height);
  for (let y = 0, source = 0; y < height; y += 1) { const filter = raw[source++]; for (let x = 0; x < stride; x += 1, source += 1) { const value = raw[source]; const left = x >= 4 ? pixels[y * stride + x - 4] : 0; const up = y ? pixels[(y - 1) * stride + x] : 0; const upLeft = y && x >= 4 ? pixels[(y - 1) * stride + x - 4] : 0; const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : (() => { const p = left + up - upLeft; const pa = Math.abs(p - left); const pb = Math.abs(p - up); const pc = Math.abs(p - upLeft); return pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft; })(); pixels[y * stride + x] = (value + predictor) & 255; } }
  return { width, height, pixels };
}

describe('visual runtime assets', () => {
  it('publishes every validated P0 and P1 runtime asset', () => {
    for (const item of p0.files) expect(statSync(join(root, item.file)).isFile()).toBe(true);
    for (const item of p1.assets) expect(statSync(join(root, 'public/assets', item.path)).isFile()).toBe(true);
  });

  it('ships optimized 64px sprites for both Brazil 2 crops', () => {
    expect(pngSize(join(root, 'public/assets/crops/common-bean.png'))).toEqual([64, 64]);
    expect(pngSize(join(root, 'public/assets/crops/upland-rice.png'))).toEqual([64, 64]);
    expect(statSync(join(root, 'public/assets/crops/common-bean.png')).size).toBeLessThan(20_000);
    expect(statSync(join(root, 'public/assets/crops/upland-rice.png')).size).toBeLessThan(20_000);
  });

  it('publishes the 16 supplied family-farm PNGs as unique, transparent 64px RGBA sprites', () => {
    expect(familySprites.sprites).toHaveLength(16);
    expect(new Set(familySprites.sprites.map((sprite) => sprite.id)).size).toBe(16);
    for (const sprite of familySprites.sprites) {
      const path = join(root, sprite.assetPath);
      expect(statSync(path).isFile()).toBe(true);
      const decoded = rgbaPixels(path);
      expect([decoded.width, decoded.height]).toEqual([64, 64]);
      const alpha = (x: number, y: number) => decoded.pixels[(y * decoded.width + x) * 4 + 3];
      expect([alpha(0, 0), alpha(63, 0), alpha(0, 63), alpha(63, 63)]).toEqual([0, 0, 0, 0]);
      expect(decoded.pixels.filter((_, index) => index % 4 === 3).some((value) => value === 0)).toBe(true);
    }
  });

  it('maps every family-farm catalog sprite and retains the unknown fallback', () => {
    for (const sprite of familySprites.sprites) {
      expect(cropSpriteFiles[sprite.id]).toBe(sprite.id);
      expect(cropSpriteSource(sprite.id)).toBe(`/assets/crops/${sprite.id}.png`);
    }
    expect(cropSpriteSource('not_a_catalog_crop')).toBe('/assets/interactions/unknown-placeholder.png');
  });
});
