import { describe, expect, it } from 'vitest';
import { catalogEvidenceInventory } from '@/lib/catalog-coverage';

describe('catalog evidence inventory', () => {
  it('keeps absent parameters distinct from contextual sourced evidence', () => {
    const watermelon = catalogEvidenceInventory('watermelon');
    expect(watermelon.find((item) => item.field === 'cycleDaysRange')?.status).toBe('verified');
    expect(watermelon.some((item) => item.status === 'verified')).toBe(true);
    expect(watermelon.flatMap((item) => item.sources).every((source) => source.context.length > 0 && source.title.length > 0)).toBe(true);
  });
});
