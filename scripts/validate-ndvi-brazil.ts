// Validates data/ndvi-brazil (points, state files, manifest checksums) and writes data/ndvi-brazil/report.json.
// Usage: npm run validate:ndvi-brazil [-- --require-complete]
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NDVI_BRAZIL_DIR } from '../lib/climate/ndvi-brazil-types.ts';
import { REPORT_FILE } from '../lib/climate/ndvi-brazil-pipeline.ts';
import { readCatalog, validateNdviBrazil } from '../lib/climate/ndvi-brazil-validate.ts';

const requireComplete = process.argv.includes('--require-complete');
const report = await validateNdviBrazil({ dir: NDVI_BRAZIL_DIR, catalog: await readCatalog(), requireComplete });
await writeFile(path.join(NDVI_BRAZIL_DIR, REPORT_FILE), `${JSON.stringify(report, null, 1)}\n`);
console.log(`expected ${report.expected}, processed ${report.processed}, available ${report.available}, insufficient ${report.insufficient}, unavailable ${report.unavailable}, missing ${report.missing}`);
for (const w of report.warnings) console.warn(`warning: ${w}`);
for (const e of report.errors) console.error(`error: ${e}`);
if (report.errors.length) process.exit(1);
