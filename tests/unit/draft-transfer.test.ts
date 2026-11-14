import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseDraftFile, serializeDraft, DRAFT_FILE_MAX_CHARS } from '@/lib/draft-transfer';
import { isAnalysisShape, loadLastAnalysis, saveLastAnalysis } from '@/lib/analysis-cache';
import { defaultPreferences, preferencesSchema } from '@/lib/preferences';
import { analyze } from '@/lib/engine';
import type { Draft } from '@/lib/storage';
import type { ClimateContext } from '@/lib/climate/nasa-power';

const draft: Draft = { version: 2, savedAt: '2026-11-14T10:00:00.000Z', data: { location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 4, history: [{ cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' }], priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown', waterPoint: { kind: 'reservoir' } } };
const unavailable: ClimateContext = { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [], provenance: null, gaps: [] };

describe('draft export/import', () => {
  it('round-trips a valid draft', () => {
    const result = parseDraftFile(serializeDraft(draft));
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.draft).toEqual(draft);
  });
  it('rejects invalid files without accepting partial data', () => {
    expect(parseDraftFile('{nope')).toEqual({ ok: false, code: 'invalid_json' });
    expect(parseDraftFile(JSON.stringify({ hello: 'world' }))).toEqual({ ok: false, code: 'not_a_draft' });
    expect(parseDraftFile(JSON.stringify({ app: 'other', kind: 'draft', draft }))).toEqual({ ok: false, code: 'not_a_draft' });
    expect(parseDraftFile(JSON.stringify({ app: 'field-shift', kind: 'draft', draft: { ...draft, data: { ...draft.data, plantingMonth: 13 } } }))).toEqual({ ok: false, code: 'not_a_draft' });
    expect(parseDraftFile(JSON.stringify({ app: 'field-shift', kind: 'draft', draft: { ...draft, data: { ...draft.data, waterPoint: { kind: 'spring' } } } })).ok).toBe(false);
    expect(parseDraftFile(' '.repeat(DRAFT_FILE_MAX_CHARS + 1))).toEqual({ ok: false, code: 'too_large' });
  });
});

describe('offline analysis cache', () => {
  afterEach(() => vi.unstubAllGlobals());
  const stub = () => { const store = new Map<string, string>(); vi.stubGlobal('window', { localStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value), removeItem: (key: string) => void store.delete(key) } }); return store; };
  it('stores and restores the last analysis with its save time', () => {
    stub();
    const data = analyze(draft.data, unavailable);
    saveLastAnalysis(data);
    const cached = loadLastAnalysis();
    expect(cached && Number.isNaN(Date.parse(cached.savedAt))).toBe(false);
    expect(cached?.data.strategies).toHaveLength(3);
    expect(cached?.data.input.waterPoint).toEqual({ kind: 'reservoir' });
  });
  it('ignores a corrupted or foreign cache entry', () => {
    const store = stub();
    store.set('field-shift:last-analysis', JSON.stringify({ version: 1, savedAt: '2026-11-14T10:00:00.000Z', data: { strategies: 'x' } }));
    expect(loadLastAnalysis()).toBeUndefined();
    store.set('field-shift:last-analysis', '{broken');
    expect(loadLastAnalysis()).toBeUndefined();
    expect(isAnalysisShape(null)).toBe(false);
  });
});

describe('preferences', () => {
  it('accepts only known values', () => {
    expect(preferencesSchema.safeParse(defaultPreferences).success).toBe(true);
    expect(preferencesSchema.safeParse({ ...defaultPreferences, textSize: 'huge' }).success).toBe(false);
  });
});
