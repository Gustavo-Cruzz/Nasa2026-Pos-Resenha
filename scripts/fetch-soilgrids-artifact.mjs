import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';

const requestedLocation = { latitude: Number(process.env.SOIL_LATITUDE ?? -17.798), longitude: Number(process.env.SOIL_LONGITUDE ?? -50.919) };
const slug = process.env.SOIL_ARTIFACT_SLUG ?? 'rio-verde';
const version = process.env.SOIL_ARTIFACT_ID ?? `soilgrids-${slug}-${new Date().toISOString().slice(0, 10)}-v1`;
const output = resolve(process.env.SOIL_ARTIFACT_OUTPUT ?? `data/soilgrids/${slug}-0-5cm.json`);
const metadataOutput = resolve(process.env.SOIL_ARTIFACT_META_OUTPUT ?? `data/soilgrids/${slug}-0-5cm.meta.json`);
const source = 'https://maps.isric.org/mapserv';
const crs = 'http://www.opengis.net/def/crs/EPSG/0/152160';
const grid = { minX: -19949750, maxY: 8361000, resolutionM: 250 };

const properties = {
  phh2o: { unit: 'pH', factor: 10 },
  soc: { unit: 'g/kg', factor: 10 },
  clay: { unit: '%', factor: 10 },
  sand: { unit: '%', factor: 10 },
  silt: { unit: '%', factor: 10 },
  cec: { unit: 'cmol(c)/kg', factor: 10 },
  bdod: { unit: 'kg/dm³', factor: 100 },
};

function mollweide({ latitude, longitude }) {
  const radius = 6371007.181;
  const phi = latitude * Math.PI / 180;
  let theta = phi;
  for (let i = 0; i < 20; i += 1) theta -= (2 * theta + Math.sin(2 * theta) - Math.PI * Math.sin(phi)) / (2 + 2 * Math.cos(2 * theta));
  return { x: 2 * Math.SQRT2 * radius / Math.PI * longitude * Math.PI / 180 * Math.cos(theta), y: Math.SQRT2 * radius * Math.sin(theta) };
}

function cellAt(point) {
  const column = Math.floor((point.x - grid.minX) / grid.resolutionM);
  const row = Math.floor((grid.maxY - point.y) / grid.resolutionM);
  const minX = grid.minX + column * grid.resolutionM;
  const maxY = grid.maxY - row * grid.resolutionM;
  return { column, row, minX, maxX: minX + grid.resolutionM, minY: maxY - grid.resolutionM, maxY };
}

function tagValue(bytes, offset, type, count, valueOffset) {
  const sizes = { 3: 2, 4: 4 };
  const size = sizes[type];
  if (!size || count !== 1) throw new Error(`Unsupported TIFF tag encoding: type=${type}, count=${count}`);
  const start = size <= 4 ? offset + 8 : valueOffset;
  return type === 3 ? bytes.readUInt16LE(start) : bytes.readUInt32LE(start);
}

/** Reads the single signed int16 sample returned by the constrained WCS request. */
export function readSingleInt16GeoTiff(bytes) {
  if (bytes.toString('ascii', 0, 2) !== 'II' || bytes.readUInt16LE(2) !== 42) throw new Error('Expected little-endian classic TIFF.');
  const ifd = bytes.readUInt32LE(4); const entries = bytes.readUInt16LE(ifd); const tags = new Map();
  const needed = new Set([256, 257, 258, 259, 273, 279, 324, 325, 339]);
  for (let i = 0; i < entries; i += 1) {
    const at = ifd + 2 + i * 12; const id = bytes.readUInt16LE(at);
    if (!needed.has(id)) continue;
    const type = bytes.readUInt16LE(at + 2); const count = bytes.readUInt32LE(at + 4);
    tags.set(id, tagValue(bytes, at, type, count, bytes.readUInt32LE(at + 8)));
  }
  if (tags.get(256) !== 1 || tags.get(257) !== 1 || tags.get(258) !== 16 || tags.get(339) !== 2) throw new Error('Expected one signed int16 WCS pixel.');
  const offset = tags.get(273) ?? tags.get(324); const byteCount = tags.get(279) ?? tags.get(325);
  if (offset === undefined || byteCount === undefined) throw new Error('TIFF has no strip or tile data offset.');
  const compressed = bytes.subarray(offset, offset + byteCount);
  const payload = tags.get(259) === 8 ? inflateSync(compressed) : compressed;
  return payload.readInt16LE(0);
}

function wcsUrl(property, quantile, cell) {
  const params = new URLSearchParams({ map: `/map/${property}.map`, SERVICE: 'WCS', VERSION: '2.0.1', REQUEST: 'GetCoverage', COVERAGEID: `${property}_0-5cm_${quantile}`, FORMAT: 'GEOTIFF_INT16', SUBSETTINGCRS: crs, OUTPUTCRS: crs });
  params.append('SUBSET', `X(${cell.minX},${cell.maxX})`); params.append('SUBSET', `Y(${cell.minY},${cell.maxY})`);
  return `${source}?${params}`;
}

async function fetchRaw(property, quantile, cell) {
  const url = wcsUrl(property, quantile, cell); const response = await fetch(url);
  if (!response.ok) throw new Error(`WCS ${property}/${quantile}: HTTP ${response.status}`);
  return { url, raw: readSingleInt16GeoTiff(Buffer.from(await response.arrayBuffer())) };
}

async function main() {
  if (!Number.isFinite(requestedLocation.latitude) || requestedLocation.latitude < -90 || requestedLocation.latitude > 90 || !Number.isFinite(requestedLocation.longitude) || requestedLocation.longitude < -180 || requestedLocation.longitude > 180) throw new Error('SOIL_LATITUDE/SOIL_LONGITUDE must be valid decimal coordinates.');
  const projected = mollweide(requestedLocation); const cell = cellAt(projected); const attributes = [];
  for (const [id, definition] of Object.entries(properties)) {
    const samples = {};
    for (const quantile of ['Q0.05', 'Q0.5', 'Q0.95']) samples[quantile] = await fetchRaw(id, quantile, cell);
    const values = Object.fromEntries(Object.entries(samples).map(([quantile, sample]) => [quantile, sample.raw === -32768 ? null : sample.raw / definition.factor]));
    if (Object.values(values).some((value) => value === null)) throw new Error(`No-data response for ${id}.`);
    attributes.push({ id, value: values['Q0.5'], unit: definition.unit, depthCm: { min: 0, max: 5 }, resolutionM: grid.resolutionM, uncertainty: { type: '90% prediction interval', lower: values['Q0.05'], upper: values['Q0.95'], unit: definition.unit }, sourceUrls: Object.values(samples).map((sample) => sample.url) });
  }
  const artifact = { schemaVersion: 1, id: version, status: 'available', classification: 'estimated', provider: 'SoilGrids 2.0 / ISRIC World Soil Information', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', citation: 'Poggio et al. (2021), SoilGrids 2.0: producing soil information for the globe with quantified spatial uncertainty, https://doi.org/10.5194/soil-7-217-2021', retrievedAt: new Date().toISOString(), requestedLocation, projectedCrs: crs, projectedCoordinate: projected, pixel: { ...cell, resolutionM: grid.resolutionM }, attributes, limitations: ['Machine-learning spatial prediction, not a laboratory measurement.', 'Native 250 m pixel support is unsuitable for asserting a field-scale soil condition.', 'Only the exact requested coordinate may use this artifact.', 'No map value replaces farmer-provided local laboratory data.'] };
  await mkdir(dirname(output), { recursive: true }); await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`);
  const sha256 = createHash('sha256').update(await readFile(output)).digest('hex');
  await writeFile(metadataOutput, `${JSON.stringify({ artifact: 'rio-verde-0-5cm.json', sha256, generatedBy: 'scripts/fetch-soilgrids-artifact.mjs', generatedAt: artifact.retrievedAt, source, sourceProduct: 'SoilGrids 2.0 WCS', sourceLicense: artifact.license, requestedLocation, properties: Object.keys(properties), depthCm: '0-5', resolutionM: 250, uncertainty: 'Q0.05 to Q0.95, documented 90% prediction interval', reproducibility: 'Run npm run fetch:soilgrids-rio-verde; review both artifact and hash before committing.' }, null, 2)}\n`);
  console.log(`Wrote ${output} (${sha256})`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error); process.exitCode = 1; });
