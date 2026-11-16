// Municipal MODIS NDVI ingestion (MOD13Q1 v061 Terra). Usage: npm run fetch:ndvi-brazil -- [--uf SP,MG] [--ibge 3550308] [--start-year 2011] [--end-year 2025]
//   [--source cog|point] [--concurrency 4] [--dry-run] [--resume | --force]
import { NDVI_BRAZIL_DIR } from '../lib/climate/ndvi-brazil-types.ts';
import { ArgError, PipelineError, loadPoints, parseArgs, runPipeline, sourceSha256 } from '../lib/climate/ndvi-brazil-pipeline.ts';
// Written by the raster adapter agent; exports the real sources.
import { createCogBatchSource, createPointApiSource } from '../lib/climate/ndvi-raster-source.ts';

try {
  const args = parseArgs(process.argv.slice(2));
  const { artifact, sha256 } = await loadPoints(NDVI_BRAZIL_DIR);
  const source = args.source === 'point' ? createPointApiSource({ concurrency: args.concurrency }) : createCogBatchSource({ concurrency: args.concurrency });
  const result = await runPipeline(args, {
    dir: NDVI_BRAZIL_DIR, source, points: artifact.points, pointsSha256: sha256,
    catalog: { sha256: artifact.catalog.sha256, count: artifact.catalog.count },
    generator: await sourceSha256('scripts/fetch-ndvi-brazil.ts'), log: (m) => console.log(m),
  });
  if (result.failedItems) { console.error(`${result.failedItems} item(s) failed; re-run with --resume`); process.exitCode = 2; }
} catch (error) {
  if (error instanceof ArgError || error instanceof PipelineError) { console.error(error.message); process.exit(1); }
  throw error;
}
