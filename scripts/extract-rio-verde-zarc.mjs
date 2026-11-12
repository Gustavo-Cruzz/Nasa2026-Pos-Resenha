import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const inputPath = 'dados-abertos-tabua-de-risco-safra-2026-2027.csv';
const outputPath = 'data/rio-verde-zarc.json';
const p0CultureMap = new Map([
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
const groupNames = { 20: 'I', 21: 'II', 22: 'III' };
const soilNames = { 1: 'Arenoso', 2: 'Textura Média', 3: 'Argiloso', 11: 'AD1', 12: 'AD2', 13: 'AD3', 14: 'AD4', 15: 'AD5', 16: 'AD6' };

const input = await readFile(inputPath, 'utf8');
const [headerLine, ...lines] = input.trimEnd().split(/\r?\n/);
const header = headerLine.replace(/^\uFEFF/, '').split(';');
const index = Object.fromEntries(header.map((name, position) => [name, position]));
const at = (row, name) => row[index[name]] ?? '';
const entries = lines.flatMap((line) => {
  const row = line.split(';');
  if (at(row, 'UF') !== 'GO' || at(row, 'municipio') !== 'Rio Verde') return [];
  const zarcCulture = at(row, 'Nome_cultura');
  const cropId = p0CultureMap.get(zarcCulture);
  if (!cropId) return [];
  const riskCodeByDecendio = Object.fromEntries(
    Array.from({ length: 36 }, (_, offset) => {
      const decendio = offset + 1;
      const raw = at(row, `dec${decendio}`);
      return raw && raw !== '0' ? [String(decendio), Number(raw)] : null;
    }).filter(Boolean),
  );
  return [{
    cropId,
    zarcCulture,
    systemCropIds: zarcCulture.includes('consorciado com Braquiária') ? ['maize', 'ruziziensis'] : [cropId],
    safra: `${at(row, 'SafraIni')}/${at(row, 'SafraFin')}`,
    cycleGroup: { code: Number(at(row, 'Cod_Ciclo')), name: groupNames[Number(at(row, 'Cod_Ciclo'))] ?? null },
    soil: { code: Number(at(row, 'Cod_Solo')), name: soilNames[Number(at(row, 'Cod_Solo'))] ?? null },
    management: at(row, 'Nome_Outros_Manejos'),
    ordinance: at(row, 'Portaria'),
    riskCodeByDecendio,
  }];
});

const document = {
  version: 2,
  pilot: 'Rio Verde, GO',
  status: 'verified_from_MAPA_2026_2027_csv_risk_codes_not_semantically_interpreted',
  source: {
    institution: 'Ministério da Agricultura e Pecuária (MAPA)',
    title: 'Zoneamento Agrícola de Risco Climático (Zarc) - Tábua de Risco - Safra 2026/2027',
    year: 2026,
    url: 'https://dados.agricultura.gov.br/dataset/6d3d141c-885e-41a4-ab7f-dc8ff323b96f/resource/139e5a60-1f43-4cc8-aeab-a35dbbf816c0/download/dados-abertos-tabua-de-risco-safra-2026-2027.csv',
    dictionaryUrl: 'https://dados.agricultura.gov.br/dataset/6d3d141c-885e-41a4-ab7f-dc8ff323b96f/resource/bebb0ebb-bc75-460c-b900-a7a1ebd87bee/download/dicionario-de-dados-tabua-de-risco-2026.pdf',
    accessedAt: '2026-11-12',
    localFile: inputPath,
    sha256: createHash('sha256').update(input).digest('hex'),
  },
  fieldSemantics: {
    cycleGroup: 'MAPA dictionary: 20=Grupo I, 21=Grupo II, 22=Grupo III.',
    soil: 'MAPA dictionary: 1=Arenoso, 2=Textura Média, 3=Argiloso, 11–16=AD1–AD6.',
    riskCodeByDecendio: 'Raw non-zero values from dec1–dec36. The consulted dictionary defines decêndios as planting periods but does not define the numeric risk-code legend; therefore these values are not labelled as percentages in this artifact.',
  },
  entries,
  notCoveredAsStandaloneCrop: ['ruziziensis'],
  note: 'Rows for maize intercropped with brachiaria document the consortium system only; they do not establish an independent Urochloa ruziziensis planting window. This dataset does not by itself enable a recommendation.',
};

await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`);
