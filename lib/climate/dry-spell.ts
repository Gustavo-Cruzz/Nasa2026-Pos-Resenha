import type { ClimateDay } from '@/lib/climate/nasa-power';

export const DRY_SPELL_DEFINITION = { consecutiveDays: 7, precipitationBelowMm: 1 } as const;
export type DrySpellSample = { issuedOn: string; month: number; features: number[]; event: 0 | 1 };
export type ChronologicalSplit = { train: DrySpellSample[]; validation: DrySpellSample[]; test: DrySpellSample[]; embargoDays: number };
export type CalibrationBin = { lower: number; upper: number; samples: number; meanPrediction: number | null; observedFrequency: number | null };
export type ModelEvaluation = { samples: number; brierScore: number | null; calibration: CalibrationBin[] };
export type DrySpellModelArtifact = { version: 1; createdAt: string; eventDefinition: typeof DRY_SPELL_DEFINITION; horizonDays: 7 | 15; lookbackDays: number; featureNames: string[]; coefficients: number[]; intercept: number; mean: number[]; scale: number[]; baselineByMonth: Record<string, number | null>; samples: { train: number; validation: number; test: number }; evaluation: { baseline: ModelEvaluation; model: ModelEvaluation }; validationStatus: 'validated' | 'not_validated'; limitations: string[] };

function dateDaysBetween(left: string, right: string): number { return Math.round((Date.parse(`${right.slice(0, 4)}-${right.slice(4, 6)}-${right.slice(6, 8)}T00:00:00Z`) - Date.parse(`${left.slice(0, 4)}-${left.slice(4, 6)}-${left.slice(6, 8)}T00:00:00Z`)) / 86_400_000); }
function contiguous(days: ClimateDay[]): boolean { return days.every((day, index) => index === 0 || dateDaysBetween(days[index - 1].date, day.date) === 1); }
function mean(values: number[]): number { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function sigmoid(value: number): number { return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, value)))); }

export function isDrySpell(days: Pick<ClimateDay, 'precipMm'>[]): boolean | null {
  if (days.some((day) => day.precipMm === null)) return null;
  let consecutive = 0;
  for (const day of days) { consecutive = (day.precipMm as number) < DRY_SPELL_DEFINITION.precipitationBelowMm ? consecutive + 1 : 0; if (consecutive >= DRY_SPELL_DEFINITION.consecutiveDays) return true; }
  return false;
}

/** Features only use days strictly before issuedOn; target begins on issuedOn. Missing measurements discard the sample. */
export function buildDrySpellSamples(daily: ClimateDay[], horizonDays: 7 | 15, lookbackDays = 30): DrySpellSample[] {
  const rows = [...daily].sort((a, b) => a.date.localeCompare(b.date)); const samples: DrySpellSample[] = [];
  for (let issued = lookbackDays; issued + horizonDays <= rows.length; issued += 1) {
    const history = rows.slice(issued - lookbackDays, issued); const target = rows.slice(issued, issued + horizonDays);
    if (!contiguous([...history, ...target]) || history.some((day) => day.precipMm === null || day.tmeanC === null || day.et0Mm === null)) continue;
    const event = isDrySpell(target); if (event === null) continue;
    const precip = history.map((day) => day.precipMm as number); const temperature = history.map((day) => day.tmeanC as number); const et0 = history.map((day) => day.et0Mm as number);
    const month = Number(rows[issued].date.slice(4, 6)); const radians = 2 * Math.PI * month / 12;
    samples.push({ issuedOn: rows[issued].date, month, features: [precip.reduce((sum, value) => sum + value, 0), precip.filter((value) => value < 1).length, mean(temperature), et0.reduce((sum, value) => sum + value, 0), Math.sin(radians), Math.cos(radians)], event: event ? 1 : 0 });
  }
  return samples;
}

/** Chronological split with a horizon/lookback embargo so feature/target windows never straddle partitions. */
export function chronologicalSplit(samples: DrySpellSample[], embargoDays: number): ChronologicalSplit {
  const ordered = [...samples].sort((a, b) => a.issuedOn.localeCompare(b.issuedOn)); const firstCut = Math.floor(ordered.length * 0.6); const secondCut = Math.floor(ordered.length * 0.8);
  const train = ordered.slice(0, firstCut); const validationStart = ordered.slice(firstCut).findIndex((sample) => !train.length || dateDaysBetween(train.at(-1)!.issuedOn, sample.issuedOn) > embargoDays); const validation = validationStart < 0 ? [] : ordered.slice(firstCut + validationStart, secondCut);
  const testStart = ordered.slice(secondCut).findIndex((sample) => !validation.length || dateDaysBetween(validation.at(-1)!.issuedOn, sample.issuedOn) > embargoDays); const test = testStart < 0 ? [] : ordered.slice(secondCut + testStart);
  return { train, validation, test, embargoDays };
}

export function climatologyByMonth(training: DrySpellSample[]): Record<string, number | null> { return Object.fromEntries(Array.from({ length: 12 }, (_, index) => { const month = index + 1; const values = training.filter((sample) => sample.month === month); return [String(month), values.length ? mean(values.map((sample) => sample.event)) : null]; })); }
export function predictClimatology(samples: DrySpellSample[], baseline: Record<string, number | null>): Array<number | null> { return samples.map((sample) => baseline[String(sample.month)] ?? null); }
function brier(samples: DrySpellSample[], predictions: Array<number | null>): number | null { const pairs = samples.flatMap((sample, index) => predictions[index] === null ? [] : [[sample.event, predictions[index] as number] as const]); return pairs.length ? mean(pairs.map(([event, prediction]) => (event - prediction) ** 2)) : null; }
export function calibration(samples: DrySpellSample[], predictions: Array<number | null>): CalibrationBin[] { return Array.from({ length: 5 }, (_, index) => { const lower = index / 5; const upper = (index + 1) / 5; const pairs = samples.flatMap((sample, position) => { const probability = predictions[position]; return probability !== null && probability !== undefined && (index === 4 ? probability <= upper : probability < upper) && probability >= lower ? [[sample, probability] as const] : []; }); return { lower, upper, samples: pairs.length, meanPrediction: pairs.length ? mean(pairs.map(([, probability]) => probability)) : null, observedFrequency: pairs.length ? mean(pairs.map(([sample]) => sample.event)) : null }; }); }
function evaluate(samples: DrySpellSample[], predictions: Array<number | null>): ModelEvaluation { return { samples: samples.length, brierScore: brier(samples, predictions), calibration: calibration(samples, predictions) }; }

export function trainLogisticDrySpellModel(split: ChronologicalSplit, horizonDays: 7 | 15, createdAt = new Date().toISOString()): DrySpellModelArtifact {
  const features = split.train.map((sample) => sample.features); if (!features.length) throw new Error('Insufficient chronological training samples.');
  const meanValues = features[0].map((_, index) => mean(features.map((row) => row[index]))); const scale = meanValues.map((value, index) => Math.sqrt(mean(features.map((row) => (row[index] - value) ** 2))) || 1);
  const normalized = (row: number[]) => row.map((value, index) => (value - meanValues[index]) / scale[index]); let coefficients = meanValues.map(() => 0); let intercept = 0;
  for (let epoch = 0; epoch < 600; epoch += 1) { const gradient = coefficients.map(() => 0); let interceptGradient = 0; for (const sample of split.train) { const prediction = sigmoid(intercept + normalized(sample.features).reduce((sum, value, index) => sum + value * coefficients[index], 0)); const error = prediction - sample.event; interceptGradient += error; normalized(sample.features).forEach((value, index) => { gradient[index] += error * value; }); } const rate = 0.08 / Math.sqrt(epoch + 1); coefficients = coefficients.map((value, index) => value - rate * (gradient[index] / split.train.length + 0.001 * value)); intercept -= rate * interceptGradient / split.train.length; }
  const predict = (samples: DrySpellSample[]) => samples.map((sample) => sigmoid(intercept + normalized(sample.features).reduce((sum, value, index) => sum + value * coefficients[index], 0)));
  const baseline = climatologyByMonth(split.train); const baselineEvaluation = evaluate(split.test, predictClimatology(split.test, baseline)); const modelEvaluation = evaluate(split.test, predict(split.test));
  const improves = baselineEvaluation.brierScore !== null && modelEvaluation.brierScore !== null && modelEvaluation.brierScore < baselineEvaluation.brierScore; const enoughTest = split.test.length >= 30;
  return { version: 1, createdAt, eventDefinition: DRY_SPELL_DEFINITION, horizonDays, lookbackDays: 30, featureNames: ['preceding_30d_precipitation_mm', 'preceding_30d_dry_days', 'preceding_30d_mean_temperature_c', 'preceding_30d_et0_mm', 'month_sin', 'month_cos'], coefficients, intercept, mean: meanValues, scale, baselineByMonth: baseline, samples: { train: split.train.length, validation: split.validation.length, test: split.test.length }, evaluation: { baseline: baselineEvaluation, model: modelEvaluation }, validationStatus: enoughTest && improves ? 'validated' : 'not_validated', limitations: ['Chronological NASA POWER historical experiment; not a weather forecast.', 'Root-zone wetness is excluded unless a complete compatible historical feature series is available.', ...(enoughTest ? [] : ['Test partition has fewer than 30 samples.']), ...(improves ? [] : ['Model does not beat climatology on held-out Brier score.'])] };
}
