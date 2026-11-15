import { describe, expect, it } from 'vitest';
import { cropById, cropEvidence, verifiedCropEvidence } from '@/lib/catalog';

const hasSource = (cropId: string, field: string) => {
  const record = verifiedCropEvidence(cropId, field);
  expect(record, `${cropId}.${field}`).toBeDefined();
  expect(record?.source.url).toMatch(/^https:\/\//);
  expect(record?.source.snippet.length).toBeGreaterThan(0);
  expect(record?.source.pageOrSection.length).toBeGreaterThan(0);
};

describe('crop evidence: residue (P3), cycle and ECOCROP ranges (P4)', () => {
  it('projects residuePotential only for alta/média classes, keeps baixa as provenance', () => {
    for (const id of ['maize', 'upland_rice', 'pearl_millet', 'pigeon_pea', 'ruziziensis', 'sorghum']) {
      hasSource(id, 'residuePotential');
      expect(cropById.get(id)?.residuePotential, id).toMatch(/^(alta|média)/);
    }
    for (const id of ['soybean', 'sunn_hemp']) {
      hasSource(id, 'residuePotential');
      expect(cropById.get(id)?.residuePotential, id).toBeNull();
    }
    for (const id of ['sunflower', 'cowpea', 'common_bean']) {
      expect(cropById.get(id)?.residuePotential, id).toBeNull();
      expect(verifiedCropEvidence(id, 'residuePotential')).toBeUndefined();
    }
  });

  it('fills cowpea cycle from Embrapa Sistema de Produção and common bean viable temperature from FAO ECOCROP', () => {
    hasSource('cowpea', 'cycleDaysRange');
    expect(cropById.get('cowpea')?.cycleDaysRange).toEqual({ min: 60, max: 90 });
    hasSource('common_bean', 'viableTempC');
    expect(cropById.get('common_bean')?.viableTempC).toEqual({ min: 7, max: 32 });
    expect(verifiedCropEvidence('common_bean', 'viableTempC')?.source.url).toContain('ecocrop.apps.fao.org');
  });

  it('does not derive cycles from FAO-56 or ECOCROP, and leaves unsourced fields null', () => {
    expect(cropEvidence.filter((r) => r.field === 'cycleDaysRange' && !r.supersededBy && r.source.url?.includes('ecocrop'))).toHaveLength(0);
    expect(cropById.get('upland_rice')?.kcStages).toBeNull();
  });

  it('fills thermal/pH ranges with ECOCROP and keeps ranges ordered', () => {
    for (const [id, field] of [['upland_rice', 'viableTempC'], ['upland_rice', 'soilPhRange'], ['maize', 'soilPhRange'], ['cowpea', 'soilPhRange'], ['pearl_millet', 'viableTempC'], ['pearl_millet', 'soilPhRange'], ['ruziziensis', 'viableTempC'], ['ruziziensis', 'soilPhRange'], ['sunn_hemp', 'viableTempC'], ['pigeon_pea', 'soilPhRange']] as const) {
      hasSource(id, field);
      const range = cropById.get(id)?.[field];
      expect(range, `${id}.${field}`).not.toBeNull();
      expect(range!.min).toBeLessThan(range!.max);
    }
  });

  it('fills Brazilian cycles (ZARC MAPA and Embrapa) with literal snippets, keeps open-ended groups out of the projection', () => {
    const expected: Record<string, { min: number; max: number }> = {
      soybean: { min: 100, max: 130 }, sunflower: { min: 100, max: 120 }, common_bean: { min: 70, max: 80 }, upland_rice: { min: 89, max: 115 },
      pearl_millet: { min: 76, max: 100 }, cotton: { min: 100, max: 180 }, pigeon_pea: { min: 173, max: 180 },
    };
    for (const [id, range] of Object.entries(expected)) {
      expect(cropById.get(id)?.cycleDaysRange, id).toEqual(range);
      const record = cropEvidence.find((r) => r.cropId === id && r.field === 'cycleDaysRange' && JSON.stringify(r.value) === JSON.stringify(range))!;
      expect(record.source.url).toMatch(/^https:\/\/(www\.gov\.br|www\.infoteca|www\.alice)/);
      expect(record.source.snippet.length).toBeGreaterThan(20);
      expect(record.source.pageOrSection.length).toBeGreaterThan(0);
      expect(record.source.accessedAt).toBe('2026-11-15');
      expect(record.context.length).toBeGreaterThan(20);
    }
    // ZARC groups with open bounds are provenance only; sorghum has no bounded cycle, ruziziensis is perennial.
    for (const id of ['sorghum', 'upland_rice', 'pearl_millet', 'cotton']) {
      const groups = cropEvidence.find((r) => r.cropId === id && r.field === 'cycleDaysRange' && typeof r.value === 'object' && r.value !== null && 'groups' in r.value);
      expect(groups?.source.url, id).toContain('gov.br/agricultura');
    }
    expect(cropById.get('sorghum')?.cycleDaysRange).toBeNull();
    expect(cropById.get('ruziziensis')?.cycleDaysRange).toBeNull();
    expect(cropEvidence.filter((r) => r.field === 'cycleDaysRange' && !r.supersededBy && /fao\.org/.test(r.source.url ?? ""))).toHaveLength(0);
  });
});
