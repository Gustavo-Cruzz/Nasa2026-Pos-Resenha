import { describe, expect, it } from 'vitest';
import { explainPlace, type JoaoData, type JoaoExplanation, type Remote } from '@/lib/explain/joao';
import type { EnsoState } from '@/lib/climate/enso';

const RAIN = [150, 130, 140, 70, 15, 3, 0, 2, 25, 60, 167, 183];
const TMAX = [29, 29, 29, 30, 30, 30, 31, 33, 35, 36, 30, 29];
const TMIN = [20, 20, 20, 19, 18, 16, 16, 17, 20, 22, 21, 20];

const week = (start: string, values: Array<number | null>) => values.map((precipitationMm, index) => ({ date: new Date(Date.parse(`${start}T12:00:00Z`) + index * 86_400_000).toISOString().slice(0, 10), precipitationMm }));
const ready = <T,>(value: T): Remote<T> => ({ state: 'ready', value });
const enso = (value: number, phase: EnsoState['phase'], strength: EnsoState['strength']): EnsoState => ({ index: 'RONI', latest: { season: 'ASO', year: 2026, value }, previous: [], phase, strength, sourceUrl: 'https://example.test/roni' });

function base(overrides: Partial<JoaoData> = {}): JoaoData {
  return {
    placeName: 'Luís Eduardo Magalhães (BA)',
    month: 11,
    climate: {
      monthly: RAIN.map((_, index) => ({ month: index + 1, tmeanMedianC: 25, tminMedianC: TMIN[index], tmaxMedianC: TMAX[index] })),
      rainMedianMmByMonth: RAIN.map((medianTotalMm, index) => ({ month: index + 1, medianTotalMm })),
      rainySeason: { method: 'positive_water_balance', startMonth: 11, endMonth: 3, months: [11, 12, 1, 2, 3], lengthMonths: 5 },
      drySpells: { definition: { consecutiveDays: 7, precipitationBelowMm: 1 }, seasonsAnalyzed: 14, seasonsWithSpell: 11, medianLongestRunDays: 10.5, maxRunDays: 14, maxRunSeasonStartYear: 2011 },
      rootZoneByMonth: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, medianWetness: 0.45, lastYearWetness: index === 10 ? 0.34 : 0.44 })),
      lastYear: 2025,
    },
    forecast: ready(week('2026-11-14', [7.8, 4.4, 14.7, 9.8, 14.1, 6.6, 1.8])),
    enso: ready(enso(1.97, 'el_nino', 'strong')),
    crops: ready({ municipality: 'Luís Eduardo Magalhães', year: '2025', products: [{ label: 'Soja (em grão)', harvestedAreaHa: 241016 }, { label: 'Sorgo (em grão)', harvestedAreaHa: 14778 }, { label: 'Milho (em grão)', harvestedAreaHa: 12056 }, { label: 'Feijão (em grão)', harvestedAreaHa: 6575 }] }),
    ...overrides,
  };
}

const line = (explanation: JoaoExplanation, id: string) => explanation.sections.flatMap((section) => section.lines).find((item) => item.id === id);

describe('João: summary and structure', () => {
  const result = explainPlace(base());
  it('greets with the place and keeps the summary to three short sentences', () => {
    expect(result.intro).toBe('Oi! Eu sou o João. Olhei os dados de Luís Eduardo Magalhães (BA).');
    expect(result.summary).toEqual([
      'A época de mais chuva costuma ir de novembro a março. Estamos nela agora.',
      'Esta semana, a previsão é de cerca de 59 mm, mais do que o normal.',
      'Neste mês, em 2025, o solo na raiz estava mais seco do que o normal.',
    ]);
  });
  it('orders sections as rain, soil, heat, world and always ends with the not-a-recommendation footer', () => {
    expect(result.sections.map((section) => section.id)).toEqual(['rain', 'soil', 'heat', 'world']);
    expect(result.footer).toContain('não uma recomendação');
  });
});

describe('João: rain', () => {
  it('compares the week with what that week normally brings, using each day’s own month at a month boundary', () => {
    const across = explainPlace(base({ forecast: ready(week('2026-11-28', [10, 10, 10, 10, 10, 10, 10])) }));
    // 3 days of November (167/30 each) + 4 of December (183/31 each) ≈ 40.3 mm normal; 70 mm forecast is above.
    expect(line(across, 'forecast')?.text).toBe('A previsão para os próximos 7 dias é de cerca de 70 mm de chuva, mais do que o normal. O normal para essa época é cerca de 40 mm.');
  });
  it('says "near the normal" within 25% and "less" below it', () => {
    expect(line(explainPlace(base({ forecast: ready(week('2026-11-14', Array(7).fill(5.5))) })), 'forecast')?.text).toContain('perto do normal');
    expect(line(explainPlace(base({ forecast: ready(week('2026-11-14', Array(7).fill(2))) })), 'forecast')?.text).toContain('menos do que o normal');
  });
  it('describes the dry season in absolute terms instead of a percentage of almost nothing', () => {
    const dry = explainPlace(base({ month: 7, forecast: ready(week('2026-07-14', Array(7).fill(0))) }));
    expect(line(dry, 'forecast')?.text).toBe('A previsão para os próximos 7 dias é de quase nenhuma chuva, como costuma ser nesta época do ano.');
    expect(dry.summary).toContain('Esta semana, a previsão é de quase nenhuma chuva.');
    const surprise = explainPlace(base({ month: 7, forecast: ready(week('2026-07-14', Array(7).fill(3))) }));
    expect(line(surprise, 'forecast')?.text).toContain('mais do que costuma chover nesta época');
  });
  it('states where we are relative to the rainy season', () => {
    expect(line(explainPlace(base({ month: 6 })), 'rainy-season')?.text).toBe('A época de mais chuva costuma ir de novembro a março. Ela ainda está a cerca de 5 meses.');
    expect(line(explainPlace(base({ month: 10 })), 'rainy-season')?.text).toContain('a cerca de 1 mês.');
  });
  it('handles a place with no rainy season and a place that is wet all year', () => {
    const none = base(); none.climate.rainySeason = null;
    expect(line(explainPlace(none), 'rainy-season')?.text).toContain('a água que evapora costuma ser maior');
    const all = base(); all.climate.rainySeason = { method: 'positive_water_balance', startMonth: 1, endMonth: 12, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], lengthMonths: 12 };
    expect(line(explainPlace(all), 'rainy-season')?.text).toContain('o ano todo');
  });
  it('is honest when the forecast is unavailable and silent while it loads', () => {
    expect(line(explainPlace(base({ forecast: { state: 'unavailable' } })), 'forecast')).toMatchObject({ tone: 'unknown', text: 'Não consegui buscar a previsão de chuva agora.' });
    expect(line(explainPlace(base({ forecast: { state: 'loading' } })), 'forecast')).toBeUndefined();
    expect(line(explainPlace(base({ forecast: ready(week('2026-11-14', [1, 2, null, 4, 5, 6, 7])) })), 'forecast')?.tone).toBe('unknown');
  });
});

describe('João: soil, heat and the world', () => {
  it('compares the root-zone moisture with the normal and marks a drier year as attention', () => {
    expect(line(explainPlace(base()), 'root-zone')).toMatchObject({ tone: 'attention', text: 'Neste mês, em 2025, o solo na raiz estava mais seco do que o normal: 0,34 contra 0,45 no normal.' });
    const wet = base(); wet.climate.rootZoneByMonth![10] = { month: 11, medianWetness: 0.45, lastYearWetness: 0.6 };
    expect(line(explainPlace(wet), 'root-zone')).toMatchObject({ tone: 'good', mood: 'happy' });
    expect(line(explainPlace(wet), 'root-zone')?.text).toContain('mais úmido');
    const near = base(); near.climate.rootZoneByMonth![10] = { month: 11, medianWetness: 0.45, lastYearWetness: 0.47 };
    expect(line(explainPlace(near), 'root-zone')?.text).toContain('perto do normal');
  });
  it('says plainly when there is no soil moisture for the place', () => {
    const none = base(); none.climate.rootZoneByMonth = undefined;
    expect(line(explainPlace(none), 'root-zone')).toMatchObject({ tone: 'unknown' });
  });
  it('explains the dry spells with the project definition and flags them when at least half the years had one', () => {
    const result = line(explainPlace(base()), 'dry-spells');
    expect(result?.tone).toBe('attention');
    expect(result?.text).toContain('Em 11 de 14 anos teve pelo menos uma pausa de 7 dias ou mais');
    expect(result?.text).toContain('a maior pausa foi de 10,5 dias');
    const rare = base(); rare.climate.drySpells = { ...rare.climate.drySpells!, seasonsWithSpell: 2 };
    expect(line(explainPlace(rare), 'dry-spells')?.tone).toBe('good');
    const middle = base(); middle.climate.drySpells = { ...middle.climate.drySpells!, seasonsWithSpell: 5 };
    expect(line(explainPlace(middle), 'dry-spells')?.tone).toBe('info');
    const empty = base(); empty.climate.drySpells = { ...empty.climate.drySpells!, seasonsAnalyzed: 0, medianLongestRunDays: null };
    expect(line(explainPlace(empty), 'dry-spells')).toBeUndefined();
  });
  it('describes the month’s nights and afternoons, and names the hottest month', () => {
    expect(line(explainPlace(base()), 'heat')?.text).toBe('Neste mês, as noites costumam ficar perto de 21,0 °C e as tardes perto de 30,0 °C.');
    expect(line(explainPlace(base({ month: 10 })), 'heat')?.text).toContain('É o mês mais quente do ano por aqui.');
    expect(line(explainPlace(base({ month: 1 })), 'heat')?.text).not.toContain('mais quente');
  });
  it('explains El Niño without claiming a local effect, and covers the neutral phase', () => {
    const text = line(explainPlace(base()), 'enso')?.text ?? '';
    expect(text).toContain('El Niño forte');
    expect(text).toContain('não sei dizer o que muda aqui');
    expect(line(explainPlace(base({ enso: ready(enso(0.1, 'neutral', null)) })), 'enso')?.text).toContain('neutro');
  });
  it('lists the top crops by harvested area without calling them a recommendation, and stays silent outside Brazil', () => {
    expect(line(explainPlace(base()), 'crops')?.text).toBe('Em Luís Eduardo Magalhães, as culturas de grão com mais área colhida são soja, sorgo e milho. Isso mostra o que já se colhe lá, não o que é melhor plantar.');
    expect(line(explainPlace(base({ crops: ready({ municipality: null, year: null, products: null }) })), 'crops')).toBeUndefined();
    expect(line(explainPlace(base({ crops: ready({ municipality: 'Lugar', year: '2025', products: [] }) })), 'crops')?.tone).toBe('unknown');
  });
});

describe('João: language rules', () => {
  const scenarios: JoaoData[] = [
    base(), base({ month: 7, forecast: ready(week('2026-07-14', Array(7).fill(0))) }), base({ month: 1 }), base({ placeName: null }),
    base({ forecast: { state: 'unavailable' }, enso: { state: 'unavailable' }, crops: { state: 'unavailable' } }),
    base({ enso: ready(enso(-1.2, 'la_nina', 'moderate')) }), base({ forecast: { state: 'loading' }, enso: { state: 'loading' }, crops: { state: 'loading' } }),
  ];
  // João explains; he never tells anyone what to do, promises an outcome or calls anything ideal.
  const FORBIDDEN = /\b(plante|plantem|adube|aduba|irrigue|semeie|colha|plant now|fertili[sz]e|irrigate)\b|ideal|recomend|ótim|perfeit|garant|guarante|best time|melhor época|sem risco|vai chover|will rain/i;
  const everyText = (locale: 'pt-BR' | 'en') => scenarios.flatMap((data) => { const r = explainPlace(data, locale); return [r.intro, ...r.summary, ...r.sections.flatMap((section) => [section.title, ...section.lines.flatMap((item) => [item.text, item.hint ?? ''])])]; });
  it.each(['pt-BR', 'en'] as const)('never gives orders, promises or "ideal" claims (%s)', (locale) => {
    for (const text of everyText(locale)) expect(text).not.toMatch(FORBIDDEN);
  });
  it.each(['pt-BR', 'en'] as const)('never prints NaN, undefined or null (%s)', (locale) => {
    for (const text of everyText(locale)) expect(text).not.toMatch(/NaN|undefined|null|\[object/);
  });
  it('keeps the same lines in the same order in both languages', () => {
    for (const data of scenarios) {
      const ids = (locale: 'pt-BR' | 'en') => explainPlace(data, locale).sections.map((section) => [section.id, section.lines.map((item) => `${item.id}:${item.tone}`)]);
      expect(ids('en')).toEqual(ids('pt-BR'));
      expect(explainPlace(data, 'en').summary).toHaveLength(explainPlace(data, 'pt-BR').summary.length);
    }
  });
  it('uses a decimal comma in Portuguese and a point in English', () => {
    expect(line(explainPlace(base(), 'pt-BR'), 'heat')?.text).toContain('21,0 °C');
    expect(line(explainPlace(base(), 'en'), 'heat')?.text).toContain('21.0 °C');
  });
  it('keeps every explanatory sentence short', () => {
    for (const text of everyText('pt-BR')) for (const sentence of text.split(/(?<=[.!?])\s+/)) expect(sentence.length).toBeLessThanOrEqual(190);
  });
  it('says only what it can when the climate series is missing', () => {
    const empty = base(); empty.climate = { monthly: [], rainMedianMmByMonth: [] };
    const result = explainPlace(empty);
    expect(line(result, 'heat')?.tone).toBe('unknown');
    expect(line(result, 'root-zone')?.tone).toBe('unknown');
    expect(line(result, 'forecast')?.text).toBe('A previsão para os próximos 7 dias é de cerca de 59 mm de chuva.');
    expect(result.summary).toEqual(['Esta semana, a previsão é de cerca de 59 mm de chuva.']);
  });
});

describe('João: the typical month and the chart', () => {
  it('says what the month normally brings and how to read the bars and the line', () => {
    expect(line(explainPlace(base()), 'typical-month')?.text).toBe('Em novembro, costuma chover cerca de 167 mm e a temperatura média fica perto de 25,0 °C. No gráfico, as barras são a chuva de cada mês e a linha é a temperatura.');
  });
  it('stays silent when the month has no rain or temperature to explain', () => {
    const none = base(); none.climate.monthly = [];
    expect(line(explainPlace(none), 'typical-month')).toBeUndefined();
  });
});

describe('João: mood follows the data', () => {
  const moodOf = (data: JoaoData, id: string) => line(explainPlace(data), id)?.mood;
  it('is attentive when the soil was drier than usual, animated when it was wetter, neutral when close', () => {
    expect(moodOf(base(), 'root-zone')).toBe('alert');
    const wet = base(); wet.climate.rootZoneByMonth![10] = { month: 11, medianWetness: 0.45, lastYearWetness: 0.6 };
    expect(moodOf(wet, 'root-zone')).toBe('happy');
    const near = base(); near.climate.rootZoneByMonth![10] = { month: 11, medianWetness: 0.45, lastYearWetness: 0.47 };
    expect(moodOf(near, 'root-zone')).toBe('neutral');
  });
  it('reads the week\'s rain against the normal only while the rainy season is on', () => {
    expect(moodOf(base(), 'forecast')).toBe('happy'); // 59 mm against about 39 mm in November
    expect(moodOf(base({ forecast: ready(week('2026-11-14', Array(7).fill(2))) }), 'forecast')).toBe('alert');
    expect(moodOf(base({ forecast: ready(week('2026-11-14', Array(7).fill(5.5))) }), 'forecast')).toBe('neutral');
    // outside the rainy season the same surprise is only information
    expect(moodOf(base({ month: 6, forecast: ready(week('2026-06-14', Array(7).fill(20))) }), 'forecast')).toBe('neutral');
  });
  it('is sad when the data is missing, and in doubt when João says he cannot tell', () => {
    expect(moodOf(base({ forecast: { state: 'unavailable' } }), 'forecast')).toBe('sad');
    expect(moodOf(base(), 'enso')).toBe('unsure');
    const none = base(); none.climate.rootZoneByMonth = undefined;
    expect(moodOf(none, 'root-zone')).toBe('sad');
  });
  it('gives every line a mood, and keeps the same moods in both languages', () => {
    const several = [base(), base({ month: 7, forecast: ready(week('2026-07-14', Array(7).fill(0))) }), base({ forecast: { state: 'unavailable' }, enso: { state: 'unavailable' }, crops: { state: 'unavailable' } })];
    for (const data of several) {
      const flat = (locale: 'pt-BR' | 'en') => explainPlace(data, locale).sections.flatMap((section) => section.lines.map((item) => `${item.id}:${item.mood}`));
      expect(flat('pt-BR').every((entry) => !entry.endsWith('undefined'))).toBe(true);
      expect(flat('en')).toEqual(flat('pt-BR'));
    }
  });
});
