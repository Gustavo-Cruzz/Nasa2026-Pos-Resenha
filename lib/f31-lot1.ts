import { z } from 'zod';
import document from '@/data/plantae_F31_lote1_fbn_palhada_28_culturas_2026-11-18.json';
import crops from '@/data/crops.json';
import familyCrops from '@/FieldShift_AgriculturaFamiliar_Consorcios_2026/family-farm-crops.seed.json';

const nullableText = z.string().nullable();
const sourceSchema = z.object({ title: nullableText, institution: nullableText, url: z.string().url().refine((url) => /^https?:$/.test(new URL(url).protocol)).nullable(), locator: nullableText, excerpt: nullableText, accessedAt: z.string().date().nullable() }).strict();
const recordSchema = z.object({ cropId: z.string().min(1), field: z.enum(['nitrogenFixationPotential', 'residuePotential']), value: nullableText, unit: nullableText, evidenceType: z.enum(['qualitative_potential', 'qualitative_residue_behavior']), context: z.object({ species: nullableText, cultivar: nullableText, location: nullableText, productionSystem: nullableText, management: nullableText }).strict(), source: sourceSchema, status: z.enum(['source_found', 'insufficient_source', 'not_applicable']), reviewStatus: z.literal('pending'), limitations: z.array(z.string()), conflicts: z.array(z.string()) }).strict().superRefine((item, ctx) => {
  if (item.status === 'source_found' && (!item.value || !item.source.title || !item.source.url || !item.source.locator || !item.source.accessedAt)) ctx.addIssue({ code: 'custom', message: 'A sourced record needs a value, title, URL, locator and access date.' });
  if (item.status !== 'source_found' && item.value !== null) ctx.addIssue({ code: 'custom', message: 'Insufficient or inapplicable evidence must remain null.' });
});
export const f31Lot1Schema = z.object({ researchDate: z.string().date(), datasetReference: z.string().min(1), batch: z.literal('F31-1'), scope: z.string().min(1), records: z.array(recordSchema).length(56) }).strict().superRefine((data, ctx) => {
  const ids = new Set([...crops, ...familyCrops].map((crop) => crop.id));
  const keys = data.records.map((item) => `${item.cropId}:${item.field}`);
  if (new Set(keys).size !== 56 || data.records.some((item) => !ids.has(item.cropId)) || ids.size !== 28) ctx.addIssue({ code: 'custom', message: 'Expected both fields for each of 28 distinct catalog crops.' });
});
export const f31Lot1 = f31Lot1Schema.parse(document);
