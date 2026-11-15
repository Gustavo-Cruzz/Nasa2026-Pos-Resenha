import { ClientOnly } from '@/components/client-only';
import { FutureStoriesPage } from '@/components/future-stories/future-stories-page';

export const metadata = { title: 'Explore seus futuros possíveis · Plantaê' };

export default async function FutureStoriesRoute({ searchParams }: { searchParams: Promise<{ demo?: string; cenario?: string }> }) {
  const params = await searchParams;
  const scenario = params.cenario === 'A' || params.cenario === 'B' || params.cenario === 'C' ? params.cenario : undefined;
  return <ClientOnly fallback={<p className="mt-6 text-slate-300" role="status">Carregando cenários… / Loading scenarios…</p>}><FutureStoriesPage demo={params.demo === 'ilustrativa'} initialScenario={scenario} /></ClientOnly>;
}
