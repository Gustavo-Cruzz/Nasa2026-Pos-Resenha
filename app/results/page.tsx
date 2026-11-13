import { AnalysisResults } from '@/components/results/analysis-results';

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const params = await searchParams;
  return <section><h1 className="text-3xl font-bold">Comparação de estratégias</h1><p className="mt-3 max-w-3xl text-slate-300">Compare as três hipóteses lado a lado.</p><AnalysisResults demo={params.demo === 'brasil'} /></section>;
}
