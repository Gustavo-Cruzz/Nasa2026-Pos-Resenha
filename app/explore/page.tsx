import { Suspense } from 'react';
import { LocationExplorer } from '@/components/atlas/location-explorer';
import { ExploreHeading } from '@/components/atlas/explore-heading';

export default function ExplorePage() {
  return <Suspense fallback={<p role="status" className="text-slate-300">Carregando atlas…</p>}><section><ExploreHeading /><LocationExplorer /></section></Suspense>;
}
