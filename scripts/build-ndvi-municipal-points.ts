import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { representativePointWithMethod, validateMunicipalPoints, type CatalogMunicipality, type PointMethod } from '../lib/brazil/interior-point.ts';
import { NDVI_BRAZIL_DIR, NDVI_BRAZIL_FORMAT_VERSION, type MunicipalPoint, type MunicipalPointsArtifact } from '../lib/climate/ndvi-brazil-types.ts';

const catalogPath = 'data/brazil-municipalities.json';
const bytes = await readFile(catalogPath);
const catalog = JSON.parse(bytes.toString('utf8')) as { count: number; municipalities: CatalogMunicipality[] };

const points: MunicipalPoint[] = [];
const failures: string[] = [];
for (const item of [...catalog.municipalities].sort((a, b) => a.code.localeCompare(b.code))) {
  const result = representativePointWithMethod(item.geometry);
  if (!result) { failures.push(`${item.code} ${item.name}/${item.uf}: no interior point`); continue; }
  points.push({ ibgeCode: item.code, municipality: item.name, uf: item.uf, latitude: result.point[1], longitude: result.point[0], method: result.method, geometryType: item.geometry.type });
}
const errors = [...failures, ...validateMunicipalPoints(points, catalog.municipalities)];
if (catalog.count !== catalog.municipalities.length) errors.push(`catalog count ${catalog.count} != ${catalog.municipalities.length}`);
if (errors.length) {
  console.error(`${errors.length} validation errors; nothing written`);
  for (const error of errors.slice(0, 50)) console.error(`- ${error}`);
  process.exit(1);
}

const artifact: MunicipalPointsArtifact = {
  formatVersion: NDVI_BRAZIL_FORMAT_VERSION,
  generatedAt: new Date().toISOString(),
  catalog: { artifact: 'data/brazil-municipalities.json', sha256: createHash('sha256').update(bytes).digest('hex'), count: catalog.municipalities.length, source: 'IBGE municipal mesh 2025 (see data/brazil-municipalities.json source)' },
  method: 'Centroid of the largest polygon when inside the municipality, otherwise the interior grid point nearest to it; rounded to 4/6 decimals and re-checked with point-in-polygon.',
  count: points.length,
  points,
};
await mkdir(NDVI_BRAZIL_DIR, { recursive: true });
const target = path.join(NDVI_BRAZIL_DIR, 'points.json');
await writeFile(`${target}.tmp`, `${JSON.stringify(artifact)}\n`);
await rename(`${target}.tmp`, target);
const counts = new Map<PointMethod, number>();
for (const point of points) counts.set(point.method, (counts.get(point.method) ?? 0) + 1);
console.log(`wrote ${target}: ${points.length} points, 0 errors`);
for (const [method, count] of counts) console.log(`  ${method}: ${count}`);
