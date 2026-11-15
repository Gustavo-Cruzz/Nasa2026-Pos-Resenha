import { cropSpriteFiles } from '@/lib/crop-sprite-files';
import type { CropPresence } from '@/lib/future-farm/types';

export const FARM_BASE = '/assets/farm-stories/backgrounds/farm-base-960x540.png';
export const GENERIC_CROP_SPRITE = '/assets/farm-stories/crop-overlays/unknown-generic.png';
/** Expanded pack overlays; only used when the canonical `/assets/crops` sprite is missing. */
export const FARM_OVERLAY_IDS = new Set(['maize', 'soybean', 'sorghum', 'sunflower', 'cowpea', 'ruziziensis']);
export const SCENE_WIDTH = 960;
export const SCENE_HEIGHT = 540;

/**
 * Sprite resolution order from the spec: canonical crop sprite, then the
 * farm-stories overlay, then the generic fallback (which always keeps the
 * crop name visible in the legend). Never swaps in another crop.
 */
export function farmSpriteSource(cropId: string): { src: string; generic: boolean } {
  const file = cropSpriteFiles[cropId];
  if (file) return { src: `/assets/crops/${file}.png`, generic: false };
  if (FARM_OVERLAY_IDS.has(cropId)) return { src: `/assets/farm-stories/crop-overlays/${cropId}.png`, generic: false };
  return { src: GENERIC_CROP_SPRITE, generic: true };
}

/** Row baselines (y), plant height and spacing in the 960×540 base, matching the supplied render script. */
const ROWS: ReadonlyArray<readonly [baseline: number, height: number, step: number]> = [[218, 34, 29], [252, 43, 37], [292, 55, 44], [348, 74, 52], [408, 94, 62], [477, 121, 76], [538, 147, 92]];

export interface PlantPlacement { key: string; cropId: string; src: string; row: number; leftPct: number; topPct: number; widthPct: number; heightPct: number; delayMs: number }
export interface SceneLayout { plants: PlantPlacement[]; legend: Array<{ cropId: string; label: string; src: string; generic: boolean; role: CropPresence['role']; rows: number[] }> }

/** Small deterministic PRNG so the same crops always produce the same picture (no jumps between cycles). */
function mulberry32(seed: number) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/**
 * Pure scene composition. One crop fills every row; an intercrop alternates
 * rows by species. The pattern is schematic: it never encodes sowing ratio,
 * spacing, competition, vigour, yield or the scenario letter. Plant size is
 * identical for every crop, so the same crop looks the same in A, B and C.
 */
export function composeFarmScene(crops: CropPresence[]): SceneLayout {
  const unique = crops.filter((crop, index) => crops.findIndex((item) => item.cropId === crop.cropId) === index);
  if (!unique.length) return { plants: [], legend: [] };
  const sprites = unique.map((crop) => farmSpriteSource(crop.known ? crop.cropId : `__unknown__${crop.cropId}`));
  const random = mulberry32(813);
  const plants: PlantPlacement[] = [];
  ROWS.forEach(([baseline, height, step], row) => {
    const speciesIndex = row % unique.length;
    const crop = unique[speciesIndex];
    const width = height * 0.9;
    for (let j = 0; j < Math.ceil(860 / step) + 2; j += 1) {
      const x = 118 + j * step + (row % 2) * Math.floor(step / 2) + Math.floor(random() * 11) - 5;
      if (x > 940) continue;
      const top = Math.max(0, Math.min(534, baseline) - height + 2);
      plants.push({ key: `${row}-${j}`, cropId: crop.cropId, src: sprites[speciesIndex].src, row, leftPct: (x / SCENE_WIDTH) * 100, topPct: (top / SCENE_HEIGHT) * 100, widthPct: (width / SCENE_WIDTH) * 100, heightPct: (height / SCENE_HEIGHT) * 100, delayMs: ((j * 67 + row * 42) % 600) * 3 });
    }
  });
  const legend = unique.map((crop, index) => ({ cropId: crop.cropId, label: crop.label, src: sprites[index].src, generic: sprites[index].generic, role: crop.role, rows: ROWS.map((_, row) => row).filter((row) => row % unique.length === index) }));
  return { plants, legend };
}
