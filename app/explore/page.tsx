import { Suspense } from 'react';
import { LoadingStatus } from '@/components/loading-status';
import { LocationExplorer } from '@/components/atlas/location-explorer';
import { ExploreHeading } from '@/components/atlas/explore-heading';

export default function ExplorePage() {
  return <Suspense fallback={<LoadingStatus en="Loading atlas…" pt="Carregando atlas…" />}><section><ExploreHeading /><LocationExplorer /></section></Suspense>;
}
