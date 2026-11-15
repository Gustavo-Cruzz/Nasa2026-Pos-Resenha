import type { DrySpellSummary, RainySeason, RootZoneMonth } from '@/lib/climate/seasonality';
import type { EnsoState } from '@/lib/climate/enso';
import { moodForTone, type JoaoMood } from '@/lib/explain/joao-mood';

/**
 * João explains a place in plain words. Everything here is a pure function of the numbers the Explore panel already shows:
 * no model, no network, nothing invented. Each sentence compares a value with the place's own history, says where it comes
 * from, and never tells anyone what to plant or do. Missing data becomes an honest "I don't have this" line, never a guess.
 */

type Locale = 'pt-BR' | 'en';

/** A remote reading that may still be loading, may have failed, or may be ready. Loading says nothing; failure says so honestly. */
export type Remote<T> = { state: 'loading' } | { state: 'unavailable' } | { state: 'ready'; value: T };

export type JoaoData = {
  /** Place name as shown on the page, or null for a bare map point. */
  placeName: string | null;
  /** Current calendar month, 1–12 (injected so the output is testable). */
  month: number;
  climate: {
    monthly: Array<{ month: number; tmeanMedianC: number | null; tminMedianC?: number | null; tmaxMedianC?: number | null }>;
    rainMedianMmByMonth: Array<{ month: number; medianTotalMm: number | null }>;
    /** undefined = not computed; null = computed and no month has a positive water balance. */
    rainySeason?: RainySeason | null;
    drySpells?: DrySpellSummary | null;
    rootZoneByMonth?: RootZoneMonth[];
    lastYear?: number;
  };
  forecast: Remote<Array<{ date: string; precipitationMm: number | null }>>;
  enso: Remote<EnsoState>;
  /** Municipal harvested area. `outside_brazil` means no municipality was matched: João says nothing about crops. */
  crops: Remote<{ municipality: string | null; year: string | null; products: Array<{ label: string; harvestedAreaHa: number | null }> | null }>;
};

/** `good` is a favourable reading against the place's own normal, `attention` one worth noticing, `unknown` a missing one. It never means a field is doing well or badly. */
export type JoaoTone = 'good' | 'info' | 'attention' | 'unknown';
export type JoaoSectionId = 'rain' | 'soil' | 'heat' | 'world';
export type JoaoLine = { id: string; tone: JoaoTone; /** João's mood for this line: from the tone, unless the line asks for a specific one. */ mood: JoaoMood; text: string; /** How the number was worked out, shown smaller. */ hint?: string };
/** A line as the rules build it; the mood is filled in at the end. */
type RawLine = Omit<JoaoLine, 'mood'> & { mood?: JoaoMood };
export type JoaoSection = { id: JoaoSectionId; title: string; lines: JoaoLine[] };
export type JoaoExplanation = { intro: string; summary: string[]; sections: JoaoSection[]; footer: string };

/** "Near the normal" means within this share of the typical value (forecast) or this much on the 0–1 wetness scale. */
export const NEAR_NORMAL_SHARE = 0.25;
export const NEAR_NORMAL_WETNESS = 0.05;
/** Below this typical weekly rain (mm) a percentage comparison is meaningless, so the dry season is described in absolute terms. */
export const DRY_WEEK_MM = 5;

const MONTHS = {
  'pt-BR': ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
} as const;

const FOOTER = {
  'pt-BR': 'Isso é um retrato do clima do lugar, não uma recomendação para a sua lavoura. Para decidir o que fazer, converse com um técnico da sua região.',
  en: 'This is a picture of the place’s climate, not a recommendation for your farm. To decide what to do, talk to a technician in your region.',
} as const;

const pick = (locale: Locale, pt: string, en: string) => (locale === 'en' ? en : pt);
const num = (value: number, digits: number, locale: Locale) => value.toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const monthName = (month: number, locale: Locale) => MONTHS[locale][month - 1];
const list = (items: string[], locale: Locale) => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ${locale === 'en' ? 'and' : 'e'} ${items[items.length - 1]}`;
const stripUnit = (label: string) => label.replace(/\s*\(.*\)$/, '').toLowerCase();

type Comparison = 'above' | 'below' | 'near';

function compareShare(value: number, normal: number): Comparison {
  if (value > normal * (1 + NEAR_NORMAL_SHARE)) return 'above';
  if (value < normal * (1 - NEAR_NORMAL_SHARE)) return 'below';
  return 'near';
}

/** What the next 7 days would normally bring: each day gets its month's median total spread over that month's days. Null if any month is unknown. */
function normalWeekMm(days: Array<{ date: string }>, rainMedianByMonth: JoaoData['climate']['rainMedianMmByMonth']): number | null {
  let total = 0;
  for (const day of days) {
    const year = Number(day.date.slice(0, 4)); const month = Number(day.date.slice(5, 7));
    const median = rainMedianByMonth.find((item) => item.month === month)?.medianTotalMm;
    if (median === null || median === undefined) return null;
    total += median / daysInMonth(year, month);
  }
  return total;
}

type ForecastFacts = { totalMm: number; normalMm: number | null; kind: 'dry_both' | 'wetter_than_dry_normal' | 'compared' | 'alone'; comparison?: Comparison };

function forecastFacts(data: JoaoData): ForecastFacts | 'unavailable' | 'loading' {
  if (data.forecast.state !== 'ready') return data.forecast.state;
  const week = data.forecast.value.slice(0, 7);
  if (week.length < 7 || week.some((day) => day.precipitationMm === null)) return 'unavailable';
  const totalMm = week.reduce((sum, day) => sum + (day.precipitationMm as number), 0);
  const normalMm = normalWeekMm(week, data.climate.rainMedianMmByMonth);
  if (normalMm === null) return { totalMm, normalMm, kind: 'alone' };
  if (normalMm < DRY_WEEK_MM) return totalMm < DRY_WEEK_MM ? { totalMm, normalMm, kind: 'dry_both' } : { totalMm, normalMm, kind: 'wetter_than_dry_normal' };
  return { totalMm, normalMm, kind: 'compared', comparison: compareShare(totalMm, normalMm) };
}

const COMPARISON_PHRASE = {
  'pt-BR': { above: 'mais do que o normal', below: 'menos do que o normal', near: 'perto do normal' },
  en: { above: 'more than usual', below: 'less than usual', near: 'close to usual' },
} as const;

function rainLines(data: JoaoData, locale: Locale): RawLine[] {
  const lines: RawLine[] = [];
  const monthRain = data.climate.rainMedianMmByMonth.find((item) => item.month === data.month)?.medianTotalMm ?? null;
  const monthTemp = data.climate.monthly.find((item) => item.month === data.month)?.tmeanMedianC ?? null;
  if (monthRain !== null && monthTemp !== null) {
    const name = monthName(data.month, locale);
    lines.push({ id: 'typical-month', tone: 'info', text: pick(locale, `Em ${name}, costuma chover cerca de ${num(monthRain, 0, locale)} mm e a temperatura média fica perto de ${num(monthTemp, 1, locale)} °C. No gráfico, as barras são a chuva de cada mês e a linha é a temperatura.`, `In ${name}, it usually rains about ${num(monthRain, 0, locale)} mm and the average temperature is around ${num(monthTemp, 1, locale)} °C. In the chart, the bars are each month’s rain and the line is the temperature.`), hint: pick(locale, 'É o valor do meio entre os anos de 2011 a 2025 (NASA POWER), então mostra o que costuma acontecer, não o que vai acontecer.', 'It is the middle value of the years 2011 to 2025 (NASA POWER), so it shows what usually happens, not what will happen.') });
  }
  const facts = forecastFacts(data);
  const forecastHint = pick(locale, '1 mm de chuva é 1 litro de água em cada metro quadrado. É uma previsão de modelo do tempo e pode mudar. “Perto do normal” quer dizer até 25% de diferença.', '1 mm of rain is 1 litre of water on every square metre. This is a weather-model forecast and can change. “Close to usual” means within 25%.');
  if (facts === 'unavailable') lines.push({ id: 'forecast', tone: 'unknown', text: pick(locale, 'Não consegui buscar a previsão de chuva agora.', 'I could not fetch the rain forecast right now.') });
  else if (facts !== 'loading') {
    const total = num(facts.totalMm, 0, locale);
    const normal = facts.normalMm === null ? '' : num(facts.normalMm, 0, locale);
    const text = facts.kind === 'dry_both' ? pick(locale, 'A previsão para os próximos 7 dias é de quase nenhuma chuva, como costuma ser nesta época do ano.', 'The forecast for the next 7 days is almost no rain, as is usual at this time of year.')
      : facts.kind === 'wetter_than_dry_normal' ? pick(locale, `A previsão para os próximos 7 dias é de cerca de ${total} mm, mais do que costuma chover nesta época (cerca de ${normal} mm).`, `The forecast for the next 7 days is about ${total} mm, more than it usually rains at this time of year (about ${normal} mm).`)
        : facts.kind === 'compared' ? pick(locale, `A previsão para os próximos 7 dias é de cerca de ${total} mm de chuva, ${COMPARISON_PHRASE['pt-BR'][facts.comparison as Comparison]}. O normal para essa época é cerca de ${normal} mm.`, `The forecast for the next 7 days is about ${total} mm of rain, ${COMPARISON_PHRASE.en[facts.comparison as Comparison]}. The usual for this time of year is about ${normal} mm.`)
          : pick(locale, `A previsão para os próximos 7 dias é de cerca de ${total} mm de chuva.`, `The forecast for the next 7 days is about ${total} mm of rain.`);
    // In the rainy season, more rain than normal is a favourable reading and less is worth noticing; outside it the week is only informative.
    const inSeason = data.climate.rainySeason?.months.includes(data.month) === true;
    const tone: JoaoTone = facts.kind === 'compared' && inSeason ? (facts.comparison === 'above' ? 'good' : facts.comparison === 'below' ? 'attention' : 'info') : 'info';
    lines.push({ id: 'forecast', tone, text, hint: forecastHint });
  }
  const { rainySeason } = data.climate;
  if (rainySeason !== undefined) {
    const hint = pick(locale, 'Chamo de época chuvosa os meses em que chove mais do que a água que evapora, olhando os anos de 2011 a 2025.', 'I call it the rainy season when it rains more than the water that evaporates, looking at the years 2011 to 2025.');
    if (rainySeason === null) lines.push({ id: 'rainy-season', tone: 'info', text: pick(locale, 'Por aqui, a água que evapora costuma ser maior do que a que chove, em todos os meses.', 'Here, the water that evaporates is usually greater than the rain, in every month.'), hint });
    else if (rainySeason.lengthMonths === 12) lines.push({ id: 'rainy-season', tone: 'info', text: pick(locale, 'Por aqui, chove mais do que evapora o ano todo.', 'Here, it rains more than evaporates all year round.'), hint });
    else {
      const start = monthName(rainySeason.startMonth, locale); const end = monthName(rainySeason.endMonth, locale);
      const inside = rainySeason.months.includes(data.month);
      const wait = (rainySeason.startMonth - data.month + 12) % 12;
      const where = inside ? pick(locale, ' Estamos nela agora.', ' We are in it now.') : pick(locale, ` Ela ainda está a cerca de ${wait} ${wait === 1 ? 'mês' : 'meses'}.`, ` It is still about ${wait} ${wait === 1 ? 'month' : 'months'} away.`);
      lines.push({ id: 'rainy-season', tone: 'info', text: pick(locale, `A época de mais chuva costuma ir de ${start} a ${end}.${where}`, `The rainiest time usually runs from ${start} to ${end}.${where}`), hint });
    }
  }
  return lines;
}

type RootFacts = { year: number | null; median: number | null; last: number | null; comparison?: Comparison };
function rootFacts(data: JoaoData): RootFacts | null {
  const entry = data.climate.rootZoneByMonth?.find((item) => item.month === data.month);
  if (!entry || entry.medianWetness === null) return null;
  const last = entry.lastYearWetness;
  const year = data.climate.lastYear ?? null;
  if (last === null || year === null) return { year, median: entry.medianWetness, last: null };
  const diff = last - entry.medianWetness;
  return { year, median: entry.medianWetness, last, comparison: diff > NEAR_NORMAL_WETNESS ? 'above' : diff < -NEAR_NORMAL_WETNESS ? 'below' : 'near' };
}

function soilLines(data: JoaoData, locale: Locale): RawLine[] {
  const lines: RawLine[] = [];
  const root = rootFacts(data);
  const scale = pick(locale, 'A escala vai de 0 (seco) a 1 (encharcado). É uma estimativa da NASA para uma área grande, não do seu terreno.', 'The scale runs from 0 (dry) to 1 (waterlogged). It is a NASA estimate for a large area, not for your plot.');
  if (data.climate.rootZoneByMonth === undefined || !root) lines.push({ id: 'root-zone', tone: 'unknown', text: pick(locale, 'Não tenho a umidade do solo na raiz para este lugar.', 'I do not have the root-zone soil moisture for this place.') });
  else if (root.last === null || root.year === null) lines.push({ id: 'root-zone', tone: 'info', text: pick(locale, `Neste mês do ano, a umidade típica do solo na raiz é ${num(root.median as number, 2, locale)}.`, `In this month of the year, the typical root-zone soil moisture is ${num(root.median as number, 2, locale)}.`), hint: scale });
  else {
    const phrase = { above: pick(locale, 'mais úmido do que o normal', 'wetter than usual'), below: pick(locale, 'mais seco do que o normal', 'drier than usual'), near: pick(locale, 'perto do normal', 'close to usual') }[root.comparison as Comparison];
    lines.push({ id: 'root-zone', tone: root.comparison === 'below' ? 'attention' : root.comparison === 'above' ? 'good' : 'info', text: pick(locale, `Neste mês, em ${root.year}, o solo na raiz estava ${phrase}: ${num(root.last, 2, locale)} contra ${num(root.median as number, 2, locale)} no normal.`, `In this month, in ${root.year}, the root-zone soil was ${phrase}: ${num(root.last, 2, locale)} against ${num(root.median as number, 2, locale)} usually.`), hint: scale });
  }
  const spells = data.climate.drySpells;
  if (spells && spells.seasonsAnalyzed > 0 && spells.medianLongestRunDays !== null) {
    const days = spells.definition.consecutiveDays;
    const text = pick(locale,
      `Mesmo na época de chuva, às vezes passam vários dias sem chover (o veranico). Em ${spells.seasonsWithSpell} de ${spells.seasonsAnalyzed} anos teve pelo menos uma pausa de ${days} dias ou mais. Num ano comum, a maior pausa foi de ${num(spells.medianLongestRunDays, spells.medianLongestRunDays % 1 === 0 ? 0 : 1, locale)} dias.`,
      `Even in the rainy season, several days sometimes pass without rain (a dry spell). In ${spells.seasonsWithSpell} of ${spells.seasonsAnalyzed} years there was at least one pause of ${days} days or more. In a typical year, the longest pause was ${num(spells.medianLongestRunDays, spells.medianLongestRunDays % 1 === 0 ? 0 : 1, locale)} days.`);
    lines.push({ id: 'dry-spells', tone: spells.seasonsWithSpell * 2 >= spells.seasonsAnalyzed ? 'attention' : spells.seasonsWithSpell * 4 <= spells.seasonsAnalyzed ? 'good' : 'info', text, hint: pick(locale, `Conto como dia seco o dia com menos de ${spells.definition.precipitationBelowMm} mm de chuva. Só entram os anos com todos os dias medidos.`, `A dry day is one with less than ${spells.definition.precipitationBelowMm} mm of rain. Only years with every day measured are counted.`) });
  }
  return lines;
}

function heatLines(data: JoaoData, locale: Locale): RawLine[] {
  const now = data.climate.monthly.find((item) => item.month === data.month);
  const low = now?.tminMedianC ?? null; const high = now?.tmaxMedianC ?? null;
  if (low === null || high === null) return [{ id: 'heat', tone: 'unknown', text: pick(locale, 'Não tenho as temperaturas mínima e máxima deste lugar.', 'I do not have the minimum and maximum temperatures for this place.') }];
  const highs = data.climate.monthly.flatMap((item) => item.tmaxMedianC === null || item.tmaxMedianC === undefined ? [] : [item.tmaxMedianC]);
  const rank = highs.length === 12 ? (high === Math.max(...highs) ? 'hottest' : high === Math.min(...highs) ? 'coolest' : null) : null;
  const extra = rank === 'hottest' ? pick(locale, ' É o mês mais quente do ano por aqui.', ' It is the hottest month of the year here.') : rank === 'coolest' ? pick(locale, ' É o mês mais frio do ano por aqui.', ' It is the coolest month of the year here.') : '';
  return [{ id: 'heat', tone: 'info', text: pick(locale, `Neste mês, as noites costumam ficar perto de ${num(low, 1, locale)} °C e as tardes perto de ${num(high, 1, locale)} °C.${extra}`, `This month, nights are usually around ${num(low, 1, locale)} °C and afternoons around ${num(high, 1, locale)} °C.${extra}`), hint: pick(locale, 'Temperatura do ar a 2 metros do chão (NASA), no meio dos anos de 2011 a 2025.', 'Air temperature 2 metres above the ground (NASA), the middle value of the years 2011 to 2025.') }];
}

const ENSO_NAME = {
  'pt-BR': { el_nino: 'El Niño', la_nina: 'La Niña' },
  en: { el_nino: 'El Niño', la_nina: 'La Niña' },
} as const;
const STRENGTH = { 'pt-BR': { weak: 'fraco', moderate: 'moderado', strong: 'forte', very_strong: 'muito forte' }, en: { weak: 'weak', moderate: 'moderate', strong: 'strong', very_strong: 'very strong' } } as const;

function worldLines(data: JoaoData, locale: Locale): RawLine[] {
  const lines: RawLine[] = [];
  if (data.enso.state === 'unavailable') lines.push({ id: 'enso', tone: 'unknown', text: pick(locale, 'Não consegui ver como está o El Niño agora.', 'I could not check El Niño right now.') });
  else if (data.enso.state === 'ready') {
    const { phase, strength } = data.enso.value;
    const now = phase === 'neutral' ? pick(locale, 'O Pacífico está neutro agora: sem El Niño nem La Niña.', 'The Pacific is neutral now: no El Niño or La Niña.')
      : pick(locale, `O Pacífico está em ${ENSO_NAME['pt-BR'][phase]}${strength ? ` ${STRENGTH['pt-BR'][strength]}` : ''} agora.`, `The Pacific is in ${strength ? `${STRENGTH.en[strength]} ` : ''}${ENSO_NAME.en[phase]} now.`);
    lines.push({ id: 'enso', tone: 'info', mood: 'unsure', text: `${now} ${pick(locale, 'Isso muda a chuva em algumas partes do mundo, mas eu não sei dizer o que muda aqui.', 'This changes the rain in some parts of the world, but I cannot say what it changes here.')}`, hint: pick(locale, 'Índice RONI da NOAA, uma medida global do Pacífico.', 'NOAA’s RONI index, a global measure of the Pacific.') });
  }
  if (data.crops.state === 'unavailable') lines.push({ id: 'crops', tone: 'unknown', text: pick(locale, 'Não consegui buscar as culturas deste município agora.', 'I could not fetch the crops of this municipality right now.') });
  else if (data.crops.state === 'ready' && data.crops.value.municipality) {
    const { municipality, year, products } = data.crops.value;
    const ranked = [...(products ?? [])].filter((item) => item.harvestedAreaHa !== null && item.harvestedAreaHa > 0).sort((a, b) => (b.harvestedAreaHa ?? 0) - (a.harvestedAreaHa ?? 0)).slice(0, 3).map((item) => stripUnit(item.label));
    const hint = pick(locale, `Área colhida, segundo o IBGE${year ? ` (${year})` : ''}. Só entram soja, milho, sorgo, girassol, feijão e arroz.`, `Harvested area, according to IBGE${year ? ` (${year})` : ''}. Only soybean, maize, sorghum, sunflower, bean and rice are included.`);
    if (!ranked.length) lines.push({ id: 'crops', tone: 'unknown', text: pick(locale, `Não achei registro dessas culturas em ${municipality} na base do IBGE que eu uso.`, `I found no record of these crops in ${municipality} in the IBGE data I use.`), hint });
    else lines.push({ id: 'crops', tone: 'info', text: pick(locale, `Em ${municipality}, ${ranked.length === 1 ? 'a cultura de grão com mais área colhida é' : 'as culturas de grão com mais área colhida são'} ${list(ranked, locale)}. Isso mostra o que já se colhe lá, não o que é melhor plantar.`, `In ${municipality}, ${ranked.length === 1 ? 'the grain crop with the most harvested area is' : 'the grain crops with the most harvested area are'} ${list(ranked, locale)}. This shows what is already harvested there, not what is best to plant.`), hint });
  }
  return lines;
}

/** Two or three short sentences: the rainy season, the week ahead, and the one soil fact most worth knowing. */
function summarize(data: JoaoData, locale: Locale): string[] {
  const out: string[] = [];
  const { rainySeason } = data.climate;
  if (rainySeason === null) out.push(pick(locale, 'Por aqui, a água que evapora costuma ser maior do que a que chove.', 'Here, the water that evaporates is usually greater than the rain.'));
  else if (rainySeason?.lengthMonths === 12) out.push(pick(locale, 'Por aqui, chove bastante o ano todo.', 'Here, it rains a lot all year round.'));
  else if (rainySeason) out.push(pick(locale, `A época de mais chuva costuma ir de ${monthName(rainySeason.startMonth, locale)} a ${monthName(rainySeason.endMonth, locale)}.${rainySeason.months.includes(data.month) ? ' Estamos nela agora.' : ''}`, `The rainiest time usually runs from ${monthName(rainySeason.startMonth, locale)} to ${monthName(rainySeason.endMonth, locale)}.${rainySeason.months.includes(data.month) ? ' We are in it now.' : ''}`));
  const facts = forecastFacts(data);
  if (facts !== 'unavailable' && facts !== 'loading') {
    if (facts.kind === 'dry_both') out.push(pick(locale, 'Esta semana, a previsão é de quase nenhuma chuva.', 'This week, the forecast is almost no rain.'));
    else if (facts.kind === 'compared') out.push(pick(locale, `Esta semana, a previsão é de cerca de ${num(facts.totalMm, 0, locale)} mm, ${COMPARISON_PHRASE['pt-BR'][facts.comparison as Comparison]}.`, `This week, the forecast is about ${num(facts.totalMm, 0, locale)} mm, ${COMPARISON_PHRASE.en[facts.comparison as Comparison]}.`));
    else out.push(pick(locale, `Esta semana, a previsão é de cerca de ${num(facts.totalMm, 0, locale)} mm de chuva.`, `This week, the forecast is about ${num(facts.totalMm, 0, locale)} mm of rain.`));
  }
  const root = rootFacts(data);
  const spells = data.climate.drySpells;
  if (root?.comparison === 'below' && root.year !== null) out.push(pick(locale, `Neste mês, em ${root.year}, o solo na raiz estava mais seco do que o normal.`, `This month, in ${root.year}, the root-zone soil was drier than usual.`));
  else if (spells && spells.seasonsAnalyzed > 0 && spells.seasonsWithSpell * 2 >= spells.seasonsAnalyzed) out.push(pick(locale, 'Mesmo na época de chuva, é comum ficar vários dias seguidos sem chover.', 'Even in the rainy season, it is common to have several days in a row without rain.'));
  return out.slice(0, 3);
}

/** Builds João's explanation of a place. Sections with nothing to say (for example while data loads) are left out. */
export function explainPlace(data: JoaoData, locale: Locale = 'en'): JoaoExplanation {
  const sections: JoaoSection[] = (([
    { id: 'rain', title: pick(locale, 'A chuva', 'The rain'), lines: rainLines(data, locale) },
    { id: 'soil', title: pick(locale, 'O solo', 'The soil'), lines: soilLines(data, locale) },
    { id: 'heat', title: pick(locale, 'O calor', 'The heat'), lines: heatLines(data, locale) },
    { id: 'world', title: pick(locale, 'O mundo e a sua cidade', 'The world and your town'), lines: worldLines(data, locale) },
  ] as Array<Omit<JoaoSection, 'lines'> & { lines: RawLine[] }>).map((section) => ({ ...section, lines: section.lines.map((line): JoaoLine => ({ ...line, mood: line.mood ?? moodForTone(line.tone) })) })) as JoaoSection[]).filter((section) => section.lines.length > 0);
  const intro = data.placeName
    ? pick(locale, `Oi! Eu sou o João. Olhei os dados de ${data.placeName}.`, `Hi! I am João. I looked at the data for ${data.placeName}.`)
    : pick(locale, 'Oi! Eu sou o João. Olhei os dados deste ponto do mapa.', 'Hi! I am João. I looked at the data for this point on the map.');
  return { intro, summary: summarize(data, locale), sections, footer: FOOTER[locale] };
}
