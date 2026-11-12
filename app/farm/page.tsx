import { Suspense } from 'react';
import { ExploreWizard } from '@/components/wizard/explore-wizard';

export default function FarmPage() {
  return <Suspense fallback={<p role="status" className="text-slate-300">Carregando minha fazenda…</p>}><ExploreWizard /></Suspense>;
}
