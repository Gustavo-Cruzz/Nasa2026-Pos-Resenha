type Locale = 'pt-BR' | 'en';

const FAMILIES: Record<string, { 'pt-BR': string; en: string }> = {
  Fabaceae: { 'pt-BR': 'Leguminosa', en: 'Legume' },
  Poaceae: { 'pt-BR': 'Gramínea', en: 'Grass' },
};

/** A botanical family in plain words: legumes and grasses get their everyday name, any other family keeps its own. */
export function familyLabel(family: string | undefined, locale: Locale): string {
  if (!family) return locale === 'en' ? 'Unknown family' : 'Família desconhecida';
  return FAMILIES[family]?.[locale] ?? family;
}

/**
 * What the crop history says about rotation, from the botanical families in order:
 * `alternates` when every consecutive pair differs, `repeats` when two in a row share a family,
 * `unknown` when fewer than two families are known. It describes the history; it does not say what to plant.
 */
export function rotationRead(families: Array<string | undefined>): 'alternates' | 'repeats' | 'unknown' {
  const known = families.filter((family): family is string => Boolean(family));
  if (known.length < 2) return 'unknown';
  return known.some((family, index) => index > 0 && family === known[index - 1]) ? 'repeats' : 'alternates';
}

const MONTHS = {
  'pt-BR': ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
} as const;

/** "2023-10" as "out/2023" (or "Oct 2023"). Anything that is not a year-month is returned as it came. */
export function formatYearMonth(value: string, locale: Locale): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!match) return value;
  const month = MONTHS[locale][Number(match[2]) - 1];
  return locale === 'en' ? `${month} ${match[1]}` : `${month}/${match[1]}`;
}
