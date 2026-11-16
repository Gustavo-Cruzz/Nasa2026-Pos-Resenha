import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { monthlyNdvi, ndviFromRaw } from '@/lib/climate/ndvi';
import { ArgError, PermanentSourceError, PipelineError, buildRecord, parseArgs, runPipeline, type PipelineArgs, type PipelineDeps } from '@/lib/climate/ndvi-brazil-pipeline';
import { readCatalog, validateNdviBrazil } from '@/lib/climate/ndvi-brazil-validate';
import type { MunicipalNdviRecord, MunicipalPoint, NdviItem, NdviRasterSource, ProgressManifest, StateNdviArtifact } from '@/lib/climate/ndvi-brazil-types';

const dirs: string[] = [];
afterEach(async () => { while (dirs.length) await rm(dirs.pop()!, { recursive: true, force: true }); });
const tmp = async () => { const d = await mkdtemp(path.join(os.tmpdir(), 'ndvi-br-')); dirs.push(d); return d; };

const pt = (ibgeCode: string, uf: string, latitude: number, longitude: number): MunicipalPoint => ({ ibgeCode, municipality: `M${ibgeCode}`, uf, latitude, longitude, method: 'centroid_inside', geometryType: 'Polygon' });
// 6 municipalities, 2 UFs, 2 tiles (latitude > -15 -> h13v10, else h13v11)
const POINTS = [pt('1100001', 'RO', -10, -62), pt('1100002', 'RO', -11, -62), pt('1100003', 'RO', -12, -62), pt('3500001', 'SP', -20, -48), pt('3500002', 'SP', -21, -48), pt('3500003', 'SP', -22, -48)];
const itemDate = (year: number, k: number) => new Date(Date.UTC(year, 0, 1 + 16 * k)).toISOString().slice(0, 10);

type MockOptions = { rawFor?: (item: NdviItem, index: number) => number | null; failFor?: (item: NdviItem) => unknown; missingPerYear?: number; delay?: number };
function mockSource(options: MockOptions = {}) {
  const state = { calls: [] as string[], inFlight: 0, maxInFlight: 0, listCalls: 0 };
  const source: NdviRasterSource = {
    mode: 'cog_batch',
    tileFor: (lat) => (lat > -15 ? 'h13v10' : 'h13v11'),
    async listItems(year) {
      state.listCalls += 1;
      const out: NdviItem[] = [];
      for (const tile of ['h13v10', 'h13v11']) for (let k = 0; k < 23 - (options.missingPerYear ?? 0); k += 1) out.push({ id: `MOD13Q1.${tile}.${itemDate(year, k)}`, tile, start: itemDate(year, k), end: itemDate(year, k + 1) });
      return out;
    },
    async sample(item, points) {
      state.calls.push(item.id); state.inFlight += 1; state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
      try {
        await new Promise((r) => setTimeout(r, options.delay ?? 1));
        const err = options.failFor?.(item);
        if (err) throw err;
        return points.map((_, i) => (options.rawFor ? options.rawFor(item, i) : 5000 + i));
      } finally { state.inFlight -= 1; }
    },
  };
  return { source, state };
}
const args = (extra: string[] = []) => parseArgs(['--start-year', '2020', '--end-year', '2021', ...extra]);
const CLOCK = () => new Date('2026-11-15T12:00:00Z');
const hash = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const depsFor = (dir: string, source: NdviRasterSource, extra: Partial<PipelineDeps> = {}): PipelineDeps => ({
  dir, source, points: POINTS, pointsSha256: 'pts1', catalog: { sha256: 'cat', count: 6 }, now: CLOCK, generator: { script: 'x', sha256: 'g' }, checkpointEvery: 5, ...extra,
});
const readState = async (dir: string, uf: string) => JSON.parse(await readFile(path.join(dir, 'states', `${uf}.json`), 'utf8')) as StateNdviArtifact;
const readManifest = async (dir: string) => JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8')) as ProgressManifest;

describe('parseArgs', () => {
  it('uses defaults and accepts valid values', () => {
    expect(parseArgs([])).toMatchObject({ startYear: 2011, endYear: 2025, concurrency: 4, source: 'cog', resume: false, force: false, dryRun: false, ufs: [], ibge: [] });
    expect(parseArgs(['--uf', 'sp,MG', '--uf=RO', '--ibge', '3550308', '--concurrency', '16', '--source', 'point', '--dry-run'])).toMatchObject({ ufs: ['SP', 'MG', 'RO'], ibge: ['3550308'], concurrency: 16, source: 'point', dryRun: true });
  });
  it('rejects invalid input', () => {
    for (const bad of [['--start-year', '2010'], ['--end-year', '2026'], ['--start-year', '2020', '--end-year', '2019'], ['--start-year', '20.5'], ['--uf', 'XX'], ['--ibge', '123'], ['--concurrency', '0'], ['--concurrency', '17'], ['--source', 'ftp'], ['--bogus'], ['--uf'], ['--resume', '--force']]) {
      expect(() => parseArgs(bad), bad.join(' ')).toThrow(ArgError);
    }
  });
});

describe('NDVI normalization', () => {
  it('scales MODIS values and maps fill/out-of-range/missing to null, never 0', () => {
    expect(ndviFromRaw(5000)).toBe(0.5);
    expect(ndviFromRaw(-3000)).toBeNull(); expect(ndviFromRaw(-2001)).toBeNull(); expect(ndviFromRaw(10001)).toBeNull(); expect(ndviFromRaw(null)).toBeNull();
  });
  it('builds monthly climatology with null medians for months without valid values', () => {
    const months = monthlyNdvi([{ date: '2020-01-01', ndvi: 0.4 }, { date: '2021-01-17', ndvi: 0.6 }, { date: '2020-02-02', ndvi: null }]);
    expect(months[0]).toMatchObject({ medianNdvi: 0.5, validObservations: 2, years: 2 });
    expect(months[1]).toMatchObject({ medianNdvi: null, validObservations: 0 });
    expect(months[5].medianNdvi).toBeNull();
  });
  it('classifies coverage: available, insufficient, unavailable', () => {
    const series = (n: number, validEvery: number | null) => Array.from({ length: n }, (_, i) => ({ start: itemDate(2020, i % 23), end: itemDate(2020, (i % 23) + 1), raw: validEvery && i % validEvery !== 0 ? 5000 : -3000 }));
    const mk = (s: ReturnType<typeof series>) => buildRecord(POINTS[0], s, 46, { startYear: 2020, endYear: 2021 }, 'now');
    expect(mk(series(46, 100000)).status).toBe('available'); // all-valid except index 0 -> 45/46
    expect(mk(series(46, 2)).status).toBe('insufficient_coverage'); // half valid
    expect(mk(series(30, 100000)).status).toBe('insufficient_coverage'); // listed < 90%
    const none = mk(series(46, null));
    expect(none.status).toBe('unavailable'); expect(none.monthlyClimatology.every((m) => m.medianNdvi === null)).toBe(true);
    expect(mk([]).status).toBe('unavailable');
  });
});

describe('runPipeline', () => {
  it('runs, partitions by UF, writes provenance, period and sorted records', async () => {
    const dir = await tmp(); const { source } = mockSource();
    const res = await runPipeline(args(), depsFor(dir, source));
    expect(res.sampledItems).toBe(92); expect(res.finalizedMunicipalities).toBe(6);
    const ro = await readState(dir, 'RO'); const sp = await readState(dir, 'SP');
    expect(ro.records.map((r) => r.ibgeCode)).toEqual(['1100001', '1100002', '1100003']);
    expect(sp.records.every((r) => r.uf === 'SP')).toBe(true);
    const r = ro.records[0];
    expect(r).toMatchObject({ product: 'MOD13Q1', band: '250m_16_days_NDVI', status: 'available', observations: 46, validObservations: 46, coveragePct: 100 });
    expect(r.period).toEqual({ start: '2020-01-01', end: itemDate(2021, 23) });
    expect(r.source.provider).toContain('Planetary Computer'); expect(r.source.sourceUrl).toMatch(/^https:/); expect(r.source.fetchedAt).toBe(CLOCK().toISOString());
    expect(r.monthlyClimatology[0].medianNdvi).toBe(0.5);
    const manifest = await readManifest(dir);
    expect(manifest.stateChecksums.RO).toBe(hash(await readFile(path.join(dir, 'states', 'RO.json'))));
    expect(manifest.completedMunicipalities).toHaveLength(6); expect(manifest.processedItems).toHaveLength(92);
  });

  it('marks fill values as null (no zero) and flags insufficient coverage', async () => {
    const dir = await tmp();
    const { source } = mockSource({ rawFor: (_i, idx) => (idx === 0 ? -3000 : idx === 1 ? (Number(_i.start.slice(5, 7)) % 2 ? -3000 : 4000) : 4000) });
    await runPipeline(args(['--uf', 'RO']), depsFor(dir, source));
    const ro = (await readState(dir, 'RO')).records;
    expect(ro[0].status).toBe('unavailable'); expect(ro[0].validObservations).toBe(0); expect(ro[0].monthlyClimatology.every((m) => m.medianNdvi === null)).toBe(true);
    expect(ro[1].status).toBe('insufficient_coverage');
    expect(ro[2].status).toBe('available');
  });

  it('reports availability below 90% of listed composites as insufficient', async () => {
    const dir = await tmp(); const { source } = mockSource({ missingPerYear: 5 });
    await runPipeline(args(['--uf', 'SP']), depsFor(dir, source));
    expect((await readState(dir, 'SP')).records.every((r) => r.status === 'insufficient_coverage' && r.observations === 36)).toBe(true);
  });

  it('dry-run writes nothing and lists the plan', async () => {
    const dir = await tmp(); const { source, state } = mockSource(); const logs: string[] = [];
    const res = await runPipeline({ ...args(), dryRun: true }, depsFor(dir, source, { log: (m) => logs.push(m) }));
    expect(res.written).toBe(false); expect(res.plan.totalItems).toBe(92); expect(res.plan.tiles.map((t) => t.points.length)).toEqual([3, 3]);
    expect(await readdir(dir)).toEqual([]); expect(state.calls).toHaveLength(0);
    expect(logs.join('\n')).toContain('h13v10: 3 points, 46 items');
  });

  it('filters by uf and ibge and rejects unknown ibge', async () => {
    const dir = await tmp(); const { source, state } = mockSource();
    await runPipeline(args(['--ibge', '3500002']), depsFor(dir, source));
    expect(state.calls).toHaveLength(46); expect(await readdir(path.join(dir, 'states'))).toEqual(['SP.json']);
    await expect(runPipeline({ ...args(['--ibge', '9999999']), dryRun: true }, depsFor(await tmp(), source))).rejects.toThrow(/not in points/);
  });

  it('respects the concurrency limit', async () => {
    const dir = await tmp(); const { source, state } = mockSource({ delay: 5 });
    await runPipeline(args(['--concurrency', '3']), depsFor(dir, source));
    expect(state.maxInFlight).toBe(3);
  });

  it('requires --resume or --force for an existing manifest and checks compatibility', async () => {
    const dir = await tmp(); const { source } = mockSource();
    await runPipeline(args(['--uf', 'RO']), depsFor(dir, source));
    await expect(runPipeline(args(), depsFor(dir, source))).rejects.toThrow(/--resume/);
    await expect(runPipeline(args(['--resume']), depsFor(dir, source, { pointsSha256: 'other' }))).rejects.toThrow(/--force/);
    await expect(runPipeline(parseArgs(['--resume', '--start-year', '2019', '--end-year', '2021']), depsFor(dir, source))).rejects.toThrow(/period/);
    await expect(runPipeline(args(['--resume']), depsFor(await tmp(), source))).rejects.toThrow(PipelineError);
  });

  it('resume does not re-sample processed items; force starts fresh', async () => {
    const dir = await tmp(); const first = mockSource();
    await runPipeline(args(['--uf', 'RO']), depsFor(dir, first.source));
    expect(first.state.calls).toHaveLength(46);
    const second = mockSource();
    const res = await runPipeline(args(['--resume']), depsFor(dir, second.source));
    expect(second.state.calls.every((id) => id.includes('h13v11'))).toBe(true); expect(second.state.calls).toHaveLength(46); // only the SP tile
    expect(res.finalizedMunicipalities).toBe(3);
    const third = mockSource();
    await runPipeline(args(['--resume']), depsFor(dir, third.source));
    expect(third.state.calls).toHaveLength(0);
    const fourth = mockSource();
    await runPipeline(args(['--force', '--uf', 'RO']), depsFor(dir, fourth.source));
    expect(fourth.state.calls).toHaveLength(46);
  });

  it('records recoverable and permanent failures, then succeeds on resume', async () => {
    const dir = await tmp(); let broken = true;
    const { source } = mockSource({ failFor: (item) => (broken && item.start === itemDate(2020, 3) && item.tile === 'h13v10' ? new Error('HTTP 503 after retries') : item.start === itemDate(2020, 4) && item.tile === 'h13v10' ? new PermanentSourceError('HTTP 404') : undefined) });
    const logs: string[] = [];
    const first = await runPipeline(args(['--uf', 'RO']), depsFor(dir, source, { log: (m) => logs.push(m) }));
    expect(first.failedItems).toBe(2);
    let manifest = await readManifest(dir);
    expect(manifest.recoverableFailures).toEqual([{ itemId: `MOD13Q1.h13v10.${itemDate(2020, 3)}`, error: 'HTTP 503 after retries', attempts: 1 }]);
    expect(manifest.permanentFailures.map((f) => f.error)).toEqual(['HTTP 404']);
    expect(manifest.completedMunicipalities).toHaveLength(0); // not finalized while a recoverable item is pending
    await expect(stat(path.join(dir, 'states', 'RO.json'))).rejects.toThrow();
    broken = false;
    const second = mockSource();
    await runPipeline(args(['--resume', '--uf', 'RO']), depsFor(dir, second.source));
    expect(second.state.calls).toEqual([`MOD13Q1.h13v10.${itemDate(2020, 3)}`]); // permanent failure is not retried
    manifest = await readManifest(dir);
    expect(manifest.recoverableFailures).toEqual([]); expect(manifest.completedMunicipalities).toHaveLength(3);
    const r = (await readState(dir, 'RO')).records[0];
    expect(r.observations).toBe(46); expect(r.validObservations).toBe(45); // 404 item stays absent (null), never 0
  });

  it('recovers from stale .tmp files and truncated work lines', async () => {
    const dir = await tmp(); const first = mockSource();
    await runPipeline(args(['--uf', 'RO']), depsFor(dir, first.source));
    // simulate a crash mid-run: truncate the work store, drop manifest progress knowledge of completion, leave tmp debris
    const work = path.join(dir, '.work', 'h13v10.ndjson');
    const text = await readFile(work, 'utf8'); const lines = text.trim().split('\n');
    await writeFile(work, `${lines.slice(0, 40).join('\n')}\n${lines[40].slice(0, 25)}`);
    await writeFile(path.join(dir, 'states', 'RO.json.123.tmp'), '{"trunc');
    await writeFile(path.join(dir, 'manifest.json.9.tmp'), '{');
    const m = await readManifest(dir); m.completedMunicipalities = []; await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(m));
    const second = mockSource();
    await runPipeline(args(['--resume', '--uf', 'RO']), depsFor(dir, second.source));
    expect(second.state.calls).toHaveLength(6); // 46 items minus 40 intact lines
    expect((await readdir(path.join(dir, 'states'))).filter((n) => n.endsWith('.tmp'))).toEqual([]);
    expect((await readState(dir, 'RO')).records[0].validObservations).toBe(46);
  });

  it('distrusts a corrupted state file and re-finalizes from the work store without re-sampling', async () => {
    const dir = await tmp(); const first = mockSource();
    await runPipeline(args(), depsFor(dir, first.source));
    const file = path.join(dir, 'states', 'SP.json');
    await writeFile(file, (await readFile(file, 'utf8')).slice(0, 100)); // truncated
    const second = mockSource(); const logs: string[] = [];
    await runPipeline(args(['--resume']), depsFor(dir, second.source, { log: (m) => logs.push(m) }));
    expect(second.state.calls).toHaveLength(0);
    expect(logs.join('\n')).toContain('failed integrity check');
    expect((await readState(dir, 'SP')).records).toHaveLength(3);
    const manifest = await readManifest(dir);
    expect(manifest.stateChecksums.SP).toBe(hash(await readFile(file)));
  });

  it('re-samples items when a later run selects more points than the work store holds', async () => {
    const dir = await tmp(); const first = mockSource();
    await runPipeline(args(['--ibge', '1100001']), depsFor(dir, first.source));
    const second = mockSource();
    await runPipeline(args(['--resume', '--uf', 'RO']), depsFor(dir, second.source));
    expect(second.state.calls).toHaveLength(46);
    expect((await readState(dir, 'RO')).records).toHaveLength(3);
  });
});

describe('validator', () => {
  const catalog = POINTS.map((p) => ({ code: p.ibgeCode, uf: p.uf }));
  const setup = async (uf?: string[]) => {
    const dir = await tmp(); const { source } = mockSource();
    await writeFile(path.join(dir, 'points.json'), JSON.stringify({ points: POINTS }));
    await runPipeline(args(uf ? ['--uf', ...uf] : []), depsFor(dir, source));
    return dir;
  };

  it('accepts a complete synthetic catalog and counts statuses per UF', async () => {
    const dir = await setup();
    const report = await validateNdviBrazil({ dir, catalog, now: CLOCK, requireComplete: true });
    expect(report.errors).toEqual([]);
    expect(report).toMatchObject({ complete: true, expected: 6, processed: 6, available: 6, insufficient: 0, unavailable: 0, missing: 0, stacItemsUsed: 92 });
    expect(report.perUf.RO).toMatchObject({ expected: 3, processed: 3, available: 3 });
    expect(report.coverage).toEqual({ mean: 100, min: 100, max: 100 });
    expect(report.period).toEqual({ start: '2020-01-01', end: itemDate(2021, 23) });
  });

  it('flags missing municipalities without claiming national coverage', async () => {
    const dir = await setup(['RO']);
    const report = await validateNdviBrazil({ dir, catalog, now: CLOCK });
    expect(report.errors).toEqual([]); expect(report.complete).toBe(false); expect(report.missing).toBe(3); expect(report.missingSample).toEqual(['3500001', '3500002', '3500003']);
    expect(report.warnings.join(' ')).toContain('no national coverage is claimed');
    expect((await validateNdviBrazil({ dir, catalog, requireComplete: true })).errors.join(' ')).toContain('incomplete run');
  });

  it('detects checksum corruption, duplicates, out-of-range NDVI and zero-for-missing', async () => {
    const dir = await setup();
    const file = path.join(dir, 'states', 'RO.json');
    const state = JSON.parse(await readFile(file, 'utf8')) as StateNdviArtifact;
    await writeFile(file, `${JSON.stringify(state)} \n`);
    expect((await validateNdviBrazil({ dir, catalog })).errors.join(' ')).toContain('checksum mismatch');
    const bad: MunicipalNdviRecord = { ...state.records[0], validObservations: 0, monthlyClimatology: state.records[0].monthlyClimatology.map((m, i) => (i === 0 ? { ...m, medianNdvi: 1.5, validObservations: 0 } : { ...m, medianNdvi: 0, validObservations: 0 })) };
    state.records.push(bad);
    await writeFile(file, JSON.stringify(state));
    const errors = (await validateNdviBrazil({ dir, catalog })).errors.join('\n');
    expect(errors).toContain('duplicate'); expect(errors).toContain('outside [-0.2, 1]'); expect(errors).toContain('zero-for-missing');
  });

  it('flags points outside Brazil and count mismatches', async () => {
    const dir = await setup();
    await writeFile(path.join(dir, 'points.json'), JSON.stringify({ points: [{ ...POINTS[0], latitude: 40 }, ...POINTS.slice(1, 5)] }));
    const report = await validateNdviBrazil({ dir, catalog });
    expect(report.invalidPoints).toContain('1100001'); expect(report.errors.join(' ')).toContain('points.json has 5 points');
  });

  it('reads the expected count from the real catalog (IBGE 2025: 5571)', async () => {
    const real = await readCatalog('data/brazil-municipalities.json');
    expect(real).toHaveLength(5571);
    const dir = await tmp();
    const report = await validateNdviBrazil({ dir, catalog: real });
    expect(report.expected).toBe(5571); expect(report.complete).toBe(false);
  });
});

