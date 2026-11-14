import markData from '@/lib/brand/mark.json';

export const BRAND_NAME = 'Plantaê';
export const BRAND_TAGLINE = { 'pt-BR': 'Explore possibilidades. Entenda os limites.', en: 'Explore possibilities. Understand the limits.' } as const;
export const BRAND_LIME = '#b6dc63';

export type PixelRect = { x: number; y: number; w: number; fill: string };

/** Horizontal runs of equal pixels, so the SVG stays small. */
export function markRects(): PixelRect[] {
  const palette = markData.palette as Record<string, string>;
  const rects: PixelRect[] = [];
  markData.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.') { x += 1; continue; }
      let w = 1;
      while (row[x + w] === ch) w += 1;
      rects.push({ x, y, w, fill: palette[ch] });
      x += w;
    }
  });
  return rects;
}
export const MARK_SIZE = markData.rows.length;
