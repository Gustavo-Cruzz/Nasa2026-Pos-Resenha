'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from '@/components/locale-provider';

type Reading = { value?: number | boolean | null; measuredAt?: string } | null | undefined;
type Device = { id: string; name: string; location?: string; lastSeen?: string; readings?: { soilMoisture?: Reading; airTemperature?: Reading; rainWet?: Reading } };

const DEVICES_ENDPOINT = process.env.NEXT_PUBLIC_ESTACA_DEVICES_ENDPOINT ?? '';
const DEMO: Device[] = [
  { id: 'FS-001', name: 'Talhão Norte', location: 'Fazenda demonstrativa', lastSeen: '2026-11-15T12:40:00-03:00', readings: { soilMoisture: { value: 42 }, airTemperature: { value: 27.4 }, rainWet: { value: false } } },
  { id: 'FS-002', name: 'Talhão Sul', location: 'Fazenda demonstrativa', lastSeen: '2026-11-15T12:24:00-03:00', readings: { soilMoisture: { value: 58 }, airTemperature: { value: 25.1 }, rainWet: { value: true } } },
];

export function EstacaDevices() {
  const { locale } = useLocale();
  const en = locale === 'en';
  const tag = en ? 'en-US' : 'pt-BR';
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);
  const selectedRef = useRef<string | undefined>(undefined);
  selectedRef.current = selectedId;

  const fmtDate = useCallback((value?: string) => value && Number.isFinite(new Date(value).getTime()) ? new Intl.DateTimeFormat(tag, { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value)) : '', [tag]);
  const fmtNum = useCallback((n: number) => new Intl.NumberFormat(tag, { maximumFractionDigits: 1 }).format(n), [tag]);

  useEffect(() => {
    let current = true;
    setFailed(false);
    const apply = (list: Device[]) => { setDevices(list); setSelectedId((prev) => list.find((d) => d.id === prev)?.id ?? list[0]?.id); };
    if (!DEVICES_ENDPOINT) { apply(DEMO.map((d) => ({ ...d, readings: Object.fromEntries(Object.entries(d.readings ?? {}).map(([k, r]) => [k, { ...(r as object), measuredAt: d.lastSeen }])) }))); return; }
    setStatus(en ? 'Loading devices…' : 'Carregando dispositivos…');
    fetch(DEVICES_ENDPOINT, { credentials: 'include', cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error('fail'); return r.json(); }).then((result) => {
      if (!current) return;
      if (!Array.isArray(result?.devices)) throw new Error('format');
      const list = (result.devices as Device[]).filter((d) => d && typeof d.id === 'string' && typeof d.name === 'string');
      apply(list);
      setStatus(list.length ? (en ? 'Latest readings available · Brasília time' : 'Últimas leituras disponíveis · Horário de Brasília') : (en ? 'No devices registered on this account.' : 'Nenhum dispositivo cadastrado nesta conta.'));
    }).catch(() => { if (current) { setFailed(true); setStatus(en ? 'Could not load devices. Check your connection or platform session.' : 'Falha ao carregar os dispositivos. Confira sua conexão ou a sessão da plataforma.'); } });
    return () => { current = false; };
  }, [en]);

  const device = devices.find((d) => d.id === selectedId);
  const demoNotice = en ? 'Demo mode · Fictitious devices and measurements.' : 'Modo demonstração · Dispositivos e medições fictícios.';
  const last = fmtDate(device?.lastSeen);
  const metric = (key: 'soilMoisture' | 'airTemperature' | 'rainWet', pos: string, label: string, unit: string, line: string) => {
    const reading = device?.readings?.[key];
    const v = reading?.value;
    const text = key === 'rainWet' ? (typeof v === 'boolean' ? (v ? (en ? 'Wet' : 'Molhado') : (en ? 'Dry' : 'Seco')) : '—') : (typeof v === 'number' && Number.isFinite(v) ? fmtNum(v) + unit : '—');
    const time = text === '—' ? (en ? 'No reading' : 'Sem leitura') : fmtDate(reading?.measuredAt ?? undefined) || (en ? 'Reading time unavailable' : 'Horário da leitura indisponível');
    return <div className={`absolute max-w-[40%] rounded-lg border border-[#91a486] bg-[#f2f6e8] px-2 py-1.5 shadow-lg sm:min-w-[130px] sm:px-3 sm:py-2 ${pos} after:absolute after:top-1/2 after:h-px after:w-4 after:bg-[#536e50] sm:after:w-9 ${line}`}><span className="block text-[0.65rem] sm:text-xs">{label}</span><strong className="block text-base sm:text-xl">{text}</strong><small className="block text-[0.6rem] text-[#4d6550] sm:text-[0.66rem]">{time}</small></div>;
  };

  return <section id="dispositivos" aria-labelledby="estaca-devices-title" className="scroll-mt-24 border-t border-slate-800 py-12">
    <p className="text-xs font-bold tracking-[0.16em] text-lime-300"><span aria-hidden="true" className="mr-2 inline-block h-[7px] w-[7px] rounded-full bg-lime-300" />{en ? 'FIELD PANEL' : 'PAINEL DE CAMPO'}</p>
    <h2 id="estaca-devices-title" className="mt-3 text-3xl font-bold tracking-tight text-cream sm:text-4xl">{en ? 'Devices' : 'Dispositivos'}</h2>
    <p role="status" className={`mt-2 rounded-lg border px-3 py-2 text-sm ${DEVICES_ENDPOINT && !failed ? 'border-transparent text-slate-300' : 'border-amber-300/40 bg-amber-300/10 text-amber-100'}`}>{DEVICES_ENDPOINT ? status : demoNotice}</p>
    <div className="mt-6 grid gap-4 md:grid-cols-[17rem_minmax(0,1fr)]">
      <aside aria-label={en ? 'Registered devices' : 'Dispositivos cadastrados'} className="self-start rounded-xl border border-slate-700 bg-slate-900/70 p-4">
        <h3 className="mb-3 text-base font-bold text-cream">{en ? 'My stakes' : 'Minhas estacas'}</h3>
        <div className="grid gap-2">{devices.map((d) => <button key={d.id} type="button" aria-pressed={d.id === selectedId} onClick={() => setSelectedId(d.id)} className={`rounded-lg border bg-slate-950/60 p-3 text-left text-slate-100 ${d.id === selectedId ? 'border-lime-300' : 'border-slate-700'}`}><b className="block">{d.name}</b><span className="block text-xs text-slate-400">{d.location ? `${d.id} · ${d.location}` : d.id}</span></button>)}</div>
      </aside>
      {device ? <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 sm:p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold tracking-[0.16em] text-lime-300">{device.id}</p><h3 className="text-2xl font-bold text-cream sm:text-3xl">{device.name}</h3></div><p className="text-sm text-slate-400">{last ? `${en ? 'Last reading' : 'Último registro'} · ${last}` : (en ? 'Last reading unavailable' : 'Último registro indisponível')}</p></div>
        <figure className="relative m-0 h-[420px] overflow-hidden rounded-lg bg-[#dce5cc] text-[#203526] sm:h-[500px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/estaca/interna.png" alt={en ? 'Internal view of the 3D model with indicators on the three sensors' : 'Vista interna do modelo 3D com indicadores nos três sensores'} className="absolute inset-0 h-full w-full object-contain mix-blend-multiply" />
          {metric('airTemperature', 'left-[2%] top-[23%] sm:left-[8%]', en ? 'Temperature' : 'Temperatura', ' °C', 'after:left-full')}
          {metric('soilMoisture', 'left-[2%] top-[74%] sm:left-[10%]', en ? 'Soil moisture' : 'Umidade do solo', '%', 'after:left-full')}
          {metric('rainWet', 'right-[2%] top-[12%] sm:right-[5%]', en ? 'Rain sensor' : 'Sensor de chuva', '', 'after:right-full')}
        </figure>
      </div> : null}
    </div>
  </section>;
}
