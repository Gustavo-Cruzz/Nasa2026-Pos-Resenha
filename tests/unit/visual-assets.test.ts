import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import p0 from '@/assets/FieldShift_P0_Assets/assets-manifest.json';
import p1 from '@/assets/FieldShift_P1_Assets/assets-p1-manifest.json';

const root = process.cwd();
function pngSize(path: string): [number, number] {
  const buffer = readFileSync(path);
  expect(buffer.subarray(1, 4).toString()).toBe('PNG');
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
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
});
