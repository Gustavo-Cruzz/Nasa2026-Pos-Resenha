export const RONI_URL = 'https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt';
export const RONI_PAGE_URL = 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php';

export type EnsoPhase = 'el_nino' | 'la_nina' | 'neutral';
export type EnsoStrength = 'weak' | 'moderate' | 'strong' | 'very_strong' | null;
export type EnsoReading = { season: string; year: number; value: number };
export type EnsoState = {
  index: 'RONI';
  latest: EnsoReading;
  /** Up to the three seasons before the latest, oldest first, so the direction of change is visible. */
  previous: EnsoReading[];
  phase: EnsoPhase;
  strength: EnsoStrength;
  sourceUrl: string;
};

const SEASONS = ['DJF', 'JFM', 'FMA', 'MAM', 'AMJ', 'MJJ', 'JJA', 'JAS', 'ASO', 'SON', 'OND', 'NDJ'];
const LINE = /^\s*([A-Z]{3})\s+(\d{4})\s+(-?\d+(?:\.\d+)?)\s*$/;

/** Parses NOAA CPC's plain-text index table ("SEAS YEAR value"). Lines that do not match are ignored; values are never invented. */
export function parseRoni(text: string): EnsoReading[] {
  return text.split(/\r?\n/).flatMap((line) => {
    const match = LINE.exec(line);
    if (!match || !SEASONS.includes(match[1])) return [];
    const value = Number(match[3]);
    return Number.isFinite(value) && Math.abs(value) < 10 ? [{ season: match[1], year: Number(match[2]), value }] : [];
  });
}

/** NOAA's usual reading of the index: ±0.5 °C or more is El Niño / La Niña, with strength bands at 1.0, 1.5 and 2.0. */
export function classifyEnso(value: number): { phase: EnsoPhase; strength: EnsoStrength } {
  const size = Math.abs(value);
  if (size < 0.5) return { phase: 'neutral', strength: null };
  const strength: EnsoStrength = size >= 2 ? 'very_strong' : size >= 1.5 ? 'strong' : size >= 1 ? 'moderate' : 'weak';
  return { phase: value > 0 ? 'el_nino' : 'la_nina', strength };
}

export function ensoStateFromReadings(readings: EnsoReading[], sourceUrl: string = RONI_URL): EnsoState | null {
  if (!readings.length) return null;
  const latest = readings[readings.length - 1];
  return { index: 'RONI', latest, previous: readings.slice(-4, -1), ...classifyEnso(latest.value), sourceUrl };
}

export async function fetchEnsoState(fetcher: typeof fetch = fetch): Promise<EnsoState | null> {
  const response = await fetcher(RONI_URL, { signal: AbortSignal.timeout(8_000), next: { revalidate: 86_400 } });
  if (!response.ok) throw new Error(`NOAA CPC returned HTTP ${response.status}.`);
  return ensoStateFromReadings(parseRoni(await response.text()));
}

/** First and last calendar month (1–12) of an overlapping NOAA season such as "ASO" (Aug–Oct). DJF starts in December. */
export function seasonMonths(season: string): [number, number] | null {
  const index = SEASONS.indexOf(season);
  if (index < 0) return null;
  const start = ((index + 11) % 12) + 1;
  return [start, ((start + 1) % 12) + 1];
}
