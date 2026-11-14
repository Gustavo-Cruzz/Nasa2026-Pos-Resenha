import { z } from 'zod';
import intercropDocument from '@/FieldShift_AgriculturaFamiliar_Consorcios_2026/family-farm-intercrops.seed.json';
import { cropById, isPermanentCrop, type Crop } from '@/lib/catalog';

export const croppingSystemTypes = ['single', 'intercrop', 'succession', 'rotation'] as const;
export type CroppingSystemType = typeof croppingSystemTypes[number];

export const cropEventPeriodSchema = z.object({
  cropId: z.string().min(1).refine((cropId) => cropById.has(cropId), 'Cropping systems accept only catalogued crop IDs.'),
  startYearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  endYearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  purpose: z.enum(['grain', 'vegetable', 'cover', 'forage', 'orchard', 'other']).optional(),
}).refine((event) => event.startYearMonth <= event.endYearMonth, 'A crop event cannot end before it starts.');

export const croppingSystemSchema = z.object({
  plotId: z.string().min(1).max(80),
  type: z.enum(croppingSystemTypes),
  validation: z.enum(['documented_example', 'user_defined', 'context_verified']),
  events: z.array(cropEventPeriodSchema).min(1).max(3),
  sourceSystemId: z.string().min(1).optional(),
}).superRefine((system, context) => {
  if (new Set(system.events.map((event) => event.cropId)).size !== system.events.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['events'], message: 'A crop cannot be repeated inside one cropping system.' });
  if (system.type === 'single' && system.events.length !== 1) context.addIssue({ code: z.ZodIssueCode.custom, path: ['type'], message: 'A single system contains exactly one crop event.' });
  if (system.type !== 'single' && system.events.length < 2) context.addIssue({ code: z.ZodIssueCode.custom, path: ['type'], message: 'A composite cropping system needs two or more crop events.' });
  if (system.type === 'intercrop') {
    for (let i = 0; i < system.events.length; i += 1) for (let j = i + 1; j < system.events.length; j += 1) {
      if (system.events[i].endYearMonth < system.events[j].startYearMonth || system.events[j].endYearMonth < system.events[i].startYearMonth) context.addIssue({ code: z.ZodIssueCode.custom, path: ['events', j, 'startYearMonth'], message: 'Intercrop events must have overlapping periods.' });
    }
  }
  if (system.type === 'succession' || system.type === 'rotation') {
    system.events.slice(1).forEach((event, index) => {
      if (event.startYearMonth <= system.events[index].endYearMonth) context.addIssue({ code: z.ZodIssueCode.custom, path: ['events', index + 1, 'startYearMonth'], message: 'Succession and rotation events must be chronological and non-overlapping.' });
    });
  }
  if (system.validation === 'documented_example' && !system.sourceSystemId) context.addIssue({ code: z.ZodIssueCode.custom, message: 'A documented example requires its source system ID.' });
  if (system.validation !== 'documented_example' && system.sourceSystemId) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Only documented examples may claim a source system ID.' });
});
export type CroppingSystem = z.infer<typeof croppingSystemSchema>;

const sourceRefSchema = z.object({ institution: z.string(), title: z.string(), url: z.string().url(), section: z.string() });
const librarySchema = z.object({ version: z.number(), disclaimer: z.string(), systems: z.array(z.object({ id: z.string(), cropIds: z.array(z.string()).min(2).max(3), labelPtBR: z.string(), systemType: z.literal('intercropping'), referenceContext: z.string(), arrangement: z.string().nullable(), startOffsetDays: z.number().nullable(), method: z.string(), potentialBenefits: z.array(z.string()), risks: z.array(z.string()), constraints: z.string(), sourceRefs: z.array(sourceRefSchema).min(1), validation: z.literal('documented_example_not_local_recommendation'), modelEligibility: z.literal('exploratory'), siteType: z.string() })) });
export type IntercropExample = z.infer<typeof librarySchema>['systems'][number];
export const intercropLibrary = librarySchema.parse(intercropDocument);

function sameCropSet(left: string[], right: string[]): boolean { return [...left].sort().join('|') === [...right].sort().join('|'); }
export function documentedIntercrop(system: CroppingSystem): IntercropExample | undefined {
  if (system.type !== 'intercrop' || system.validation !== 'documented_example' || !system.sourceSystemId) return undefined;
  return intercropLibrary.systems.find((example) => example.id === system.sourceSystemId && sameCropSet(example.cropIds, system.events.map((event) => event.cropId)));
}

export function cropsInSystem(system: CroppingSystem): Crop[] { return system.events.map((event) => cropById.get(event.cropId)).filter((crop): crop is Crop => Boolean(crop)); }

export function summarizeCroppingSystem(system: CroppingSystem, proposedCropId?: string) {
  const crops = cropsInSystem(system);
  const example = documentedIntercrop(system);
  const appliesToStrategy = Boolean(proposedCropId && system.events.some((event) => event.cropId === proposedCropId));
  return {
    cropIds: system.events.map((event) => event.cropId),
    periods: system.events.map((event) => ({ ...event })),
    speciesCount: new Set(crops.map((crop) => crop.id)).size,
    familyCount: new Set(crops.map((crop) => crop.family)).size,
    hasPermanentCrop: crops.some((crop) => isPermanentCrop(crop.id)),
    documentedExample: Boolean(example),
    appliesToStrategy,
    sourceRefs: example?.sourceRefs.map((source) => source.url) ?? [],
    risks: example?.risks ?? (system.type === 'intercrop' ? ['Consórcio definido pelo produtor; competição por água, luz e nutrientes permanece desconhecida sem evidência compatível.'] : []),
    limitations: example ? [example.constraints, 'Exemplo documentado exploratório; não é recomendação regional automática.'] : ['Sistema definido pelo produtor; não presume benefício, produtividade, cobertura ou menor demanda hídrica.'],
  };
}
