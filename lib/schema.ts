import { z } from 'zod';

export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const polygonPositionSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
export const fieldBoundarySchema = z.array(polygonPositionSchema).min(3).max(64);

export const yearMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM.');

export const soilProfileSchema = z.object({
  ph: z.number().min(0).max(14).optional(),
  phMethod: z.string().trim().min(1).max(80).optional(),
  sandPct: z.number().min(0).max(100).optional(),
  siltPct: z.number().min(0).max(100).optional(),
  clayPct: z.number().min(0).max(100).optional(),
  organicCarbonGKg: z.number().min(0).optional(),
  organicMatterGKg: z.number().min(0).optional(),
  phosphorusMgDm3: z.number().min(0).optional(),
  potassiumMgDm3: z.number().min(0).optional(),
  drainagePerception: z.enum(['good', 'limited', 'unknown']).optional(),
  depthCm: z.number().positive().optional(),
  observedAt: z.string().date().optional(),
  origin: z.enum(['farmer_lab', 'regional_estimate', 'unknown']),
  sourceRef: z.string().url().optional(),
}).superRefine((soil, context) => {
  const texture = [soil.sandPct, soil.siltPct, soil.clayPct];
  if (texture.some((value) => value !== undefined) && texture.some((value) => value === undefined)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Texture must include sand, silt, and clay together.' });
  }
});

/** Farmer-declared operational context. It filters exploration; it is not agronomic evidence. */
export const farmerCropProfileSchema = z.object({
  availableCropIds: z.array(z.string().min(1)).max(12).default([]),
  exploreCropIds: z.array(z.string().min(1)).max(12).default([]),
  blockedCropIds: z.array(z.string().min(1)).max(12).default([]),
  customCrops: z.array(z.object({ label: z.string().trim().min(1).max(80), purpose: z.enum(['grain', 'cover', 'forage', 'other']) })).max(10).default([]),
}).superRefine((profile, context) => {
  const usable = new Set([...profile.availableCropIds, ...profile.exploreCropIds]);
  profile.blockedCropIds.forEach((cropId, index) => { if (usable.has(cropId)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['blockedCropIds', index], message: 'A crop cannot be both available and blocked.' }); });
});

export const cropEventSchema = z.object({
  cropId: z.string().min(1).optional(),
  otherLabel: z.string().min(1).optional(),
  startYearMonth: yearMonthSchema,
  endYearMonth: yearMonthSchema,
}).refine((event) => Boolean(event.cropId) !== Boolean(event.otherLabel), 'Select a catalog crop or describe another crop.')
  .refine((event) => event.startYearMonth <= event.endYearMonth, 'A crop event cannot end before it starts.');

export const prioritiesSchema = z.object({
  water: z.number().min(0),
  soil: z.number().min(0),
  operations: z.number().min(0),
}).refine((weights) => weights.water + weights.soil + weights.operations > 0, 'At least one priority is required.');

/** Intentional next crop; dates are deliberately absent until a verified cycle exists. */
export const futureBaselineSchema = z.object({
  cropId: z.string().min(1).optional(),
  otherLabel: z.string().min(1).optional(),
  confirmed: z.literal(true),
}).refine((baseline) => Boolean(baseline.cropId) !== Boolean(baseline.otherLabel), 'Select a catalog crop or describe another baseline crop.');

/** Water source as declared by the producer. It is context only: no flow, autonomy or irrigation is derived from it. */
export const waterPointKinds = ['well', 'river', 'reservoir', 'other'] as const;
export const waterPointSchema = z.object({ kind: z.enum(waterPointKinds), label: z.string().trim().max(80).optional() });

export const analysisInputSchema = z.object({
  location: coordinatesSchema,
  fieldBoundary: fieldBoundarySchema.optional(),
  waterPoint: waterPointSchema.optional(),
  farmerCrops: farmerCropProfileSchema.optional(),
  plantingMonth: z.number().int().min(1).max(12),
  history: z.array(cropEventSchema).min(1).max(3),
  futureBaseline: futureBaselineSchema.optional(),
  soil: soilProfileSchema.optional(),
  priorities: prioritiesSchema,
  irrigation: z.enum(['rainfed', 'irrigated', 'unknown']),
}).superRefine((input, context) => {
  input.history.slice(1).forEach((event, index) => {
    if (event.startYearMonth < input.history[index].endYearMonth) context.addIssue({ code: z.ZodIssueCode.custom, path: ['history', index + 1], message: 'History events must be chronological and cannot overlap.' });
  });
});

export type Coordinates = z.infer<typeof coordinatesSchema>;
export type FieldBoundary = z.infer<typeof fieldBoundarySchema>;
export type WaterPoint = z.infer<typeof waterPointSchema>;
export type SoilProfile = z.infer<typeof soilProfileSchema>;
export type FarmerCropProfile = z.infer<typeof farmerCropProfileSchema>;
export type AnalysisInput = z.infer<typeof analysisInputSchema>;
