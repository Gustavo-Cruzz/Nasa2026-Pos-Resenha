import { describe, expect, it } from 'vitest';
import { cropById, cropEvidence, verifiedCropEvidence } from '@/lib/catalog';

const peak = (id: string) => Math.max(...(cropById.get(id)?.kcStages ?? []).map((stage) => stage.kc));

describe('crop evidence: FAO-56 Kc, N fixation and disease notes', () => {
  it('projects FAO-56 Table 12 Kc, not the superseded SciELO field studies', () => {
    expect(peak('soybean')).toBe(1.15);
    expect(peak('maize')).toBe(1.2);
    expect(cropById.get('soybean')?.kcStages).toEqual([{ stage: 'initial', kc: 0.4, days: 15 }, { stage: 'mid', kc: 1.15, days: 40 }, { stage: 'end', kc: 0.5, days: 15 }]);
    expect(verifiedCropEvidence('soybean', 'kcStages')?.source.url).toBe('https://www.fao.org/4/X0490E/x0490e0b.htm');
    for (const id of ['soybean', 'maize', 'sorghum', 'sunflower', 'cowpea', 'common_bean']) {
      const superseded = cropEvidence.filter((record) => record.cropId === id && record.field === 'kcStages' && record.supersededBy);
      expect(superseded.length).toBeGreaterThan(0);
      expect(superseded.every((record) => !record.source.title.includes('FAO'))).toBe(true);
    }
  });

  it('merges documented nitrogen-fixation statements and nothing derived from family', () => {
    expect(cropById.get('soybean')?.nitrogenFixationPotential).toContain('todo o N');
    for (const id of ['soybean', 'common_bean', 'cowpea', 'sunn_hemp', 'pigeon_pea']) expect(cropById.get(id)?.nitrogenFixationPotential).not.toBeNull();
    expect(cropById.get('peanut')?.nitrogenFixationPotential).toBeNull();
  });

  it('wires verified cultivar disease profiles as cultivar-specific notes only', () => {
    expect(cropById.get('sorghum')?.diseaseNotes?.[0]).toMatch(/^BRS 310: .*cercosporiose.*cultivar/);
    expect(cropById.get('cowpea')?.diseaseNotes?.[0]).toMatch(/^BRS Guariba/);
    expect(cropById.get('sunflower')?.diseaseNotes).toBeUndefined();
  });

  it('keeps url, snippet and page on every verified record', () => {
    for (const record of cropEvidence.filter((item) => item.source.verification !== 'not_verified')) {
      expect(record.source.url, `${record.cropId}.${record.field}`).toBeTruthy();
      expect(record.source.snippet.length).toBeGreaterThan(0);
      expect(record.source.pageOrSection.length).toBeGreaterThan(0);
    }
  });
});
