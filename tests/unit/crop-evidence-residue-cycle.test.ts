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
    expect(cropById.get('pigeon_pea')?.cycleDaysRange).toBeNull();
    expect(cropById.get('upland_rice')?.kcStages).toBeNull();
    expect(cropById.get('upland_rice')?.cycleDaysRange).toBeNull();
  });

  it('fills thermal/pH ranges with ECOCROP and keeps ranges ordered', () => {
    for (const [id, field] of [['upland_rice', 'viableTempC'], ['upland_rice', 'soilPhRange'], ['maize', 'soilPhRange'], ['cowpea', 'soilPhRange'], ['pearl_millet', 'viableTempC'], ['pearl_millet', 'soilPhRange'], ['ruziziensis', 'viableTempC'], ['ruziziensis', 'soilPhRange'], ['sunn_hemp', 'viableTempC'], ['pigeon_pea', 'soilPhRange']] as const) {
      hasSource(id, field);
      const range = cropById.get(id)?.[field];
      expect(range, `${id}.${field}`).not.toBeNull();
      expect(range!.min).toBeLessThan(range!.max);
    }
  });
});
