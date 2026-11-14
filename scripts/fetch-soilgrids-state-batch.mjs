import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const argument = (name) => { const index = args.indexOf(name); return index === -1 ? null : args[index + 1] ?? null; };
const batchPath = argument('--batch');
const execute = args.includes('--execute');
if (!batchPath) throw new Error('Usage: node scripts/fetch-soilgrids-state-batch.mjs --batch data/soilgrids/batches/go.json [--execute]');

const batch = JSON.parse(await readFile(resolve(batchPath), 'utf8'));
if (batch.schemaVersion !== 1 || !/^[A-Z]{2}$/.test(batch.uf) || !Array.isArray(batch.artifacts) || !batch.artifacts.length) throw new Error('Invalid state batch manifest.');
if (batch.coverage !== 'exact_points_only') throw new Error('Only exact-point batches are supported until a reviewed native-grid tile processor is available.');

for (const item of batch.artifacts) {
  if (!item.slug || !item.id || !Number.isFinite(item.location?.latitude) || !Number.isFinite(item.location?.longitude) || !item.artifact || !item.metadata) throw new Error(`Invalid batch artifact: ${JSON.stringify(item)}`);
  const environment = { ...process.env, SOIL_LATITUDE: String(item.location.latitude), SOIL_LONGITUDE: String(item.location.longitude), SOIL_ARTIFACT_SLUG: item.slug, SOIL_ARTIFACT_ID: item.id, SOIL_ARTIFACT_OUTPUT: resolve(new URL(item.artifact, `file://${resolve(batchPath)}`).pathname), SOIL_ARTIFACT_META_OUTPUT: resolve(new URL(item.metadata, `file://${resolve(batchPath)}`).pathname) };
  console.log(`${execute ? 'Fetching' : 'Planned'} ${batch.uf}: ${item.id} at ${environment.SOIL_LATITUDE},${environment.SOIL_LONGITUDE}`);
  if (!execute) continue;
  await new Promise((resolveRun, reject) => { const child = spawn('node', ['scripts/fetch-soilgrids-artifact.mjs'], { stdio: 'inherit', env: environment }); child.on('error', reject); child.on('exit', (code) => code === 0 ? resolveRun() : reject(new Error(`Artifact ${item.id} exited with ${code}`))); });
}
console.log(`${execute ? 'Completed' : 'Validated'} ${batch.uf} batch: ${batch.artifacts.length} exact point(s), status=${batch.status}.`);
