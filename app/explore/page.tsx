import { Suspense } from 'react';
import { LocationExplorer } from '@/components/atlas/location-explorer';

export default function ExplorePage() {
  return <Suspense fallback={<p role="status" className="text-slate-300">Carregando atlas…</p>}><section><h1 className="text-3xl font-bold">Atlas climático global</h1><p className="mt-3 max-w-3xl text-slate-300">Escolha qualquer ponto para explorar condições históricas NASA. Isso não é uma recomendação agronômica local.</p><LocationExplorer /></section></Suspense>;
}
