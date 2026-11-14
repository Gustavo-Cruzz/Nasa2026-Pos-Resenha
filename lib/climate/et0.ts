/**
 * FAO-56 Penman–Monteith reference evapotranspiration (ET0), daily.
 * Climate context only: it is NOT crop water use (ETc), an irrigation need or a forecast.
 * Simplifications, all documented in docs/METHOD.md: G = 0, actual vapour pressure from mean RH (FAO-56 eq. 19),
 * albedo 0.23, elevation inferred from surface pressure.
 */
const GSC = 0.082; // MJ m-2 min-1
const SIGMA = 4.903e-9; // MJ K-4 m-2 day-1

export type Et0Input = { tmaxC: number; tminC: number; eaKPa: number; windMps2m: number; solarMjM2Day: number; latitudeDeg: number; dayOfYear: number; pressureKPa: number };

const saturationVapourPressure = (tC: number) => 0.6108 * Math.exp(17.27 * tC / (tC + 237.3));

/** Elevation (m) implied by the FAO-56 pressure/elevation relation (eq. 7, inverted). */
export function elevationFromPressure(pressureKPa: number): number {
  return (293 - 293 * (pressureKPa / 101.3) ** (1 / 5.26)) / 0.0065;
}

export function extraterrestrialRadiation(latitudeDeg: number, dayOfYear: number): number {
  const phi = latitudeDeg * Math.PI / 180;
  const dr = 1 + 0.033 * Math.cos(2 * Math.PI * dayOfYear / 365);
  const delta = 0.409 * Math.sin(2 * Math.PI * dayOfYear / 365 - 1.39);
  const x = Math.min(1, Math.max(-1, -Math.tan(phi) * Math.tan(delta)));
  const omegaS = Math.acos(x);
  return (24 * 60 / Math.PI) * GSC * dr * (omegaS * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(omegaS));
}

export function et0FromVapourPressure(input: Et0Input): number | null {
  const { tmaxC, tminC, eaKPa, windMps2m: u2, solarMjM2Day: rs, latitudeDeg, dayOfYear, pressureKPa } = input;
  const values = [tmaxC, tminC, eaKPa, u2, rs, latitudeDeg, dayOfYear, pressureKPa];
  if (values.some((value) => !Number.isFinite(value)) || tmaxC < tminC || pressureKPa <= 0 || u2 < 0 || rs < 0) return null;
  const tmean = (tmaxC + tminC) / 2;
  const es = (saturationVapourPressure(tmaxC) + saturationVapourPressure(tminC)) / 2;
  const slope = 4098 * saturationVapourPressure(tmean) / (tmean + 237.3) ** 2;
  const gamma = 0.000665 * pressureKPa;
  const ra = extraterrestrialRadiation(latitudeDeg, dayOfYear);
  const rso = (0.75 + 2e-5 * elevationFromPressure(pressureKPa)) * ra;
  const ratio = rso > 0 ? Math.min(1, rs / rso) : 0;
  const rns = (1 - 0.23) * rs;
  const rnl = SIGMA * ((tmaxC + 273.16) ** 4 + (tminC + 273.16) ** 4) / 2 * (0.34 - 0.14 * Math.sqrt(Math.max(0, eaKPa))) * (1.35 * ratio - 0.35);
  const rn = rns - rnl;
  const et0 = (0.408 * slope * rn + gamma * 900 / (tmean + 273) * u2 * (es - eaKPa)) / (slope + gamma * (1 + 0.34 * u2));
  return Number.isFinite(et0) ? Math.max(0, Number(et0.toFixed(3))) : null;
}

/** Daily ET0 from the NASA POWER daily fields; any missing/implausible input gives null, never zero. */
export function et0Daily(input: { tmaxC: number | null; tminC: number | null; rhPct: number | null; windMps2m: number | null; solarMjM2Day: number | null; pressureKPa: number | null | undefined; latitudeDeg: number; dayOfYear: number }): number | null {
  const { tmaxC, tminC, rhPct, windMps2m, solarMjM2Day, pressureKPa } = input;
  if (tmaxC === null || tminC === null || rhPct === null || windMps2m === null || solarMjM2Day === null || pressureKPa === null || pressureKPa === undefined) return null;
  const ea = (rhPct / 100) * (saturationVapourPressure(tmaxC) + saturationVapourPressure(tminC)) / 2;
  return et0FromVapourPressure({ tmaxC, tminC, eaKPa: ea, windMps2m, solarMjM2Day, latitudeDeg: input.latitudeDeg, dayOfYear: input.dayOfYear, pressureKPa });
}

export function dayOfYear(yyyymmdd: string): number {
  const year = Number(yyyymmdd.slice(0, 4)); const month = Number(yyyymmdd.slice(4, 6)); const day = Number(yyyymmdd.slice(6, 8));
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86_400_000);
}
