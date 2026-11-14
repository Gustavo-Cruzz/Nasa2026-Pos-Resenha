'use client';

import { Cloud, CloudRain, Droplets, Gauge, Thermometer, Wind } from 'lucide-react';
import { compassPoint } from '@/lib/weather/open-meteo';
import type { LiveState } from '@/components/atlas/use-live-weather';
import { useLocale } from '@/components/locale-provider';

const num = (value: number | null, digits = 0) => value === null ? 'N/D' : value.toFixed(digits).replace('.', ',');
const clock = (iso: string) => iso.slice(11, 16);

function Pulse() { return <span aria-hidden="true" className="inline-block h-2 w-2 animate-pulse rounded-full bg-cyan-300" />; }

/** Full panel section: the conditions right now at the chosen point. */
export function LiveWeatherPanel({ state }: { state: LiveState }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const decimal = (value: number | null, digits = 0) => en ? (value === null ? 'N/D' : value.toFixed(digits)) : num(value, digits);
  if (state.kind === 'loading') return <p className="mt-5 text-sm text-slate-300" role="status">{en ? 'Loading live conditions…' : 'Buscando as condições de agora…'}</p>;
  if (state.kind === 'error') return <p className="mt-5 rounded-lg border border-amber-300/40 bg-amber-950/20 p-3 text-sm text-amber-100">{en ? 'Live weather is unavailable right now. The historical data below still applies.' : 'O tempo em tempo real está indisponível agora. O histórico abaixo continua valendo.'}</p>;
  const w = state.weather;
  const tiles = [
    { icon: Thermometer, label: en ? 'Temperature' : 'Temperatura', value: `${decimal(w.temperatureC, 1)} °C`, note: w.apparentC === null ? undefined : `${en ? 'feels like' : 'sensação'} ${decimal(w.apparentC, 1)} °C` },
    { icon: Droplets, label: en ? 'Humidity' : 'Umidade do ar', value: `${decimal(w.humidityPct)} %` },
    { icon: CloudRain, label: en ? 'Rain now' : 'Chuva agora', value: `${decimal(w.precipitationMm, 1)} mm` },
    { icon: Wind, label: en ? 'Wind' : 'Vento', value: `${decimal(w.windKmh)} km/h${w.windDirectionDeg === null ? '' : ` ${compassPoint(w.windDirectionDeg, locale)}`}`, note: w.gustsKmh === null ? undefined : `${en ? 'gusts' : 'rajadas'} ${decimal(w.gustsKmh)} km/h` },
    { icon: Gauge, label: en ? 'Pressure' : 'Pressão', value: `${decimal(w.pressureHpa)} hPa` },
    { icon: Cloud, label: en ? 'Cloud cover' : 'Nuvens', value: `${decimal(w.cloudPct)} %` },
  ];
  return <section aria-label={en ? 'Conditions right now' : 'Condições agora'} className="mt-5">
    <p className="flex items-center gap-2 text-sm font-semibold text-cyan-200"><Pulse />{en ? 'Right now' : 'Agora'}<span className="font-normal text-slate-400">· {en ? 'local time' : 'hora local'} {clock(w.time)}</span></p>
    <dl className="mt-2 grid grid-cols-2 gap-2">{tiles.map(({ icon: Icon, label, value, note }) => <div className="rounded-lg border border-cyan-300/25 bg-slate-950/60 p-3" key={label}>
      <dt className="flex items-center gap-1.5 text-xs text-slate-400"><Icon aria-hidden="true" size={13} />{label}</dt>
      <dd className="mt-0.5 text-lg font-bold text-cyan-200">{value}</dd>
      {note ? <dd className="text-[11px] text-slate-400">{note}</dd> : null}
    </div>)}</dl>
    <p className="mt-2 text-[11px] text-slate-400">{en ? 'Weather-model analysis, refreshed every 15 min · ' : 'Análise de modelo meteorológico, atualizada a cada 15 min · '}<a className="underline" href="https://open-meteo.com/" rel="noreferrer" target="_blank">Open-Meteo</a> (CC BY 4.0). {en ? 'Not NASA data and not a measurement of your farm.' : 'Não são dados da NASA nem medição da sua fazenda.'}</p>
  </section>;
}

/** Compact strip over the map (hidden on small screens, where the panel carries the full set). */
export function LiveStrip({ state }: { state: LiveState }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  if (state.kind !== 'ready') return null;
  const w = state.weather;
  const d = (value: number | null, digits = 0) => value === null ? 'N/D' : (en ? value.toFixed(digits) : value.toFixed(digits).replace('.', ','));
  return <p aria-hidden="true" className="pointer-events-auto hidden items-center gap-3 rounded-xl border border-slate-600 bg-slate-950/85 px-3.5 py-2.5 text-sm font-semibold shadow-lg backdrop-blur md:flex"><Pulse /><span className="text-cyan-200">{d(w.temperatureC, 1)} °C</span><span>{d(w.humidityPct)} %</span><span>{d(w.windKmh)} km/h</span><span>{d(w.precipitationMm, 1)} mm</span></p>;
}
