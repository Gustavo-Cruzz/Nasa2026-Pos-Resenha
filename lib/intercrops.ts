import { z } from 'zod';
import intercropDocument from '@/FieldShift_AgriculturaFamiliar_Consorcios_2026/family-farm-intercrops.seed.json';
import { cropById, isPermanentCrop } from '@/lib/catalog';

export const cropEventPeriodSchema = z.object({ cropId: z.string().min(1), startYearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), endYearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), purpose: z.enum(['grain', 'vegetable', 'cover', 'forage', 'orchard', 'other']).optional() }).refine((event) => event.startYearMonth <= event.endYearMonth, 'A crop event cannot end before it starts.');
export const croppingSystemSchema = z.object({ plotId: z.string().min(1).max(80), type: z.enum(['single', 'intercrop']), validation: z.enum(['documented_example', 'user_defined', 'context_verified']), events: z.array(cropEventPeriodSchema).min(1).max(3), sourceSystemId: z.string().min(1).optional() }).superRefine((system, context) => {
  if (new Set(system.events.map((event) => event.cropId)).size !== system.events.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'A crop cannot be repeated inside one cropping system.' });
  if (system.type === 'single' && system.events.length !== 1) context.addIssue({ code: z.ZodIssueCode.custom, message: 'A single system contains exactly one crop event.' });
  if (system.type === 'intercrop' && system.events.length < 2) context.addIssue({ code: z.ZodIssueCode.custom, message: 'An intercrop needs two or more crop events.' });
  if (system.type === 'intercrop') for (let i = 0; i < system.events.length; i += 1) for (let j = i + 1; j < system.events.length; j += 1) if (system.events[i].endYearMonth < system.events[j].startYearMonth || system.events[j].endYearMonth < system.events[i].startYearMonth) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Intercrop events must have overlapping periods.' });
});
export type CroppingSystem = z.infer<typeof croppingSystemSchema>;

const sourceRefSchema = z.object({ institution: z.string(), title: z.string(), url: z.string().url(), section: z.string() });
const librarySchema = z.object({ version: z.number(), disclaimer: z.string(), systems: z.array(z.object({ id: z.string(), cropIds: z.array(z.string()).min(2).max(3), labelPtBR: z.string(), systemType: z.literal('intercropping'), referenceContext: z.string(), arrangement: z.string().nullable(), startOffsetDays: z.number().nullable(), method: z.string(), potentialBenefits: z.array(z.string()), risks: z.array(z.string()), constraints: z.string(), sourceRefs: z.array(sourceRefSchema).min(1), validation: z.literal('documented_example_not_local_recommendation'), modelEligibility: z.literal('exploratory'), siteType: z.string() })) });
export type IntercropExample = z.infer<typeof librarySchema>['systems'][number];
export const intercropLibrary = librarySchema.parse(intercropDocument);

export function documentedIntercrop(cropIds: string[]): IntercropExample | undefined { const normalized = [...cropIds].sort().join('|'); return intercropLibrary.systems.find((system) => [...system.cropIds].sort().join('|') === normalized); }
export function summarizeCroppingSystem(system: CroppingSystem) {
  const crops = system.events.flatMap((event) => cropById.get(event.cropId) ? [cropById.get(event.cropId)!] : []);
  const example = documentedIntercrop(system.events.map((event) => event.cropId));
  return { speciesCount: new Set(crops.map((crop) => crop.id)).size, familyCount: new Set(crops.map((crop) => crop.family)).size, hasPermanentCrop: crops.some((crop) => isPermanentCrop(crop.id)), documentedExample: Boolean(example), sourceRefs: example?.sourceRefs.map((source) => source.url) ?? [], risks: example?.risks ?? ['Consórcio definido pelo produtor; competição por água, luz e nutrientes permanece desconhecida sem evidência compatível.'], limitations: example ? [example.constraints, 'Exemplo documentado exploratório; não é recomendação regional automática.'] : ['Sistema definido pelo produtor; não presume benefício, produtividade, cobertura ou menor demanda hídrica.'] };
}
