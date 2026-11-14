import { Suspense } from 'react';
import { FarmTimeline } from '@/components/farm/farm-timeline';
import { ClientOnly } from '@/components/client-only';

export default function FarmPage() {
  const loading = <p role="status" className="text-slate-300">Carregando minha fazenda… / Loading my farm…</p>;
  return <Suspense fallback={loading}><ClientOnly fallback={loading}><FarmTimeline /></ClientOnly></Suspense>;
}
