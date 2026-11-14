import { RotationLab } from '@/components/lab/rotation-lab';
import { ClientOnly } from '@/components/client-only';

export default async function LabPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const params = await searchParams;
  return <ClientOnly fallback={<p className="mt-6 text-slate-300" role="status">Carregando laboratório… / Loading laboratory…</p>}><RotationLab savedFarm={params.saved === 'farm'} /></ClientOnly>;
}
