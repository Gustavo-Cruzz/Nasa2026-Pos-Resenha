import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';

const municipalityGeometryPath = process.argv[2] ?? '/tmp/ibge-malha.json';
const municipalityNamesPath = process.argv[3] ?? '/tmp/ibge-localidades.json';
const zarcCsvPath = process.argv[4] ?? 'dados-abertos-tabua-de-risco-safra-2026-2027.csv';
const extraMunicipalityGeometryPath = process.argv[5] ?? 'data/ibge-2025-extra-municipality-features.json';
const accessedAt = process.env.SOURCE_ACCESSED_AT ?? new Date().toISOString().slice(0, 10);
const configuredZarcSourceUrl = process.env.ZARC_SOURCE_URL;

const municipalityOutput = 'data/brazil-municipalities.json';
const zarcOutput = 'data/brazil-zarc-index.json';
const cultureMap = new Map([
  ['Soja', 'soybean'],
  ['Milho 1ª Safra', 'maize'],
  ['Milho 2ª Safra', 'maize'],
  ['Milho 1ª Safra consorciado com Braquiária', 'maize'],
  ['Milho 2ª Safra consorciado com Braquiária', 'maize'],
  ['Sorgo Granífero', 'sorghum'],
  ['Sorgo Granífero 2ª Safra', 'sorghum'],
  ['Girassol', 'sunflower'],
  ['Feijão Caupi', 'cowpea'],
]);

function collectCoordinates(geometry) {
  const coordinates = [];
  const visit = (value) => {
    if (typeof value?.[0] === 'number' && typeof value?.[1] === 'number') coordinates.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
  };
  visit(geometry.coordinates);
  return coordinates;
}

function bbox(geometry) {
  const coordinates = collectCoordinates(geometry);
  return coordinates.reduce(([minX, minY, maxX, maxY], [x, y]) => [Math.min(minX, x), Math.min(minY, y), Math.max(maxX, x), Math.max(maxY, y)], [Infinity, Infinity, -Infinity, -Infinity]);
}

function sortStrings(values) { return [...values].sort((a, b) => a.localeCompare(b, 'pt-BR')); }
function sortNumbers(values) { return [...values].sort((a, b) => a - b); }
function numberOrNull(value) { const parsed = Number(value); return value === '' || !Number.isFinite(parsed) ? null : parsed; }

const [geojson, localityList, extraGeojson] = await Promise.all([
  readFile(municipalityGeometryPath, 'utf8').then(JSON.parse),
  readFile(municipalityNamesPath, 'utf8').then(JSON.parse),
  readFile(extraMunicipalityGeometryPath, 'utf8').then(JSON.parse),
]);
if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) throw new Error('Invalid IBGE municipality GeoJSON.');
if (!Array.isArray(localityList)) throw new Error('Invalid IBGE locality list.');
const localityByCode = new Map(localityList.map((item) => [String(item.id), { name: item.nome, uf: item.microrregiao?.mesorregiao?.UF?.sigla ?? item['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla }]));
const featuresByCode = new Map([...geojson.features, ...(extraGeojson.features ?? [])].map((feature) => [String(feature.properties?.codarea ?? ''), feature]));
const municipalities = [...featuresByCode.values()].map((feature) => {
  const code = String(feature.properties?.codarea ?? '');
  const locality = localityByCode.get(code);
  if (!/^\d{7}$/.test(code) || !locality?.name || !locality.uf || !feature.geometry) throw new Error(`Incomplete municipality feature ${code}.`);
  return { code, name: locality.name, uf: locality.uf, bbox: bbox(feature.geometry), geometry: feature.geometry };
}).sort((a, b) => a.code.localeCompare(b.code));

const municipalityDocument = {
  version: 1,
  source: {
    institution: 'Instituto Brasileiro de Geografia e Estatística (IBGE)',
    title: 'API de Malhas — municípios do Brasil, qualidade mínima',
    geometryUrl: 'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio',
    localityUrl: 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios',
    officialMeshUrl: 'https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2025/Brasil/BR_Municipios_2025.zip',
    accessedAt,
    referenceSystem: 'SIRGAS 2000 / geographic coordinates',
    geometrySha256: createHash('sha256').update(await readFile(municipalityGeometryPath)).digest('hex'),
    localitySha256: createHash('sha256').update(await readFile(municipalityNamesPath)).digest('hex'),
    officialMeshSha256: '840bbe6f73726ef9d1460ce49fdfe01a278935c41180d3c893e25ca21db083bd',
    extraGeometrySha256: createHash('sha256').update(await readFile(extraMunicipalityGeometryPath)).digest('hex'),
  },
  count: municipalities.length,
  municipalities,
};

const hash = createHash('sha256');
await new Promise((resolve, reject) => {
  const stream = createReadStream(zarcCsvPath);
  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('end', resolve);
  stream.on('error', reject);
});

const aggregate = new Map();
let header;
let rowCount = 0;
const sourceSafras = new Set();
const reader = createInterface({ input: createReadStream(zarcCsvPath), crlfDelay: Infinity });
for await (const line of reader) {
  if (!header) {
    const names = line.replace(/^\uFEFF/, '').split(';');
    header = Object.fromEntries(names.map((name, index) => [name, index]));
    continue;
  }
  const row = line.split(';');
  const at = (name) => row[header[name]] ?? '';
  const cropId = cultureMap.get(at('Nome_cultura'));
  if (!cropId) continue;
  sourceSafras.add(`${at('SafraIni')}/${at('SafraFin')}`);
  const municipalityCode = at('geocodigo');
  if (!/^\d{7}$/.test(municipalityCode)) throw new Error(`Invalid ZARC municipality code: ${municipalityCode}`);
  rowCount += 1;
  const key = `${municipalityCode}:${cropId}`;
  let item = aggregate.get(key);
  if (!item) {
    item = { municipalityCode, cropId, rowCount: 0, zarcCultures: new Set(), cycleCodes: new Set(), soilCodes: new Set(), climateCodes: new Set(), managements: new Set(), ordinances: new Set(), riskCodes: new Set(), decendiosWithRiskCode: new Set() };
    aggregate.set(key, item);
  }
  item.rowCount += 1;
  item.zarcCultures.add(at('Nome_cultura'));
  const cycle = numberOrNull(at('Cod_Ciclo')); if (cycle !== null) item.cycleCodes.add(cycle);
  const soil = numberOrNull(at('Cod_Solo')); if (soil !== null) item.soilCodes.add(soil);
  const climate = numberOrNull(at('Cod_Clima')); if (climate !== null) item.climateCodes.add(climate);
  if (at('Nome_Outros_Manejos')) item.managements.add(at('Nome_Outros_Manejos'));
  if (at('Portaria')) item.ordinances.add(at('Portaria'));
  for (let decendio = 1; decendio <= 36; decendio += 1) {
    const riskCode = numberOrNull(at(`dec${decendio}`));
    if (riskCode !== null && riskCode !== 0) { item.riskCodes.add(riskCode); item.decendiosWithRiskCode.add(decendio); }
  }
}

const entries = [...aggregate.values()].map((item) => ({
  municipalityCode: item.municipalityCode,
  cropId: item.cropId,
  rowCount: item.rowCount,
  zarcCultures: sortStrings(item.zarcCultures),
  cycleCodes: sortNumbers(item.cycleCodes),
  soilCodes: sortNumbers(item.soilCodes),
  climateCodes: sortNumbers(item.climateCodes),
  managements: sortStrings(item.managements),
  ordinances: sortStrings(item.ordinances),
  riskCodes: sortNumbers(item.riskCodes),
  decendiosWithRiskCode: sortNumbers(item.decendiosWithRiskCode),
})).sort((a, b) => a.municipalityCode.localeCompare(b.municipalityCode) || a.cropId.localeCompare(b.cropId));
const municipalityCodes = new Set(municipalities.map((item) => item.code));
const unmatchedMunicipalityCodes = sortStrings(new Set(entries.map((item) => item.municipalityCode).filter((code) => !municipalityCodes.has(code))));
if (sourceSafras.size !== 1) throw new Error(`Expected one annual ZARC safra in filtered rows, found: ${sortStrings(sourceSafras).join(', ')}`);
const [safra] = sourceSafras;
const zarcSourceUrl = configuredZarcSourceUrl ?? (safra === '2026/2027' ? 'https://dados.agricultura.gov.br/dataset/6d3d141c-885e-41a4-ab7f-dc8ff323b96f/resource/139e5a60-1f43-4cc8-aeab-a35dbbf816c0/download/dados-abertos-tabua-de-risco-safra-2026-2027.csv' : null);
if (!zarcSourceUrl) throw new Error('ZARC_SOURCE_URL is required when building a different safra.');

const zarcDocument = {
  version: 1,
  safra,
  status: 'official_MAPA_rows_aggregated_by_municipality_and_P0_crop_raw_codes_not_interpreted',
  source: {
    institution: 'Ministério da Agricultura e Pecuária (MAPA)',
    title: `Zoneamento Agrícola de Risco Climático (Zarc) — Tábua de Risco — Safra ${safra}`,
    url: zarcSourceUrl,
    dictionaryUrl: 'https://dados.agricultura.gov.br/dataset/6d3d141c-885e-41a4-ab7f-dc8ff323b96f/resource/bebb0ebb-bc75-460c-b900-a7a1ebd87bee/download/dicionario-de-dados-tabua-de-risco-2026.pdf',
    accessedAt,
    sha256: hash.digest('hex'),
  },
  aggregation: 'All matching source rows are counted. Dimension codes, ordinances, non-zero raw risk codes and decêndios are unique sorted sets; correlation between dimensions is intentionally not reconstructed or interpreted.',
  sourceRowCount: rowCount,
  entryCount: entries.length,
  municipalityCount: new Set(entries.map((item) => item.municipalityCode)).size,
  cropIds: sortStrings(new Set(entries.map((item) => item.cropId))),
  unmatchedMunicipalityCodes,
  entries,
  notCoveredAsStandaloneCrop: ['ruziziensis'],
};

function serializeZarc(document) {
  const { entries: documentEntries, ...metadata } = document;
  const metadataLines = JSON.stringify(metadata, null, 2).split('\n');
  metadataLines[metadataLines.length - 1] = '  ,"entries": [';
  return `${metadataLines.join('\n')}\n${documentEntries.map((entry) => `    ${JSON.stringify(entry)}`).join(',\n')}\n  ]\n}\n`;
}

await Promise.all([
  writeFile(municipalityOutput, `${JSON.stringify(municipalityDocument)}\n`),
  writeFile(zarcOutput, serializeZarc(zarcDocument)),
]);
console.log(JSON.stringify({ municipalities: municipalities.length, zarcRows: rowCount, zarcEntries: entries.length, zarcMunicipalities: zarcDocument.municipalityCount }, null, 2));
