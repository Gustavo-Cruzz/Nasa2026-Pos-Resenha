'use client';

import type { SoilObservation } from '@/lib/schema';
import { useLocale } from '@/components/locale-provider';

export const soilKindLabel = (kind: SoilObservation['kinds'][number], en: boolean) => ({ waterlogging: en ? 'standing water / waterlogging' : 'água empoçada / encharcamento', compaction: en ? 'hard or compacted soil' : 'solo duro ou compactado', erosion: en ? 'erosion (gullies, washed soil)' : 'erosão (sulcos, solo carregado)', dry_cracked: en ? 'very dry or cracked soil' : 'solo muito seco ou rachado', salt_crust: en ? 'whitish or salty crust' : 'crosta esbranquiçada ou salina', discoloration: en ? 'stains or odd color' : 'manchas ou cor estranha', other: en ? 'other' : 'outro' }[kind]);

/** What the producer reported about the soil, repeated back as declared; no diagnosis and no calculation uses it. */
export function SoilObservationNote({ observation }: { observation: SoilObservation }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  return <aside aria-label={en ? 'Soil observation by the producer' : 'Observação do produtor sobre o solo'} className="mt-5 rounded-xl border border-amber-300/50 bg-amber-950/30 p-4 text-sm">
    <p className="font-bold">{en ? 'You reported something unusual in the soil' : 'Você relatou algo estranho no solo'}</p>
    <p className="mt-1">{observation.kinds.map((kind) => soilKindLabel(kind, en)).join(' · ')}{observation.note ? ` — “${observation.note}”` : ''}</p>
    <p className="mt-2 text-xs text-slate-300">{en ? 'Recorded as you told it. The app does not diagnose soil and uses this in no calculation. Take it to a local agronomist or technician, ideally with soil samples.' : 'Registrado como você contou. O app não diagnostica o solo e não usa isso em nenhum cálculo. Leve ao agrônomo ou técnico local, de preferência com amostras de solo.'}</p>
  </aside>;
}
