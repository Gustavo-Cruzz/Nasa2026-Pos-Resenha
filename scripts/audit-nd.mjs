import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const fields = ['cycleDaysRange', 'idealTempC', 'viableTempC', 'soilPhRange', 'kcStages', 'residuePotential', 'nitrogenFixationPotential', 'rootingClass'];
const crops = [...await readJson('data/crops.json'), ...await readJson('FieldShift_AgriculturaFamiliar_Consorcios_2026/family-farm-crops.seed.json')];
const evidence = [...(await readJson('data/crop-evidence.json')).records, ...(await readJson('FieldShift_AgriculturaFamiliar_Consorcios_2026/family-farm-evidence.seed.json')).records];
const cycleDatasetPath = 'data/plantae_ciclos_17_culturas_2026-11-18.json';
const cycleDataset = await readJson(cycleDatasetPath);
const simulationDatasetPath = 'data/plantae_ciclos_17_culturas_v2.2.json';
const simulationDataset = await readJson(simulationDatasetPath);
const lot1Path = 'data/plantae_F31_lote1_fbn_palhada_28_culturas_2026-11-18.json';
const lot1 = await readJson(lot1Path);
if (lot1.records.length !== 56 || new Set(lot1.records.map((item) => `${item.cropId}:${item.field}`)).size !== 56 || lot1.records.some((item) => !crops.some((crop) => crop.id === item.cropId) || !['nitrogenFixationPotential', 'residuePotential'].includes(item.field) || item.reviewStatus !== 'pending')) throw new Error('Invalid F31 lot 1 records');
if (cycleDataset.records.length !== 17 || new Set(cycleDataset.records.map((item) => item.cropId)).size !== 17 || cycleDataset.records.some((item) => !crops.some((crop) => crop.id === item.cropId))) throw new Error('Invalid contextual cycle dataset crop IDs');
const ndvi = await readJson('data/ndvi-brazil/report.json');
const zarc = await readJson('data/brazil-zarc-index.json');

const matrix = crops.flatMap((crop) => fields.map((field) => {
  const records = evidence.filter((item) => item.cropId === crop.id && item.field === field && !item.supersededBy && item.value !== null);
  const verified = records.filter((item) => item.source.verification !== 'not_verified');
  const contextualCycle = field === 'cycleDaysRange' ? cycleDataset.records.find((item) => item.cropId === crop.id) ?? null : null;
  return {
    cropId: crop.id, cropName: crop.commonNames['pt-BR'], field,
    status: verified.length || (contextualCycle?.value !== null && contextualCycle?.value !== undefined) ? 'verified_record' : records.length ? 'unverified_record' : 'no_record',
    baseSeedValuePresent: crop[field] !== null && crop[field] !== undefined,
    records: [...records.map((item) => ({ value: item.value, unit: item.unit, context: item.context, cultivar: item.cultivar, location: item.location, source: item.source.title, url: item.source.url, accessedAt: item.source.accessedAt, verification: item.source.verification })), ...(contextualCycle?.value ? [{ value: contextualCycle.value, unit: contextualCycle.unit, context: contextualCycle.context.cycleDefinition, cultivar: contextualCycle.context.cultivar, location: contextualCycle.context.region, source: contextualCycle.source.title, url: contextualCycle.source.url, accessedAt: contextualCycle.source.accessedAt, verification: contextualCycle.verification }] : [])],
    ...(contextualCycle ? { contextualCycle } : {}),
    ...(field === 'cycleDaysRange' ? { simulationReference: simulationDataset.records.find((item) => item.cropId === crop.id) ?? null } : {}),
    ...(['nitrogenFixationPotential', 'residuePotential'].includes(field) ? { pendingResearch: lot1.records.find((item) => item.cropId === crop.id && item.field === field) ?? null } : {}),
  };
}));

async function sourceFiles(directory) {
  const result = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) result.push(...await sourceFiles(relative));
    else if (/\.(tsx?|mjs)$/.test(entry.name)) result.push(relative);
  }
  return result;
}
const category = (file) => file.includes('catalog') || file.includes('evidence-coverage') ? 'catalog' : file.includes('ndvi') ? 'ndvi' : file.includes('zarc') || file.includes('brazil') ? 'regional' : file.includes('soil') || file.includes('terrain') ? 'soil_terrain' : file.includes('climate') || file.includes('nasa') || file.includes('weather') ? 'climate' : file.includes('lab') || file.includes('rotation') || file.includes('engine') ? 'rotation' : file.includes('farm') || file.includes('chat') ? 'producer_input' : file.includes('atlas') || file.includes('boundary') ? 'spatial' : file.includes('methodology') ? 'documentation' : file.includes('results') || file.includes('future') || file.includes('export') || file.includes('presentation') || file.includes('source-health') || file.includes('evidence') ? 'presentation' : 'other';
const owner = { catalog: 'F31', ndvi: 'F33', regional: 'F32', soil_terrain: 'F34', climate: 'F34', rotation: 'F30', producer_input: 'F30', spatial: 'F34', documentation: 'F35', presentation: 'F35', other: 'F29' };
const uiOccurrences = [];
for (const file of [...await sourceFiles('app'), ...await sourceFiles('components'), ...await sourceFiles('lib')]) {
  const lines = (await readFile(path.join(root, file), 'utf8')).split('\n');
  lines.forEach((line, index) => { if (/N\/D|noData/.test(line)) { const family = category(file); uiOccurrences.push({ file, line: index + 1, family, plannedSprint: owner[family], role: family === 'presentation' || family === 'documentation' ? 'display_or_propagation' : 'possible_origin', tokens: [...new Set(line.match(/N\/D|noData/g))] }); } });
}

const counts = Object.fromEntries(fields.map((field) => [field, { verifiedRecord: matrix.filter((item) => item.field === field && item.status === 'verified_record').length, unverifiedOnly: matrix.filter((item) => item.field === field && item.status === 'unverified_record').length, absent: matrix.filter((item) => item.field === field && item.status === 'no_record').length }]));
const report = { schemaVersion: 1, sources: ['data/crops.json', 'FieldShift_AgriculturaFamiliar_Consorcios_2026/family-farm-crops.seed.json', 'data/crop-evidence.json', 'FieldShift_AgriculturaFamiliar_Consorcios_2026/family-farm-evidence.seed.json', cycleDatasetPath, simulationDatasetPath, lot1Path, 'data/ndvi-brazil/report.json', 'data/brazil-zarc-index.json'], definitions: { verified_record: 'At least one active non-null record marked verified, including a contextual range that may require a harvest assumption; applicability to a national crop profile is not established by this count.', no_record: 'No active non-null evidence record for this crop and field; contextual milestones and research awaiting review may still exist.', ui_role: 'A source-code N/D occurrence may only display an upstream gap. Runtime cases and source provenance must be checked before closure.' }, totals: { crops: crops.length, fields: fields.length, combinations: matrix.length, verifiedCombinations: matrix.filter((item) => item.status === 'verified_record').length, pendingResearch: { records: lot1.records.length, sourced: lot1.records.filter((item) => item.status === 'source_found').length, insufficient: lot1.records.filter((item) => item.status !== 'source_found').length, fieldTypeMismatches: lot1.records.filter((item) => item.field === 'residuePotential' && item.evidenceType !== 'qualitative_residue_behavior').length }, contextualCycles: { records: cycleDataset.records.length, ranges: cycleDataset.records.filter((item) => item.value !== null).length, noTerminalCycle: cycleDataset.records.filter((item) => item.value === null).length, harvestAssumptions: cycleDataset.records.filter((item) => item.verification === 'verified_with_harvest_assumption').length }, uiOccurrences: uiOccurrences.length, ndvi: { expected: ndvi.expected, available: ndvi.available, insufficient: ndvi.insufficient, unavailable: ndvi.unavailable }, zarc: { safra: zarc.safra, status: zarc.status, municipalityCount: zarc.municipalityCount, entryCount: zarc.entryCount } }, fieldCounts: counts, matrix, uiOccurrences };
if (report.totals.combinations !== crops.length * fields.length) throw new Error('Incomplete crop-field matrix');
const dir = path.join(root, 'docs', 'nd-audit');
await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, 'inventory.json'), `${JSON.stringify(report, null, 2)}\n`);
const table = fields.map((field) => `| ${field} | ${counts[field].verifiedRecord} | ${counts[field].unverifiedOnly} | ${counts[field].absent} |`).join('\n');
const familyCounts = Object.entries(owner).map(([family, sprint]) => `| ${family} | ${sprint} | ${uiOccurrences.filter((item) => item.family === family).length} |`).join('\n');
await writeFile(path.join(dir, 'README.md'), `# Inventário reproduzível de N/D\n\nGerado por \`npm run audit:nd\`. \`inventory.json\` traz as ${matrix.length} combinações cultura × campo, fontes e contextos; também lista ${uiOccurrences.length} linhas de código com N/D ou noData para revisão. Presença de fonte não garante aplicabilidade nacional ou valor projetado no motor. Ocorrência de texto no código não equivale a N/D visto pelo usuário; a origem deve ser confirmada em casos de execução.\n\nLote F31-1: ${report.totals.pendingResearch.records} registros aguardam revisão agronômica; ${report.totals.pendingResearch.sourced} trazem valor com fonte e ${report.totals.pendingResearch.insufficient} permanecem sem valor; ${report.totals.pendingResearch.fieldTypeMismatches} têm tipo divergente do campo de palhada. Eles não entram na contagem de registros verificados nem no motor.\n\nDataset contextual: ${report.totals.contextualCycles.records} culturas, ${report.totals.contextualCycles.ranges} faixas (incluindo ${report.totals.contextualCycles.harvestAssumptions} condicionada à hipótese de colheita) e ${report.totals.contextualCycles.noTerminalCycle} sem ciclo terminal único. Marcos preservados em \`contextualCycle.milestones\` não contam como ciclo terminal. As referências ainda não são selecionadas pelo motor.\n\n| Campo | Registro verificado | Só não verificado | Sem registro |\n| --- | ---: | ---: | ---: |\n${table}\n\n| Família da ocorrência | Sprint | Linhas |\n| --- | --- | ---: |\n${familyCounts}\n\nNDVI: ${ndvi.available}/${ndvi.expected} municípios disponíveis; ${ndvi.insufficient} com cobertura insuficiente; ${ndvi.unavailable} indisponíveis. ZARC: safra ${zarc.safra}, ${zarc.municipalityCount} municípios no índice.\n`);
process.stdout.write(`N/D audit: ${matrix.length} crop-field rows, ${report.totals.verifiedCombinations} with verified records, ${uiOccurrences.length} UI occurrences.\n`);
