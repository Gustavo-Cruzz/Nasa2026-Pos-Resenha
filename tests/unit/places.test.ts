import { describe, expect, it } from 'vitest';
import { parsePlaceQuery, representativePoint, searchMunicipalities } from '@/lib/brazil/places';
import { resolveBrazilMunicipality } from '@/lib/brazil/context';
import municipalitiesData from '@/data/brazil-municipalities.json';

describe('place query parsing', () => {
  it('splits city and state in the usual ways', () => {
    expect(parsePlaceQuery('Rio Verde, GO')).toEqual({ name: 'rio verde', uf: 'GO' });
    expect(parsePlaceQuery('rio verde - goiás')).toEqual({ name: 'rio verde', uf: 'GO' });
    expect(parsePlaceQuery('Rio Verde (GO)')).toEqual({ name: 'rio verde', uf: 'GO' });
    expect(parsePlaceQuery('Rio Verde GO')).toEqual({ name: 'rio verde', uf: 'GO' });
    expect(parsePlaceQuery('Campo Grande, Mato Grosso do Sul')).toEqual({ name: 'campo grande', uf: 'MS' });
    expect(parsePlaceQuery('Sinop mato grosso')).toEqual({ name: 'sinop', uf: 'MT' });
    expect(parsePlaceQuery("Alta Floresta D'Oeste")).toEqual({ name: 'alta floresta d oeste' });
    expect(parsePlaceQuery('Rio Verde')).toEqual({ name: 'rio verde' });
    expect(parsePlaceQuery('Goiás')).toEqual({ name: 'goias' });
  });
});

describe('municipality search over the IBGE mesh', () => {
  it('finds a city with its state and returns a point inside it', () => {
    const [match, ...others] = searchMunicipalities('Rio Verde, GO');
    expect(others).toEqual([]);
    expect(match).toMatchObject({ name: 'Rio Verde', uf: 'GO', code: '5218805' });
    expect(resolveBrazilMunicipality({ latitude: match.latitude, longitude: match.longitude })?.code).toBe('5218805');
  });
  it('is insensitive to accents, case and apostrophes', () => {
    expect(searchMunicipalities('sao paulo sp')[0]).toMatchObject({ name: 'São Paulo', uf: 'SP' });
    expect(searchMunicipalities("ALTA FLORESTA D'OESTE")[0]).toMatchObject({ uf: 'RO', code: '1100015' });
    expect(searchMunicipalities('alta floresta d oeste')[0]).toMatchObject({ uf: 'RO' });
  });
  it('lists every state when the name is ambiguous, and narrows with the state', () => {
    const many = searchMunicipalities('Bom Jesus');
    expect(many.length).toBeGreaterThan(1);
    expect(new Set(many.map((item) => item.uf)).size).toBeGreaterThan(1);
    const narrowed = searchMunicipalities('Bom Jesus, PI');
    expect(narrowed.length).toBeGreaterThanOrEqual(1);
    expect(narrowed.every((item) => item.uf === 'PI')).toBe(true);
  });
  it('falls back to names that start with the text, and returns nothing for nonsense', () => {
    expect(searchMunicipalities('rio verd GO').some((item) => item.name === 'Rio Verde')).toBe(true);
    expect(searchMunicipalities('qqqqzzzz')).toEqual([]);
    expect(searchMunicipalities('a')).toEqual([]);
    expect(searchMunicipalities('Rio Verde, SP')).not.toContainEqual(expect.objectContaining({ uf: 'GO' }));
  });
  it('always returns a point that belongs to the municipality it names (sample of the whole mesh)', () => {
    const all = (municipalitiesData as unknown as { municipalities: Array<{ code: string; name: string; uf: string; geometry: Parameters<typeof representativePoint>[0] }> }).municipalities;
    const sample = all.filter((_, index) => index % 23 === 0);
    expect(sample.length).toBeGreaterThan(200);
    for (const item of sample) {
      const point = representativePoint(item.geometry);
      expect(point, item.name).toBeDefined();
      expect(resolveBrazilMunicipality({ latitude: point![1], longitude: point![0] })?.code, `${item.name}/${item.uf}`).toBe(item.code);
    }
  });
});

describe('pilot point', () => {
  it('Rio Verde (GO) resolves to the verified pilot point that carries the NASA fixtures', () => {
    expect(searchMunicipalities('Rio Verde, GO')[0]).toMatchObject({ latitude: -17.798, longitude: -50.919 });
    expect(searchMunicipalities('Rio Verde de Mato Grosso')[0]).toMatchObject({ uf: 'MS' });
    expect(searchMunicipalities('Rio Verde de Mato Grosso')[0].latitude).not.toBe(-17.798);
  });
});

describe('suggestions while typing', () => {
  it('suggests by the beginning of the name and respects the limit', () => {
    const rio = searchMunicipalities('rio ver', 8);
    expect(rio.length).toBeGreaterThan(1);
    expect(rio.every((item) => item.name.toLowerCase().startsWith('rio ver'))).toBe(true);
    expect(rio.length).toBeLessThanOrEqual(8);
    expect(searchMunicipalities('sorri', 3)[0]).toMatchObject({ name: 'Sorriso', uf: 'MT' });
    expect(searchMunicipalities('cascav', 2).length).toBeLessThanOrEqual(2);
  });
  it('narrows as the state is typed letter by letter', () => {
    expect(searchMunicipalities('rio verde g').every((item) => item.uf.startsWith('G') || item.uf === 'GO')).toBe(true);
    expect(searchMunicipalities('rio verde g')[0]).toMatchObject({ name: 'Rio Verde', uf: 'GO' });
    expect(searchMunicipalities('rio verde goi')[0]).toMatchObject({ name: 'Rio Verde', uf: 'GO' });
    expect(searchMunicipalities('rio verde go')[0]).toMatchObject({ uf: 'GO' });
    expect(searchMunicipalities('rio verde mato')[0]).toMatchObject({ uf: 'MS' });
  });
  it('shows nothing for a single letter or for nonsense', () => {
    expect(searchMunicipalities('r')).toEqual([]);
    expect(searchMunicipalities('zzzzqq')).toEqual([]);
  });
});
