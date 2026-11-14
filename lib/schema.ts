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
  sandPct: z.number().min(0).max(100).optional(),
  siltPct: z.number().min(0).max(100).optional(),
  clayPct: z.number().min(0).max(100).optional(),
  organicCarbonGKg: z.number().min(0).optional(),
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

/** What the producer says they noticed in the soil. It is context only: the app does not diagnose the soil and uses it in no calculation. */
export const soilObservationKinds = ['waterlogging', 'compaction', 'erosion', 'dry_cracked', 'salt_crust', 'discoloration', 'other'] as const;
export const soilObservationSchema = z.object({ kinds: z.array(z.enum(soilObservationKinds)).min(1).max(7), note: z.string().trim().max(200).optional() });

export const analysisInputSchema = z.object({
  location: coordinatesSchema,
  fieldBoundary: fieldBoundarySchema.optional(),
  waterPoint: waterPointSchema.optional(),
  soilObservation: soilObservationSchema.optional(),
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
export type SoilObservation = z.infer<typeof soilObservationSchema>;
export type SoilProfile = z.infer<typeof soilProfileSchema>;
export type AnalysisInput = z.infer<typeof analysisInputSchema>;
