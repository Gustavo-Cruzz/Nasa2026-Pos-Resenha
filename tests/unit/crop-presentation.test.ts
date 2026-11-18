import { describe, expect, it } from 'vitest';
import { catalogCropIdForName, cropDisplayName } from '@/lib/presentation';

describe('crop display names', () => {
  it('uses the selected language for catalog crops and stored labels', () => {
    expect(cropDisplayName('watermelon', 'Watermelon', 'pt-BR')).toBe('melancia');
    expect(cropDisplayName(null, 'Watermelon', 'pt-BR')).toBe('melancia');
    expect(cropDisplayName(null, 'Melancia', 'en')).toBe('watermelon');
    expect(cropDisplayName(null, 'minha variedade', 'en')).toBe('minha variedade');
    expect(catalogCropIdForName('  FEIJÃO-de-CORDA  ')).toBe('cowpea');
    expect(cropDisplayName(null, 'feijão-de-corda', 'en')).toBe('cowpea');
    expect(catalogCropIdForName('minha variedade')).toBeNull();
  });
});
