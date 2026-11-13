import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const table = '5457';
const year = 'last%201';
const products = [
  { code: '40102', label: 'Arroz (em casca)', cropIds: ['upland_rice'], caveat: 'Agregado PAM: não distingue arroz irrigado de arroz de terras altas.' },
  { code: '40112', label: 'Feijão (em grão)', cropIds: ['common_bean', 'cowpea'], caveat: 'Agregado PAM: não distingue feijão-comum de feijão-caupi.' },
  { code: '40114', label: 'Girassol (em grão)', cropIds: ['sunflower'], caveat: null },
  { code: '40122', label: 'Milho (em grão)', cropIds: ['maize'], caveat: null },
  { code: '40124', label: 'Soja (em grão)', cropIds: ['soybean'], caveat: null },
  { code: '40125', label: 'Sorgo (em grão)', cropIds: ['sorghum'], caveat: null },
];
const sourceUrl = `https://apisidra.ibge.gov.br/values/t/${table}/n6/all/v/216,214/p/${year}/c782/{product}?formato=json`;
const entries = [];
let observedYear;

for (const product of products) {
  const url = sourceUrl.replace('{product}', product.code);
  const response = await fetch(url, { headers: { 'User-Agent': 'Field-Shift-data-refresh/1.0' } });
  if (!response.ok) throw new Error(`SIDRA request failed for ${product.code}: ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length < 2) throw new Error(`No SIDRA rows for ${product.code}.`);
  const byMunicipality = new Map();
  for (const row of rows.slice(1)) {
    observedYear ??= row.D3N;
    if (row.D3N !== observedYear) throw new Error(`Mixed PAM years: ${observedYear}/${row.D3N}`);
    const value = /^\d+(?:\.\d+)?$/.test(row.V) ? Number(row.V) : null;
    if (value === null || value <= 0) continue;
    const current = byMunicipality.get(row.D1C) ?? { municipalityCode: row.D1C, productCode: product.code, productLabel: product.label, cropIds: product.cropIds, harvestedAreaHa: null, producedQuantity: null, productionUnit: null, caveat: product.caveat };
    if (row.D2C === '216') current.harvestedAreaHa = value;
    if (row.D2C === '214') { current.producedQuantity = value; current.productionUnit = row.MN; }
    byMunicipality.set(row.D1C, current);
  }
  entries.push(...byMunicipality.values());
}

entries.sort((a, b) => a.municipalityCode.localeCompare(b.municipalityCode) || a.productCode.localeCompare(b.productCode));
const accessedAt = new Date().toISOString().slice(0, 10);
const canonical = JSON.stringify(entries);
const document = {
  version: 1,
  year: observedYear,
  status: 'official_IBGE_PAM_observations_not_suitability_or_crop_system_evidence',
  source: { institution: 'Instituto Brasileiro de Geografia e Estatística (IBGE)', title: `Produção Agrícola Municipal — tabela SIDRA ${table}`, url: sourceUrl, accessedAt, sha256: createHash('sha256').update(canonical).digest('hex') },
  caveat: 'Presença e valores municipais observados não comprovam aptidão, recomendação, sistema de cultivo nem condição do talhão.',
  entryCount: entries.length,
  entries,
};
await writeFile('data/brazil-pam-index.json', `${JSON.stringify(document)}\n`);
console.log(JSON.stringify({ year: observedYear, entries: entries.length }, null, 2));
