import { cropEvidence, plantaeCycleEvidence, type CropEvidenceRecord } from '@/lib/catalog';

export type CatalogFieldCoverage = { field: string; status: 'verified' | 'unverified' | 'missing'; sources: Array<{ title: string; url: string | null; context: string; cultivar: string | null; verification: CropEvidenceRecord['source']['verification'] }> };
const coreFields = ['cycleDaysRange', 'idealTempC', 'viableTempC', 'soilPhRange', 'kcStages', 'residuePotential', 'nitrogenFixationPotential', 'rootingClass'] as const;

/** Evidence inventory, not a claim that a context-specific record applies to every farm or cultivar. */
export function catalogEvidenceInventory(cropId: string): CatalogFieldCoverage[] {
  const records = cropEvidence.filter((record) => record.cropId === cropId && !record.supersededBy);
  const fields = [...new Set([...coreFields, ...records.map((record) => record.field)])];
  return fields.map((field) => {
    const rows = records.filter((record) => record.field === field && record.value !== null);
    const contextual = field === 'cycleDaysRange' ? plantaeCycleEvidence.find((record) => record.cropId === cropId && record.value !== null) : undefined;
    const verified = Boolean(contextual) || rows.some((record) => record.source.verification !== 'not_verified');
    return { field, status: verified ? 'verified' as const : rows.length ? 'unverified' as const : 'missing' as const, sources: [...rows.map((record) => ({ title: record.source.title, url: record.source.url, context: record.context, cultivar: record.cultivar, verification: record.source.verification })), ...(contextual ? [{ title: contextual.source.title, url: contextual.source.url, context: contextual.context.cycleDefinition, cultivar: contextual.context.cultivar, verification: 'verified_source_text' as const }] : [])] };
  });
}
