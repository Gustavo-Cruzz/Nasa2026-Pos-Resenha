import { RotationLab } from '@/components/lab/rotation-lab';
import { LoadingStatus } from '@/components/loading-status';
import { ClientOnly } from '@/components/client-only';

export default async function LabPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const params = await searchParams;
  return <ClientOnly fallback={<LoadingStatus className="mt-6 text-slate-300" en="Loading laboratory…" pt="Carregando laboratório…" />}><RotationLab savedFarm={params.saved === 'farm'} /></ClientOnly>;
}
