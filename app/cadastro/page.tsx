import { LoadingStatus } from '@/components/loading-status';
import { ClientOnly } from '@/components/client-only';
import { RegisterFarm } from '@/components/farm/register-farm';

export const metadata = { title: 'Register farm · Plantaê' };

export default function RegisterFarmPage() {
  return <ClientOnly fallback={<LoadingStatus en="Loading…" pt="Carregando…" />}><RegisterFarm /></ClientOnly>;
}
