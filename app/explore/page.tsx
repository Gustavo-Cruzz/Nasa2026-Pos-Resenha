import { Suspense } from 'react';
import { ExploreWizard } from '@/components/wizard/explore-wizard';

export default function ExplorePage() {
  return <Suspense fallback={<p role="status" className="text-slate-300">Carregando exploração…</p>}><ExploreWizard /></Suspense>;
}
