import { Suspense } from 'react';
import { LoadingStatus } from '@/components/loading-status';
import { FarmTimeline } from '@/components/farm/farm-timeline';
import { ClientOnly } from '@/components/client-only';

/** The detailed crop timeline (manual form), reached from "My farm" and from the comparison/lab "edit" links. */
export default function FarmHistoryPage() {
  const loading = <LoadingStatus en="Loading farm history…" pt="Carregando histórico da fazenda…" />;
  return <Suspense fallback={loading}><ClientOnly fallback={loading}><FarmTimeline /></ClientOnly></Suspense>;
}
