import { describe, expect, it } from 'vitest';
import type { AnalysisResult } from '@/lib/engine/types';
import { classifyMonth, dominantWeather, windowMonthsWeather } from '@/lib/future-farm/weather';
import { futureFarmCopy } from '@/lib/future-farm/copy';
import type { MonthWeather } from '@/lib/future-farm/types';

const blank: { balanceMm: number | null; precipMm: number | null; rainDays: number | null; tmaxC: number | null; tminC: number | null; solarMjM2Day: number | null; frostShare: number | null } = { balanceMm: null, precipMm: null, rainDays: null, tmaxC: null, tminC: null, solarMjM2Day: null, frostShare: null };
const c = (over: Partial<typeof blank>, opts?: { annualSolarMjM2Day?: number | null }) => classifyMonth({ ...blank, ...over }, opts);

describe('classifyMonth', () => {
  it('classifies each branch', () => {
    expect(c({ frostShare: 0.2 })).toBe('frost');
    expect(c({ precipMm: 260, rainDays: 20 })).toBe('storm');
    expect(c({ precipMm: 260 })).toBe('storm');
    expect(c({ precipMm: 240 })).not.toBe('storm');
    expect(c({ precipMm: 260, rainDays: 15, balanceMm: 40 })).toBe('rain');
    expect(c({ balanceMm: 30 })).toBe('rain');
    expect(c({ tmaxC: 34, balanceMm: 0 })).toBe('heat');
    expect(c({ balanceMm: -60 })).toBe('drought');
    expect(c({ rainDays: 12, balanceMm: 10 })).toBe('cloudy');
    expect(c({ solarMjM2Day: 16, balanceMm: 0 }, { annualSolarMjM2Day: 20 })).toBe('cloudy');
    expect(c({ solarMjM2Day: 18, balanceMm: 0 }, { annualSolarMjM2Day: 20 })).toBe('sunny');
    expect(c({ solarMjM2Day: 16 })).toBe('sunny'); // no annual reference
    expect(c({ tmaxC: 28, balanceMm: -10 })).toBe('sunny');
  });
  it('respects priority order', () => {
    expect(c({ frostShare: 0.5, precipMm: 400, rainDays: 25, balanceMm: 100, tmaxC: 36 })).toBe('frost');
    expect(c({ precipMm: 400, rainDays: 25, balanceMm: 100, tmaxC: 36 })).toBe('storm');
    expect(c({ balanceMm: 100, tmaxC: 36 })).toBe('rain');
    expect(c({ balanceMm: -100, tmaxC: 36 })).toBe('heat');
    expect(c({ balanceMm: 10, rainDays: 15 })).toBe('cloudy');
  });
  it('returns unknown when everything is null', () => { expect(c({})).toBe('unknown'); });
});

describe('dominantWeather', () => {
  const m = (...w: MonthWeather['weather'][]) => w.map((weather) => ({ weather }));
  it('picks most frequent, breaks ties by severity, ignores unknown', () => {
    expect(dominantWeather(m('rain', 'rain', 'sunny'))).toBe('rain');
    expect(dominantWeather(m('sunny', 'storm', 'rain', 'sunny', 'storm'))).toBe('storm');
    expect(dominantWeather(m('sunny', 'drought'))).toBe('drought');
    expect(dominantWeather(m('cloudy', 'rain'))).toBe('rain');
    expect(dominantWeather(m('unknown', 'sunny'))).toBe('sunny');
    expect(dominantWeather(m('neutral', 'neutral', 'rain'))).toBe('sunny');
    expect(dominantWeather([])).toBe('unknown');
  });
});

describe('windowMonthsWeather', () => {
  const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, tmeanMedianC: 24, tminMedianC: 17, tmaxMedianC: i + 1 === 2 ? 35 : 30, precipMedianMm: 3, solarMedianMjM2Day: 20, validTemperatureDays: 1, validPrecipitationDays: 1 }));
  const wb = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, precipMedianMm: i + 1 === 12 ? 300 : 100, et0MedianMm: 100, balanceMedianMm: i + 1 === 12 ? 200 : -70, validYears: 14, expectedYears: 15, coveragePct: 93 }));
  const wc = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, imergMedianTotalMm: 100, medianRainDays: i + 1 === 12 ? 22 : 5, rootZoneWetnessMedian: 0.5, validImergYears: 14, expectedYears: 15, imergCoveragePct: 100, rootZoneCoveragePct: 100 }));
  const analysis = { input: { plantingMonth: 11, history: [] }, climate: { status: 'available', monthly, historicalPrecipitationByMonth: [], waterBalanceByMonth: wb, waterContextByMonth: wc, frostByMonth: [] } } as unknown as AnalysisResult;
  it('walks the crop window starting at the planting month', () => {
    const months = windowMonthsWeather(analysis, 'soybean', 'A');
    expect(months.length).toBeGreaterThan(1);
    expect(months[0]).toMatchObject({ month: 11, weather: 'drought' });
    expect(months[1]).toMatchObject({ month: 12, weather: 'storm', balanceMm: 200, rainDays: 22 });
    expect(months[2]).toMatchObject({ month: 1 });
    expect(months.find((x) => x.month === 2)?.weather).toBe('heat');
  });
  it('returns [] without climate or window', () => {
    expect(windowMonthsWeather({ ...analysis, climate: { ...analysis.climate, status: 'unavailable' } } as AnalysisResult, 'soybean', 'A')).toEqual([]);
    expect(windowMonthsWeather(analysis, 'soybean', 'B')).toEqual([]); // no safrinha observed in history
  });
});

describe('copy', () => {
  it('builds month detail with N/D for nulls', () => {
    const m: MonthWeather = { month: 10, weather: 'rain', balanceMm: 85, precipMm: 200, rainDays: 16, tmaxC: 31, tminC: null, solarMjM2Day: null, frostShare: null };
    expect(futureFarmCopy('pt-BR').monthWeatherDetail(m)).toBe('out · Chuva · P−ET0 +85 mm · 16 dias de chuva · Tmáx 31 °C');
    expect(futureFarmCopy('en').monthWeatherDetail({ ...m, balanceMm: null, rainDays: null, tmaxC: null })).toBe('oct · Rain · P−ET0 N/D mm · N/D rain days · Tmax N/D °C');
  });
});
