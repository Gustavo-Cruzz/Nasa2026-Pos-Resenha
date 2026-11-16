import municipalitiesData from '@/data/brazil-municipalities.json';
import { contains, type Geometry, type Position } from '@/lib/brazil/context';
import { representativePoint as interiorRepresentativePoint } from '@/lib/brazil/interior-point';

type Record_ = { [code: string]: Position };
type Record = { code: string; name: string; uf: string; bbox: [number, number, number, number]; geometry: Geometry };
const records = (municipalitiesData as unknown as { municipalities: Record[] }).municipalities;

export type PlaceMatch = { code: string; name: string; uf: string; latitude: number; longitude: number };

/** Accent-free, lowercase, apostrophes and hyphens as spaces: "Alta Floresta D'Oeste" and "alta floresta d oeste" match. */
export function normalizeName(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’`´-]/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

const STATES: Array<[string, string]> = [['ac', 'acre'], ['al', 'alagoas'], ['ap', 'amapa'], ['am', 'amazonas'], ['ba', 'bahia'], ['ce', 'ceara'], ['df', 'distrito federal'], ['es', 'espirito santo'], ['go', 'goias'], ['ma', 'maranhao'], ['mt', 'mato grosso'], ['ms', 'mato grosso do sul'], ['mg', 'minas gerais'], ['pa', 'para'], ['pb', 'paraiba'], ['pr', 'parana'], ['pe', 'pernambuco'], ['pi', 'piaui'], ['rj', 'rio de janeiro'], ['rn', 'rio grande do norte'], ['rs', 'rio grande do sul'], ['ro', 'rondonia'], ['rr', 'roraima'], ['sc', 'santa catarina'], ['sp', 'sao paulo'], ['se', 'sergipe'], ['to', 'tocantins']];
const NAME_TO_UF = new Map(STATES.map(([uf, name]) => [name, uf.toUpperCase()]));
const UF_CODES = new Set(STATES.map(([uf]) => uf));

/** "Rio Verde, GO", "rio verde - goiás", "Rio Verde (GO)", "Rio Verde GO" or just "Rio Verde" → city and optional UF. */
export function parsePlaceQuery(text: string): { name: string; uf?: string } {
  const normalized = normalizeName(text);
  // Longest state name first so "mato grosso do sul" is not read as "mato grosso" + "do sul".
  for (const [name, uf] of [...NAME_TO_UF.entries()].sort((a, b) => b[0].length - a[0].length)) {
    if (normalized === name) break; // the whole text is a state name: treat it as a city name
    if (normalized.endsWith(` ${name}`)) return { name: normalized.slice(0, -name.length - 1).trim(), uf };
  }
  const last = normalized.split(' ').at(-1) ?? '';
  const rest = normalized.slice(0, -last.length).trim();
  if (rest && UF_CODES.has(last)) return { name: rest, uf: last.toUpperCase() };
  return { name: normalized };
}

/** The verified pilot point (Rio Verde, GO) carries NASA POWER and MODIS NDVI fixtures, so that exact point is used for this municipality. */
const PILOT_POINT: Record_ = { '5218805': [-50.919, -17.798] };

const indexed = records.map((record) => ({ record, key: normalizeName(record.name) }));

export const representativePoint = interiorRepresentativePoint;

/** Municipalities matching "city" or "city, state": exact name first, then names that start with or contain the text. At most `limit`. */
export function searchMunicipalities(query: string, limit = 6): PlaceMatch[] {
  const parsed = parsePlaceQuery(query);
  const whole = normalizeName(query);
  // "Rio Verde de Mato Grosso" ends with a state name but is a city: when the split finds nothing, try the whole text as the city name.
  const attempts: Array<{ name: string; uf?: string; ufPrefix?: string }> = [parsed, ...(parsed.uf && whole !== parsed.name ? [{ name: whole }] : [])];
  // Typing in progress ("rio verde g", "rio verde goi"): the last word may be the beginning of a state.
  const words = whole.split(' ');
  const tail = words.at(-1) ?? '';
  if (!parsed.uf && words.length > 1 && tail.length >= 1) { const ufs = partialStates(tail); if (ufs.length) attempts.push({ name: words.slice(0, -1).join(' '), ufPrefix: tail }); }
  for (const attempt of attempts) { const found = lookup(attempt.name, attempt.uf, limit, attempt.ufPrefix); if (found.length) return found; }
  return [];
}

/** UF codes whose code (1-2 letters) or state name starts with the typed text. */
function partialStates(token: string): string[] {
  return STATES.filter(([uf, name]) => (token.length <= 2 && uf.startsWith(token)) || (token.length >= 2 && name.startsWith(token))).map(([uf]) => uf.toUpperCase());
}

function lookup(name: string, uf: string | undefined, limit: number, ufPrefix?: string): PlaceMatch[] {
  if (name.length < 2) return [];
  const allowed = ufPrefix ? new Set(partialStates(ufPrefix)) : undefined;
  const pool = uf ? indexed.filter((item) => item.record.uf === uf) : allowed ? indexed.filter((item) => allowed.has(item.record.uf)) : indexed;
  const exact = pool.filter((item) => item.key === name);
  const found = exact.length ? exact : (() => { const starts = pool.filter((item) => item.key.startsWith(name)); return starts.length ? starts : pool.filter((item) => name.split(' ').every((word) => item.key.split(' ').includes(word))); })();
  return found.sort((a, b) => a.key.length - b.key.length || a.key.localeCompare(b.key)).slice(0, limit).flatMap(({ record }) => {
    const pilot = PILOT_POINT[record.code];
    const point = pilot && contains(pilot, record.geometry) ? pilot : representativePoint(record.geometry);
    return point ? [{ code: record.code, name: record.name, uf: record.uf, latitude: point[1], longitude: point[0] }] : [];
  });
}

/** The municipality that contains a point (bounding box first, then exact polygon test); undefined outside the IBGE mesh. */
export function municipalityAt(latitude: number, longitude: number): { code: string; name: string; uf: string } | undefined {
  const point: Position = [longitude, latitude];
  const record = records.find((item) => longitude >= item.bbox[0] && latitude >= item.bbox[1] && longitude <= item.bbox[2] && latitude <= item.bbox[3] && contains(point, item.geometry));
  return record ? { code: record.code, name: record.name, uf: record.uf } : undefined;
}
