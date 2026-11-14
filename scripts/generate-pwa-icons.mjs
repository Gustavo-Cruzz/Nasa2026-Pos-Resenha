// Regenerates the app icons (app/icon.svg and the PWA PNGs) from the Plantaê symbol in lib/brand/mark.json.
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const mark = JSON.parse(await readFile('lib/brand/mark.json', 'utf8'));
const size = mark.rows.length;
const cells = mark.rows.flatMap((row, y) => [...row].map((ch, x) => (ch === '.' ? '' : `<rect x="${x}" y="${y}" width="1" height="1" fill="${mark.palette[ch]}"/>`))).join('');
const svg = (inset, background) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-inset} ${-inset} ${size + inset * 2} ${size + inset * 2}" shape-rendering="crispEdges">${background ? `<rect x="${-inset}" y="${-inset}" width="${size + inset * 2}" height="${size + inset * 2}" fill="#142018"/>` : ''}${cells}</svg>`;

await mkdir('public/icons', { recursive: true });
await writeFile('app/icon.svg', svg(1, true));
for (const [name, px, inset] of [['icon-192', 192, 2], ['icon-512', 512, 2], ['icon-maskable-512', 512, 4]]) {
  await sharp(Buffer.from(svg(inset, true)), { density: 300 }).resize(px, px, { kernel: 'nearest' }).png().toFile(`public/icons/${name}.png`);
}
console.log('Plantaê icons written.');
