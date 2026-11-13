import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { spawn } from 'node:child_process';

const packageId = '6d3d141c-885e-41a4-ab7f-dc8ff323b96f';
const ckanUrl = `https://dados.agricultura.gov.br/api/3/action/package_show?id=${packageId}`;
const geometryUrl = 'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio';
const localityUrl = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios';
const accessedAt = new Date().toISOString().slice(0, 10);

async function checkedFetch(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'field-shift-data-updater/1.0' }, signal: AbortSignal.timeout(300_000) });
  if (!response.ok) throw new Error(`Download failed (${response.status}) for ${url}`);
  return response;
}

async function download(url, destination) {
  const response = await checkedFetch(url);
  if (!response.body) throw new Error(`Empty response body for ${url}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
}

function latestAnnualResource(resources) {
  const annual = resources.flatMap((resource) => {
    const label = `${resource.name ?? ''} ${resource.description ?? ''}`;
    const match = label.match(/Safra\s+(20\d{2})\/(20\d{2})/i);
    return match && resource.url && String(resource.format).toUpperCase() === 'CSV' ? [{ ...resource, startYear: Number(match[1]), endYear: Number(match[2]) }] : [];
  }).sort((a, b) => b.startYear - a.startYear || b.endYear - a.endYear);
  if (!annual[0]) throw new Error('No annual ZARC CSV resource was found in the MAPA CKAN package.');
  return annual[0];
}

async function runBuild(paths, sourceUrl) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/build-brazil-context.mjs', paths.geometry, paths.localities, paths.zarc], {
      cwd: process.cwd(),
      env: { ...process.env, SOURCE_ACCESSED_AT: accessedAt, ZARC_SOURCE_URL: sourceUrl },
      stdio: 'inherit',
    });
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Context builder exited with code ${code}`)));
    child.on('error', reject);
  });
}

async function runPamBuild() {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/update-brazil-pam.mjs'], { cwd: process.cwd(), stdio: 'inherit' });
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`PAM builder exited with code ${code}`)));
    child.on('error', reject);
  });
}

const directory = await mkdtemp(join(tmpdir(), 'field-shift-brazil-'));
try {
  const metadata = await checkedFetch(ckanUrl).then((response) => response.json());
  if (!metadata.success || !Array.isArray(metadata.result?.resources)) throw new Error('Invalid MAPA CKAN package response.');
  const resource = latestAnnualResource(metadata.result.resources);
  const paths = { geometry: join(directory, 'municipalities.json'), localities: join(directory, 'localities.json'), zarc: join(directory, 'zarc.csv') };
  await Promise.all([download(geometryUrl, paths.geometry), download(localityUrl, paths.localities), download(resource.url, paths.zarc)]);
  await runBuild(paths, resource.url);
  await runPamBuild();
  console.log(JSON.stringify({ updatedAt: accessedAt, resource: resource.name, sourceUrl: resource.url }, null, 2));
} finally {
  await rm(directory, { recursive: true, force: true });
}
