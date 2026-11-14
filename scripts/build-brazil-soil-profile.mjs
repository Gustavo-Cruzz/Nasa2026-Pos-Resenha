import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fromFile } from 'geotiff';

const municipalitiesPath = resolve('data/brazil-municipalities.json');
const outputPath = resolve('data/soil/brazil-municipal-soil-v1.json');
const cacheDirectory = resolve(process.env.SOILGRIDS_CACHE_DIR ?? '.cache/soilgrids-5000m');
const execute = process.argv.includes('--execute');
const baseUrl = 'https://files.isric.org/soilgrids/latest/data_aggregated/5000m';
const depths = [{ id: '0-5cm', weight: 5 }, { id: '5-15cm', weight: 10 }, { id: '15-30cm', weight: 15 }];
const properties = {
  phh2o: { factor: 10, unit: 'pH' }, soc: { factor: 10, unit: 'g/kg' }, clay: { factor: 10, unit: '%' }, sand: { factor: 10, unit: '%' }, silt: { factor: 10, unit: '%' },
  cec: { factor: 10, unit: 'cmol(c)/kg' }, bdod: { factor: 100, unit: 'kg/dm3' }, wv0033: { factor: 10, unit: '%' }, wv1500: { factor: 10, unit: '%' },
};
const nativeCrs = '+proj=igh +datum=WGS84 +units=m +no_defs';

function onSegment([x, y], [ax, ay], [bx, by]) { const cross = (y - ay) * (bx - ax) - (x - ax) * (by - ay); return Math.abs(cross) <= 1e-9 && x >= Math.min(ax, bx) && x <= Math.max(ax, bx) && y >= Math.min(ay, by) && y <= Math.max(ay, by); }
function inRing(point, ring) { let inside = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) { if (onSegment(point, ring[j], ring[i])) return true; const [x, y] = point; const [xi, yi] = ring[i]; const [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; } return inside; }
function contains(point, geometry) { const inPolygon = (polygon) => polygon[0] && inRing(point, polygon[0]) && !polygon.slice(1).some((hole) => inRing(point, hole)); return geometry.type === 'Polygon' ? inPolygon(geometry.coordinates) : geometry.coordinates.some(inPolygon); }
function ringArea(ring) { return ring.reduce((sum, [x, y], index) => { const [nx, ny] = ring[(index + 1) % ring.length]; return sum + x * ny - nx * y; }, 0) / 2; }
function representativePoint(record) {
  const polygons = record.geometry.type === 'Polygon' ? [record.geometry.coordinates] : record.geometry.coordinates;
  const polygon = [...polygons].sort((a, b) => Math.abs(ringArea(b[0])) - Math.abs(ringArea(a[0])))[0]; const ring = polygon?.[0]; if (!ring?.length) return null;
  const area = ringArea(ring); let point;
  if (Math.abs(area) > 1e-12) { let cx = 0; let cy = 0; ring.forEach(([x, y], index) => { const [nx, ny] = ring[(index + 1) % ring.length]; const cross = x * ny - nx * y; cx += (x + nx) * cross; cy += (y + ny) * cross; }); point = [cx / (6 * area), cy / (6 * area)]; }
  if (point && contains(point, record.geometry)) return point;
  const [minX, minY, maxX, maxY] = record.bbox; const center = [(minX + maxX) / 2, (minY + maxY) / 2]; let best = null; let distance = Infinity;
  for (let x = 0; x <= 60; x += 1) for (let y = 0; y <= 60; y += 1) { const candidate = [minX + (maxX - minX) * x / 60, minY + (maxY - minY) * y / 60]; const d = (candidate[0] - center[0]) ** 2 + (candidate[1] - center[1]) ** 2; if (d < distance && contains(candidate, record.geometry)) { best = candidate; distance = d; } }
  return best;
}
function candidatePoints(record) {
  const primary = representativePoint(record); const [minX, minY, maxX, maxY] = record.bbox; const center = [(minX + maxX) / 2, (minY + maxY) / 2]; const candidates = primary ? [primary] : [];
  for (let x = 0; x <= 6; x += 1) for (let y = 0; y <= 6; y += 1) { const point = [minX + (maxX - minX) * (x + 0.5) / 7, minY + (maxY - minY) * (y + 0.5) / 7]; if (contains(point, record.geometry)) candidates.push(point); }
  return candidates.filter((point, index) => candidates.findIndex((other) => Math.abs(other[0] - point[0]) < 1e-9 && Math.abs(other[1] - point[1]) < 1e-9) === index).sort((a, b) => (a === primary ? -1 : b === primary ? 1 : ((a[0] - center[0]) ** 2 + (a[1] - center[1]) ** 2) - ((b[0] - center[0]) ** 2 + (b[1] - center[1]) ** 2)));
}
function textureClass({ clay, sand, silt }) { if ([clay, sand, silt].some((value) => value === null)) return null; if (clay > 60) return 'very_clayey'; if (clay >= 35) return 'clayey'; if (clay < 35 && sand <= 15) return 'silty'; if (clay < 15 && sand - clay > 70) return 'sandy'; return 'medium'; }
const round = (value, digits = 2) => value === null ? null : Number(value.toFixed(digits));

async function download(url, path) {
  let failure;
  for (let attempt = 1; attempt <= 4; attempt += 1) try { const response = await fetch(url); if (!response.ok) throw new Error(`HTTP ${response.status}`); await writeFile(path, Buffer.from(await response.arrayBuffer())); return; } catch (error) { failure = error; }
  throw new Error(`SoilGrids download failed after 4 attempts: ${url}`, { cause: failure });
}
function sourceLocation(property, depth) { const filename = `${property}_${depth}_mean_5000.tif`; return { path: resolve(cacheDirectory, filename), url: `${baseUrl}/${property}/${filename}` }; }
async function ensureSources() {
  const queue = Object.keys(properties).flatMap((property) => depths.map(({ id }) => sourceLocation(property, id))).filter(({ path }) => !existsSync(path));
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(3, queue.length) }, async () => { while (cursor < queue.length) { const item = queue[cursor]; cursor += 1; await download(item.url, item.path); } }));
}
async function raster(property, depth) {
  const { path, url } = sourceLocation(property, depth);
  if (!existsSync(path)) throw new Error(`Missing cached SoilGrids source after acquisition: ${path}`);
  const bytes = await readFile(path); const dataset = await fromFile(path); const image = await dataset.getImage();
  const [pixels] = await image.readRasters();
  return { property, depth, url, path, sha256: createHash('sha256').update(bytes).digest('hex'), width: image.getWidth(), height: image.getHeight(), pixels, origin: image.getOrigin(), resolution: image.getResolution(), noData: image.getGDALNoData() };
}
function projectPoints(points) {
  const input = `${points.map((point) => `${point[0]} ${point[1]}`).join('\n')}\n`;
  const output = execFileSync('cs2cs', ['-f', '%.6f', '+proj=longlat', '+datum=WGS84', '+no_defs', '+to', ...nativeCrs.split(' ')], { input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const lines = output.trim().split('\n'); if (lines.length !== points.length) throw new Error(`Expected ${points.length} projected points, received ${lines.length}.`);
  return lines.map((line) => line.trim().split(/\s+/).slice(0, 2).map(Number));
}
function sample(layer, [x, y]) {
  const column = Math.floor((x - layer.origin[0]) / layer.resolution[0]); const row = Math.floor((y - layer.origin[1]) / layer.resolution[1]);
  if (column < 0 || row < 0 || column >= layer.width || row >= layer.height) return null;
  const raw = layer.pixels[row * layer.width + column]; return raw === layer.noData ? null : raw;
}

async function main() {
  if (!execute) { console.log('Validated builder configuration. Add --execute to download official rasters and write the national artifact.'); return; }
  await mkdir(cacheDirectory, { recursive: true }); await mkdir(resolve('data/soil'), { recursive: true });
  await ensureSources();
  const sourceBytes = await readFile(municipalitiesPath); const source = JSON.parse(sourceBytes); const records = source.municipalities.map((record) => ({ record, candidates: candidatePoints(record) }));
  if (records.some(({ candidates }) => !candidates.length)) throw new Error('Every municipality must have an interior reference point.');
  const allPoints = records.flatMap(({ candidates }) => candidates); const allProjected = projectPoints(allPoints); let projectedCursor = 0;
  for (const record of records) { record.projectedCandidates = record.candidates.map(() => allProjected[projectedCursor++]); }
  const selectionLayers = await Promise.all(depths.map(({ id }) => raster('phh2o', id)));
  for (const record of records) { const chosen = record.projectedCandidates.findIndex((point) => selectionLayers.every((layer) => sample(layer, point) !== null)); const index = chosen >= 0 ? chosen : 0; record.point = record.candidates[index]; record.projected = record.projectedCandidates[index]; }
  const entries = Object.fromEntries(records.map(({ record, point }) => [record.code, { municipality: { code: record.code, name: record.name, uf: record.uf }, referencePoint: { longitude: round(point[0], 6), latitude: round(point[1], 6) }, depthCm: { min: 0, max: 30 }, classification: 'estimated', attributes: {}, textureClass: null }]));
  const sources = [];
  for (const [property, definition] of Object.entries(properties)) {
    const weighted = new Map(records.map(({ record }) => [record.code, { sum: 0, weight: 0 }]));
    for (const depth of depths) {
      const layer = await raster(property, depth.id); sources.push({ property, depth: depth.id, url: layer.url, sha256: layer.sha256 });
      for (const { record, projected: point } of records) { const raw = sample(layer, point); if (raw === null) continue; const accumulator = weighted.get(record.code); accumulator.sum += raw / definition.factor * depth.weight; accumulator.weight += depth.weight; }
    }
    for (const { record } of records) { const value = weighted.get(record.code); entries[record.code].attributes[property] = { value: value.weight === 30 ? round(value.sum / value.weight) : null, unit: definition.unit }; }
  }
  for (const entry of Object.values(entries)) entry.textureClass = textureClass({ clay: entry.attributes.clay.value, sand: entry.attributes.sand.value, silt: entry.attributes.silt.value });
  const available = Object.values(entries).filter((entry) => Object.values(entry.attributes).every((attribute) => attribute.value !== null)).length;
  const artifact = { schemaVersion: 1, id: 'soilgrids-brazil-municipal-0-30cm-5000m-v1', status: available === records.length ? 'available' : 'partial', generatedAt: new Date().toISOString(), classification: 'estimated', aggregation: 'Depth-weighted value at one verified interior reference point per IBGE municipality; not a municipal zonal statistic or field measurement.', municipalitySource: { artifact: 'data/brazil-municipalities.json', sha256: createHash('sha256').update(sourceBytes).digest('hex') }, provider: 'SoilGrids 2.0 / ISRIC World Soil Information', license: 'CC BY 4.0', citation: 'Poggio et al. (2021), SoilGrids 2.0, https://doi.org/10.5194/soil-7-217-2021', resolutionM: 5000, coverage: { totalMunicipalities: records.length, completeMunicipalities: available }, sources, entries, limitations: ['Values are modelled spatial estimates at a municipal interior reference point, not laboratory measurements or municipal averages.', 'Water-content layers describe retention at specified pressure heads; they are not current soil moisture.', 'No value may be used to prescribe fertiliser, liming, irrigation or expected yield.'] };
  await writeFile(outputPath, `${JSON.stringify(artifact)}\n`); console.log(`Wrote ${outputPath}: ${available}/${records.length} complete municipalities.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
