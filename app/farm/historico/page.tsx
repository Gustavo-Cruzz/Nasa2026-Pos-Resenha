import { Suspense } from 'react';
import { FarmTimeline } from '@/components/farm/farm-timeline';
import { ClientOnly } from '@/components/client-only';

/** The detailed crop timeline (manual form), reached from "Minha fazenda" and from the comparison/lab "edit" links. */
export default function FarmHistoryPage() {
  const loading = <p role="status" className="text-slate-300">Carregando histórico da fazenda… / Loading farm history…</p>;
  return <Suspense fallback={loading}><ClientOnly fallback={loading}><FarmTimeline /></ClientOnly></Suspense>;
}
