type Locale = 'pt-BR' | 'en';

const MONTHS = {
  'pt-BR': ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
} as const;
const MONTHS_SHORT = {
  'pt-BR': ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
} as const;

export const monthName = (month: number, locale: Locale): string => MONTHS[locale][month - 1] ?? '';

/** "out → mar": short month range of a rainy season. */
export function monthRangeShort(startMonth: number, endMonth: number, locale: Locale): string {
  return `${MONTHS_SHORT[locale][startMonth - 1] ?? ''} → ${MONTHS_SHORT[locale][endMonth - 1] ?? ''}`;
}

export type Rain7 = { series: Array<number | null>; totalMm: number | null; knownDays: number };

/** The next 7 forecast days: daily values as given and their sum over the days that are known. All unknown (or no days) → total null. Missing days are never filled in. */
export function rainNext7(days: ReadonlyArray<{ precipitationMm: number | null }>): Rain7 {
  const series = days.slice(0, 7).map((day) => day.precipitationMm);
  const known = series.filter((value): value is number => value !== null);
  return { series, totalMm: known.length ? known.reduce((sum, value) => sum + value, 0) : null, knownDays: known.length };
}

/** The 12 monthly rain medians (index 0 = January); a month with no value stays null. */
export function monthlyRainSeries(items: ReadonlyArray<{ month: number; medianTotalMm: number | null }>): Array<number | null> {
  return Array.from({ length: 12 }, (_, index) => items.find((item) => item.month === index + 1)?.medianTotalMm ?? null);
}

/** Descriptive (not agronomic) wording for the week's rain total. */
export function rainWeekLevel(totalMm: number): 'almost_none' | 'light' | 'moderate' | 'heavy' {
  return totalMm < 5 ? 'almost_none' : totalMm < 25 ? 'light' : totalMm < 60 ? 'moderate' : 'heavy';
}

export function rainWeekSentence(totalMm: number, locale: Locale): string {
  const mm = Math.round(totalMm);
  const pt = { almost_none: `A previsão é de quase nenhuma chuva nos próximos 7 dias (cerca de ${mm} mm).`, light: `A previsão é de pouca chuva nos próximos 7 dias, cerca de ${mm} mm.`, moderate: `A previsão é de uma semana com chuva, cerca de ${mm} mm.`, heavy: `A previsão é de bastante chuva nos próximos 7 dias, cerca de ${mm} mm.` };
  const en = { almost_none: `The forecast is almost no rain in the next 7 days (about ${mm} mm).`, light: `The forecast is light rain over the next 7 days, about ${mm} mm.`, moderate: `The forecast is a rainy week, about ${mm} mm.`, heavy: `The forecast is a lot of rain over the next 7 days, about ${mm} mm.` };
  return (locale === 'en' ? en : pt)[rainWeekLevel(totalMm)];
}

/** "2023-10" → "10/2023"-style period text for a history event, using the supplied formatter. */
export function periodText(start: string, end: string, format: (value: string) => string): string {
  return `${format(start)} → ${format(end)}`;
}
