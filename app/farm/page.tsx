import { Suspense } from 'react';
import { FarmTimeline } from '@/components/farm/farm-timeline';

export default function FarmPage() {
  return <Suspense fallback={<p role="status" className="text-slate-300">Carregando minha fazenda…</p>}><FarmTimeline /></Suspense>;
}
