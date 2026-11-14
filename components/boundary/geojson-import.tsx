'use client';

import { useId, useState } from 'react';
import { FileUp } from 'lucide-react';
import { geojsonErrorMessage, parseGeoJsonBoundary } from '@/lib/geojson';
import type { FieldBoundary } from '@/lib/schema';
import { useLocale } from '@/components/locale-provider';

type Status = { kind: 'ok' | 'error'; message: string };

export function GeoJsonImport({ onImport }: { onImport: (boundary: FieldBoundary) => void }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const id = useId();
  const [status, setStatus] = useState<Status>();
  const read = async (file: File | undefined) => {
    if (!file) return;
    const result = parseGeoJsonBoundary(await file.text());
    if (!result.ok) { setStatus({ kind: 'error', message: geojsonErrorMessage(result.code, locale) }); return; }
    onImport(result.boundary);
    setStatus({ kind: 'ok', message: en ? `Imported ${result.boundary.length} vertices from ${file.name}.` : `${result.boundary.length} vértices importados de ${file.name}.` });
  };
  return <div>
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-600 px-4 text-sm font-semibold hover:border-lime-300 focus-within:outline focus-within:outline-2 focus-within:outline-lime-300" htmlFor={id}><FileUp aria-hidden="true" size={16} />{en ? 'Import GeoJSON' : 'Importar GeoJSON'}<input accept=".geojson,.json,application/geo+json,application/json" className="sr-only" id={id} type="file" onChange={(event) => { void read(event.target.files?.[0]); event.target.value = ''; }} /></label>
    {status ? <p className={`mt-2 text-sm ${status.kind === 'error' ? 'font-medium text-amber-100' : 'text-lime-200'}`} role={status.kind === 'error' ? 'alert' : 'status'}>{status.message}</p> : null}
  </div>;
}
