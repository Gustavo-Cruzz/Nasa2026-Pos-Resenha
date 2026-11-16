/**
 * "E se?" sliders of the rotation timeline. They only shift what is displayed (rain and mean temperature);
 * they are hypothetical, not a forecast, and FAO-56 ET0 is never recalculated.
 */
export type WhatIf = { tempC: number; rainPct: number };
export const NO_WHAT_IF: WhatIf = { tempC: 0, rainPct: 0 };
export const WHAT_IF_LIMITS = { temp: { min: -3, max: 3, step: 0.5 }, rain: { min: -30, max: 30, step: 5 } } as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
/** Keeps slider values inside the documented limits (also guards against NaN). */
export function normalizeWhatIf(value: Partial<WhatIf>): WhatIf {
  const temp = Number.isFinite(value.tempC) ? (value.tempC as number) : 0;
  const rain = Number.isFinite(value.rainPct) ? (value.rainPct as number) : 0;
  return { tempC: clamp(temp, WHAT_IF_LIMITS.temp.min, WHAT_IF_LIMITS.temp.max), rainPct: clamp(rain, WHAT_IF_LIMITS.rain.min, WHAT_IF_LIMITS.rain.max) };
}
export const isHypothetical = (whatIf: WhatIf) => whatIf.tempC !== 0 || whatIf.rainPct !== 0;

export const shiftRain = (rainMm: number | null, whatIf: WhatIf): number | null => rainMm === null ? null : rainMm * (1 + whatIf.rainPct / 100);
export const shiftTemp = (tempC: number | null, whatIf: WhatIf): number | null => tempC === null ? null : tempC + whatIf.tempC;
/** P − ET0 with rain scaled and ET0 left as published (not recalculated). Null when the rain needed for the shift is missing. */
export function shiftBalance(balanceMm: number | null, rainMm: number | null, whatIf: WhatIf): number | null {
  if (balanceMm === null) return null;
  if (whatIf.rainPct === 0) return balanceMm;
  return rainMm === null ? null : balanceMm + rainMm * (whatIf.rainPct / 100);
}
