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
  ['Feijão 1ª Safra', 'common_bean'],
  ['Feijão', 'common_bean'],
  ['Feijão 2ª Safra', 'common_bean'],
  ['Feijão 3ª Safra', 'common_bean'],
  ['Arroz de Sequeiro', 'upland_rice'],
  ['Arroz', 'upland_rice'],
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

const base64Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
// 36 decêndios -> 12 characters (one per month): each decêndio is 2 bits (0 none, 1/2/3 = CSV 20/30/40), 3 decêndios per base64 char.
function packRisk(riskString) {
  let out = '';
  for (let month = 0; month < 12; month += 1) {
    let bits = 0;
    for (let k = 0; k < 3; k += 1) bits = (bits << 2) | { 0: 0, 2: 1, 3: 2, 4: 3 }[riskString[month * 3 + k]];
    out += base64Alphabet[bits];
  }
  return out;
}
function packWindows(item, cultures, managements) {
  const groups = new Map();
  for (const w of item.windows.values()) {
    const key = [w.culture, w.management ?? '', w.cycle ?? '', w.riskString].join('|');
    const group = groups.get(key) ?? { culture: w.culture, management: w.management, cycle: w.cycle, riskString: w.riskString, soils: new Set() };
    if (w.soil !== null) group.soils.add(w.soil);
    groups.set(key, group);
  }
  const merged = new Map();
  for (const g of groups.values()) {
    const soils = sortNumbers(g.soils);
    const key = [g.culture, g.management ?? '', soils.join(','), g.riskString].join('|');
    const target = merged.get(key) ?? { culture: g.culture, management: g.management, cycles: new Set(), soils, riskString: g.riskString };
    if (g.cycle !== null) target.cycles.add(g.cycle);
    merged.set(key, target);
  }
  return [...merged.values()]
    .map((g) => [cultures.indexOf(g.culture), g.management === null ? -1 : managements.indexOf(g.management), sortNumbers(g.cycles), g.soils, packRisk(g.riskString)])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2].join().localeCompare(b[2].join()) || a[4].localeCompare(b[4]));
}
function sortStrings(values) { return [...values].sort((a, b) => a.localeCompare(b, 'pt-BR')); }
function sortNumbers(values) { return [...values].sort((a, b) => a - b); }
function numberOrNull(value) { const parsed = Number(value); return value === '' || !Number.isFinite(parsed) ? null : parsed; }

const zarcOnly = process.env.ZARC_ONLY === '1';
const [geojson, localityList, extraGeojson] = zarcOnly ? [{ type: 'FeatureCollection', features: [] }, [], { features: [] }] : await Promise.all([
  readFile(municipalityGeometryPath, 'utf8').then(JSON.parse),
  readFile(municipalityNamesPath, 'utf8').then(JSON.parse),
  readFile(extraMunicipalityGeometryPath, 'utf8').then(JSON.parse),
]);
if (!zarcOnly && (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features))) throw new Error('Invalid IBGE municipality GeoJSON.');
if (!zarcOnly && !Array.isArray(localityList)) throw new Error('Invalid IBGE locality list.');
const localityByCode = new Map(localityList.map((item) => [String(item.id), { name: item.nome, uf: item.microrregiao?.mesorregiao?.UF?.sigla ?? item['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla }]));
const featuresByCode = new Map([...geojson.features, ...(extraGeojson.features ?? [])].map((feature) => [String(feature.properties?.codarea ?? ''), feature]));
const municipalities = zarcOnly ? JSON.parse(await readFile(municipalityOutput, 'utf8')).municipalities : [...featuresByCode.values()].map((feature) => {
  const code = String(feature.properties?.codarea ?? '');
  const locality = localityByCode.get(code);
  if (!/^\d{7}$/.test(code) || !locality?.name || !locality.uf || !feature.geometry) throw new Error(`Incomplete municipality feature ${code}.`);
  return { code, name: locality.name, uf: locality.uf, bbox: bbox(feature.geometry), geometry: feature.geometry };
}).sort((a, b) => a.code.localeCompare(b.code));

const municipalityDocument = zarcOnly ? null : {
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
  if (cropId === 'upland_rice' && at('Nome_Outros_Manejos') !== 'Sequeiro') continue;
  sourceSafras.add(`${at('SafraIni')}/${at('SafraFin')}`);
  const municipalityCode = at('geocodigo');
  if (!/^\d{7}$/.test(municipalityCode)) throw new Error(`Invalid ZARC municipality code: ${municipalityCode}`);
  rowCount += 1;
  const key = `${municipalityCode}:${cropId}`;
  let item = aggregate.get(key);
  if (!item) {
    item = { municipalityCode, cropId, rowCount: 0, zarcCultures: new Set(), cycleCodes: new Set(), soilCodes: new Set(), climateCodes: new Set(), managements: new Set(), ordinances: new Set(), riskCodes: new Set(), decendiosWithRiskCode: new Set(), windows: new Map() };
    aggregate.set(key, item);
  }
  item.rowCount += 1;
  item.zarcCultures.add(at('Nome_cultura'));
  const cycle = numberOrNull(at('Cod_Ciclo')); if (cycle !== null) item.cycleCodes.add(cycle);
  const soil = numberOrNull(at('Cod_Solo')); if (soil !== null) item.soilCodes.add(soil);
  const climate = numberOrNull(at('Cod_Clima')); if (climate !== null) item.climateCodes.add(climate);
  if (at('Nome_Outros_Manejos')) item.managements.add(at('Nome_Outros_Manejos'));
  if (at('Portaria')) item.ordinances.add(at('Portaria'));
  let riskString = '';
  for (let decendio = 1; decendio <= 36; decendio += 1) {
    const riskCode = numberOrNull(at(`dec${decendio}`));
    if (riskCode !== null && riskCode !== 0) { item.riskCodes.add(riskCode); item.decendiosWithRiskCode.add(decendio); }
    // One character per decêndio: '0' = no code (not indicated); otherwise the first digit of the raw code (2/3/4 = 20/30/40).
    if (riskCode === null || riskCode === 0) riskString += '0';
    else if ([20, 30, 40].includes(riskCode)) riskString += String(riskCode / 10);
    else throw new Error(`Unexpected ZARC risk code ${riskCode} (${municipalityCode} ${at('Nome_cultura')}).`);
  }
  item.windows.set([at('Nome_cultura'), at('Nome_Outros_Manejos'), cycle ?? '', soil ?? '', riskString].join('|'), { culture: at('Nome_cultura'), management: at('Nome_Outros_Manejos') || null, cycle, soil, riskString });
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
  // Compact per-decêndio table: [cultureIndex, managementIndex|-1, cycleCode, soilCode, 36-char string] indexes refer to zarcCultures/managements.
  windows: packWindows(item, sortStrings(item.zarcCultures), sortStrings(item.managements)),
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
  status: 'official_MAPA_rows_with_per_decendio_risk_windows_20_30_40_interpreted_from_MAPA_Painel_manual',
  source: {
    institution: 'Ministério da Agricultura e Pecuária (MAPA)',
    title: `Zoneamento Agrícola de Risco Climático (Zarc) — Tábua de Risco — Safra ${safra}`,
    url: zarcSourceUrl,
    dictionaryUrl: 'https://dados.agricultura.gov.br/dataset/6d3d141c-885e-41a4-ab7f-dc8ff323b96f/resource/bebb0ebb-bc75-460c-b900-a7a1ebd87bee/download/dicionario-de-dados-tabua-de-risco-2026.pdf',
    accessedAt,
    sha256: hash.digest('hex'),
  },
  windowsEncoding: 'entries[].windows[] = [cultureIndex (into zarcCultures), managementIndex (into managements, -1 if none), Cod_Ciclo[] sharing this table, Cod_Solo[] sharing this table, 12-char packed table]; the packed table has one base64 character per month (alphabet A-Za-z0-9+/), 6 bits = three 2-bit decêndio values (0 = CSV 0, not indicated; 1/2/3 = CSV 20/30/40). Identical rows are de-duplicated; Cod_Clima is not retained per window.',
  legendSource: { riskLevels: 'MAPA, Manual de Instruções do novo Painel do Zarc, p. 4: "o risco de 20% é representado pela cor verde, 30% amarelo e 40% vermelho".', decendios: 'Portaria SPA/MAPA nº 386/2025, Anexo item 3.3 (tabela de períodos decendiais).' },
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
  ...(municipalityDocument ? [writeFile(municipalityOutput, `${JSON.stringify(municipalityDocument)}\n`)] : []),
  writeFile(zarcOutput, serializeZarc(zarcDocument)),
]);
console.log(JSON.stringify({ municipalities: municipalities.length, zarcRows: rowCount, zarcEntries: entries.length, zarcMunicipalities: zarcDocument.municipalityCount }, null, 2));
