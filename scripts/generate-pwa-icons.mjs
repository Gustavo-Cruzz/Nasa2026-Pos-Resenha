// Regenerates the PWA icons from the same pixel farmer used in the app (components/pixel/status-character.tsx).
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const palette = { H: '#d9a441', S: '#f1c9a0', E: '#1b2a1e', M: '#8a4b3a', B: '#4f8a3c' };
const rows = ['....HHHH....', '..HHHHHHHH..', 'HHHHHHHHHHHH', '...SSSSSS...', '...SESSES...', '...SSSSSS...', '...SMSSMS...', '....SMMS....', '..BBBBBBBB..', '.BBBBBBBBBB.', '.BB.BBBB.BB.', '....BBBB....'];
const cells = rows.flatMap((row, y) => [...row].map((ch, x) => (ch === '.' ? '' : `<rect x="${x}" y="${y}" width="1" height="1" fill="${palette[ch]}"/>`))).join('');
const svg = (inset) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-inset} ${-inset} ${12 + inset * 2} ${12 + inset * 2}" shape-rendering="crispEdges"><rect x="${-inset}" y="${-inset}" width="${12 + inset * 2}" height="${12 + inset * 2}" fill="#142018"/>${cells}</svg>`;

await mkdir('public/icons', { recursive: true });
for (const [name, size, inset] of [['icon-192', 192, 2], ['icon-512', 512, 2], ['icon-maskable-512', 512, 4]]) {
  await sharp(Buffer.from(svg(inset)), { density: 300 }).resize(size, size, { kernel: 'nearest' }).png().toFile(`public/icons/${name}.png`);
}
