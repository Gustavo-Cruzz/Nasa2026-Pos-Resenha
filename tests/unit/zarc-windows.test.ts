import { describe, expect, it } from 'vitest';
import { resolveBrazilRegionalContext, unpackZarcRisk } from '@/lib/brazil/context';
import { zarcDecendiosOfMonth, zarcSafraMonths, zarcWindowStatus, zarcYearCalendar } from '@/lib/brazil/zarc';
import type { BrazilRegionalContext, ZarcWindow } from '@/lib/brazil/types';

const rioVerde = resolveBrazilRegionalContext({ latitude: -17.75, longitude: -50.95 });

function fake(windows: ZarcWindow[]): BrazilRegionalContext {
  return { ...rioVerde, zarc: { ...rioVerde.zarc!, crops: { soybean: { ...rioVerde.zarc!.crops.soybean, windows } } } };
}
const risk = (entries: Record<number, 20 | 30 | 40>) => Array.from({ length: 36 }, (_, i) => entries[i + 1] ?? 0) as ZarcWindow['risk'];

describe('ZARC legend and calendar', () => {
  it('maps months to decêndios (dec1-3 = Jan ... dec34-36 = Dec)', () => {
    expect(zarcDecendiosOfMonth(1)).toEqual([1, 2, 3]);
    expect(zarcDecendiosOfMonth(10)).toEqual([28, 29, 30]);
    expect(zarcDecendiosOfMonth(12)).toEqual([34, 35, 36]);
    expect(zarcDecendiosOfMonth(13)).toEqual([]);
  });

  it('unpacks the compact table: 0 not indicated, 20/30/40 risk levels', () => {
    const unpacked = unpackZarcRisk('QAAAAAAAAlVV');
    expect(unpacked).toHaveLength(36);
    expect(unpacked.slice(0, 3)).toEqual([20, 0, 0]);
    expect(new Set(unpacked)).toEqual(new Set([0, 20, 30]));
    expect(() => unpackZarcRisk('!!!!!!!!!!!!')).toThrow();
  });

  it('interprets Rio Verde soybean from the real 2026/27 table', () => {
    expect(rioVerde.zarc?.crops.soybean.windows.length).toBeGreaterThan(0);
    const october = zarcWindowStatus(rioVerde, 'soybean', 10);
    expect(october.status).toBe('indicated');
    expect([20, 30, 40]).toContain(october.riskLevelPct);
    expect(october.decendios).toEqual([28, 29, 30]);
    expect(october.soilCodes.length).toBeGreaterThan(1);
    expect(october.sourceRefs[0].url).toContain('ManualdeInstruesdonovoPaineldoZarc.pdf');
    expect(zarcWindowStatus(rioVerde, 'soybean', 11).status).toBe('indicated');
    expect(zarcWindowStatus(rioVerde, 'soybean', 4).status).toBe('not_indicated');
    expect(zarcWindowStatus(rioVerde, 'soybean', 4).riskLevelPct).toBeNull();
  });

  it('builds a 12-month calendar and safra months', () => {
    expect(zarcYearCalendar(rioVerde, 'soybean')).toHaveLength(12);
    const months = zarcSafraMonths(rioVerde, 'soybean');
    expect(months).toContain(10);
    expect(months).not.toContain(4);
  });

  it('returns unknown when evidence is missing', () => {
    expect(zarcWindowStatus(null, 'soybean', 10).status).toBe('unknown');
    expect(zarcWindowStatus(rioVerde, 'unobtainium', 10).status).toBe('unknown');
    expect(zarcWindowStatus(rioVerde, 'soybean', 0).status).toBe('unknown');
    expect(zarcSafraMonths(null, 'soybean')).toEqual([]);
  });

  it('aggregates across soils/cycles (best and worst) and falls back honestly on texture', () => {
    const context = fake([
      { culture: 'Soja', management: 'Sequeiro', cycleCodes: [20], soilCodes: [1], risk: risk({ 28: 20, 29: 30 }) },
      { culture: 'Soja', management: 'Sequeiro', cycleCodes: [21], soilCodes: [3], risk: risk({ 30: 40 }) },
      { culture: 'Soja', management: 'Irrigado', cycleCodes: [20], soilCodes: [1], risk: risk({ 1: 20 }) },
    ]);
    const any = zarcWindowStatus(context, 'soybean', 10);
    expect(any).toMatchObject({ status: 'indicated', riskLevelPct: 20, riskLevelWorstPct: 40, soilScope: 'any', soilCodes: [1, 3], cycleCodes: [20, 21], indicatedDecendios: [28, 29, 30], allConsideredIndicated: true });
    expect(zarcWindowStatus(context, 'soybean', 1).status).toBe('not_indicated');
    const clayey = zarcWindowStatus(context, 'soybean', 10, 'clayey');
    expect(clayey).toMatchObject({ status: 'indicated', riskLevelPct: 40, soilCodes: [3], soilScope: 'texture' });
    expect(zarcWindowStatus(context, 'soybean', 10, 'sandy', 21).status).toBe('unknown');
    expect(zarcWindowStatus(context, 'soybean', 10, null, 22).status).toBe('unknown');
    expect(zarcWindowStatus(context, 'soybean', 10, 'medium').status).toBe('unknown');
  });
});
