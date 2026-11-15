import { ClientOnly } from '@/components/client-only';
import { RegisterFarm } from '@/components/farm/register-farm';

export const metadata = { title: 'Cadastrar fazenda · Plantaê' };

export default function RegisterFarmPage() {
  return <ClientOnly fallback={<p className="text-slate-300" role="status">Carregando…</p>}><RegisterFarm /></ClientOnly>;
}
